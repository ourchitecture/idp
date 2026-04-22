// Layer 2 contract profile for the flow insight capability.
//
// This profile is derived from tests/features/flow-insights.feature. When the
// feature file and this profile disagree, the feature file is authoritative
// (ADR-0009).
//
// The inference API endpoint is POST /api/flow/insights on the BFF base URL.
// Stacks declare capabilities.flowInsights.enabled = true only once they expose it.
//
// Cross-stack equivalence rules enforced by this profile:
//   Required to be equivalent across stacks:
//     - signal identity (same id value for the same inferred condition)
//     - severity / priority intent
//     - confidence behavior for the same inputs
//     - recommended-action intent (category must match; exact wording may vary)
//   Not required to be identical:
//     - exact wording of explanation or recommendedNextAction
//     - ordering of signals when multiple are returned
//     - incidental metadata fields not part of the contract
//   Allowed differences must be documented in docs/content/testing/profiles/flow-insights.md

import * as fs from "fs";
import * as path from "path";
// js-yaml is available in node_modules but has no bundled type declarations;
// use require with a narrow inline type to avoid adding a dev dependency.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const yaml = require("js-yaml") as { load: (input: string) => unknown };
import { post, request } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

const FIXTURE_DIR = path.resolve(__dirname, "../../../schema/fixtures/provider-adapter-input");

const FLOW_INSIGHTS_ENDPOINT = "/api/flow/insights";

type FlowSignal = {
  id: string;
  title: string;
  severity?: string;
  confidence?: string;
  explanation?: string;
  recommendedNextAction?: string;
  relatedEntities?: unknown[];
};

type FlowInsightsResponse = {
  signals: FlowSignal[];
};

type FlowInsightSummary = {
  insightId: string;
  signalId: string;
  title: string;
  severity?: string;
  confidence?: string;
  provider: string;
  repository: {
    full_name: string;
  };
  scope?: {
    service?: string;
    team?: string;
    stage?: string;
  };
  services: string[];
  teams: string[];
  actors: string[];
  summary: string;
  observedAt?: string;
};

type FlowInsightsListResponse = {
  generatedAt: string;
  filters: Record<string, string>;
  total: number;
  insights: FlowInsightSummary[];
};

type FlowInsightDetail = FlowInsightSummary & {
  explanation?: string;
  recommendedNextAction?: string;
  relatedEntities?: unknown[];
  source?: {
    fixtureId?: string;
    scenario?: string;
    description?: string;
  };
};

type FlowInsightDetailResponse = {
  generatedAt: string;
  insight: FlowInsightDetail;
};

function isFlowInsightsEnabled(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.flowInsights?.enabled === true;
}

function loadFixture(fixtureId: string): unknown {
  const filePath = path.join(FIXTURE_DIR, `${fixtureId}.yaml`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw);
}

async function postFixture(
  bffBaseUrl: URL,
  fixture: unknown,
): Promise<FlowInsightsResponse> {
  const response = await post(new URL(FLOW_INSIGHTS_ENDPOINT, bffBaseUrl), fixture);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `POST ${FLOW_INSIGHTS_ENDPOINT} returned ${response.status}: ${response.body}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    throw new Error(
      `POST ${FLOW_INSIGHTS_ENDPOINT} response is not valid JSON: ${response.body}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as FlowInsightsResponse).signals)
  ) {
    throw new Error(
      `POST ${FLOW_INSIGHTS_ENDPOINT} response must contain a 'signals' array`,
    );
  }

  return parsed as FlowInsightsResponse;
}

async function getInsights(
  bffBaseUrl: URL,
  params?: Record<string, string>,
): Promise<FlowInsightsListResponse> {
  const url = new URL(FLOW_INSIGHTS_ENDPOINT, bffBaseUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  const response = await request(url);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `GET ${url.pathname} returned ${response.status}: ${response.body}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    throw new Error(
      `GET ${url.pathname} response is not valid JSON: ${response.body}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as FlowInsightsListResponse).insights)
  ) {
    throw new Error(
      `GET ${url.pathname} response must contain an 'insights' array`,
    );
  }

  return parsed as FlowInsightsListResponse;
}

async function getInsightDetail(
  bffBaseUrl: URL,
  insightId: string,
  audience?: string,
): Promise<FlowInsightDetail> {
  const url = new URL(`${FLOW_INSIGHTS_ENDPOINT}/${insightId}`, bffBaseUrl);
  if (audience) {
    url.searchParams.set("audience", audience);
  }

  const response = await request(url);
  if (response.status === 404) {
    throw new Error(`GET ${url.pathname} returned 404 (insight not found)`);
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GET ${url.pathname} returned ${response.status}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    throw new Error(
      `GET ${url.pathname} response is not valid JSON: ${response.body}`,
    );
  }

  const insight = (parsed as FlowInsightDetailResponse).insight;
  if (!insight || typeof insight !== "object") {
    throw new Error(`GET ${url.pathname} response must contain 'insight'`);
  }

  return insight as FlowInsightDetail;
}

function assertSignalPresent(
  signals: FlowSignal[],
  expectedId: string,
  context: string,
): FlowSignal {
  const match = signals.find((s) => s.id === expectedId);
  if (!match) {
    const found = signals.map((s) => s.id).join(", ") || "(none)";
    throw new Error(
      `${context}: expected signal '${expectedId}' not found. Got: ${found}`,
    );
  }
  return match;
}

function assertNonEmpty(value: string | undefined, field: string, context: string): void {
  if (!value || value.trim() === "") {
    throw new Error(`${context}: '${field}' must be a non-empty string`);
  }
}

function assertConfidenceReduced(
  signal: FlowSignal,
  context: string,
): void {
  const reduced = ["medium", "low"];
  if (!signal.confidence || !reduced.includes(signal.confidence)) {
    throw new Error(
      `${context}: confidence must be 'medium' or 'low' for partial-data inputs; got '${signal.confidence}'`,
    );
  }
}

export function createFlowInsightsTests(context: ContractContext): TestCase[] {
  if (!isFlowInsightsEnabled(context)) {
    return [];
  }

  const { bffBaseUrl } = context;

  return [
    // ── Endpoint gate ──────────────────────────────────────────
    {
      name: "flow-insights:provisional endpoint is reachable",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const probeUrl = new URL(FLOW_INSIGHTS_ENDPOINT, bffBaseUrl);
        // Send a minimal empty-body POST; we only care that the endpoint
        // exists (non-404/405), not that it produces a valid signal result.
        const response = await post(probeUrl, {});
        if (response.status === 404 || response.status === 405) {
          throw new Error(
            `Flow insights endpoint ${FLOW_INSIGHTS_ENDPOINT} returned ${response.status}. ` +
            `Stacks must expose the endpoint before enabling capabilities.flowInsights.`,
          );
        }
      },
    },

    // ── HTTP surface checks ────────────────────────────────────────────────

    {
      name: "flow-insights:list endpoint returns provider-neutral summaries",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const list = await getInsights(bffBaseUrl);
        if (list.insights.length === 0) {
          throw new Error("GET /api/flow/insights returned no insights");
        }

        for (const summary of list.insights) {
          if (!summary.insightId || !summary.signalId) {
            throw new Error("Each insight must have insightId and signalId");
          }
          if (!summary.title || summary.title.trim() === "") {
            throw new Error(`Insight ${summary.insightId} must include a title`);
          }
          if (!summary.summary || summary.summary.trim() === "") {
            throw new Error(`Insight ${summary.insightId} must include a summary`);
          }
          if (!summary.repository?.full_name) {
            throw new Error(`Insight ${summary.insightId} must include repository.full_name`);
          }
        }
      },
    },
    {
      name: "flow-insights:list filters by provider and service",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const githubList = await getInsights(bffBaseUrl, { provider: "github" });
        if (githubList.insights.length === 0) {
          throw new Error("Expected GitHub insights when filtering by provider=github");
        }
        if (githubList.insights.some((item) => item.provider !== "github")) {
          throw new Error("provider=github filter must only return GitHub insights");
        }

        const serviceFiltered = await getInsights(bffBaseUrl, { service: "payments" });
        if (serviceFiltered.insights.length === 0) {
          throw new Error("Expected at least one payments-related insight");
        }
        if (
          serviceFiltered.insights.some(
            (item) => !item.services.some((service) => service.toLowerCase().includes("payments")),
          )
        ) {
          throw new Error("service filter must constrain insights to matching services");
        }
      },
    },
    {
      name: "flow-insights:GitHub and GitLab blocked-on-review shapes stay aligned",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const githubList = await getInsights(bffBaseUrl, { provider: "github" });
        const gitlabList = await getInsights(bffBaseUrl, { provider: "gitlab" });

        const ghBlocked = githubList.insights.find((item) => item.signalId === "blocked_on_review");
        const glBlocked = gitlabList.insights.find((item) => item.signalId === "blocked_on_review");

        if (!ghBlocked || !glBlocked) {
          throw new Error("Blocked on review must be present for both providers");
        }

        if (ghBlocked.severity !== glBlocked.severity) {
          throw new Error(
            `Severity must align across providers: github=${ghBlocked.severity} gitlab=${glBlocked.severity}`,
          );
        }

        if (ghBlocked.confidence !== glBlocked.confidence) {
          throw new Error(
            `Confidence must align across providers: github=${ghBlocked.confidence} gitlab=${glBlocked.confidence}`,
          );
        }
      },
    },
    {
      name: "flow-insights:detail endpoint returns explanations and role-aware summary",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const list = await getInsights(bffBaseUrl, { provider: "github" });
        const candidate = list.insights[0];
        if (!candidate) {
          throw new Error("No insights available to fetch details");
        }

        const detail = await getInsightDetail(bffBaseUrl, candidate.insightId, "owner");
        assertNonEmpty(detail.explanation, "explanation", candidate.insightId);
        assertNonEmpty(
          detail.recommendedNextAction,
          "recommendedNextAction",
          candidate.insightId,
        );
        if (!detail.summary.toLowerCase().includes("owner")) {
          throw new Error("Role-aware summary must reflect the requested audience");
        }
      },
    },

    // ── Core provider-neutral scenarios ─────────────────────────────────────

    {
      name: "flow-insights:blocked-on-review signal is inferred from GitHub fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("blocked-on-review-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "blocked_on_review", "blocked-on-review-github");
        assertNonEmpty(signal.explanation, "explanation", "blocked-on-review-github");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "blocked-on-review-github");
      },
    },
    {
      name: "flow-insights:blocked-on-review signal is inferred from GitLab fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("blocked-on-review-gitlab");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "blocked_on_review", "blocked-on-review-gitlab");
        assertNonEmpty(signal.explanation, "explanation", "blocked-on-review-gitlab");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "blocked-on-review-gitlab");
      },
    },
    {
      name: "flow-insights:blocked-on-review equivalence across GitHub and GitLab",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const ghFixture = loadFixture("blocked-on-review-github");
        const glFixture = loadFixture("blocked-on-review-gitlab");
        const [ghResult, glResult] = await Promise.all([
          postFixture(bffBaseUrl, ghFixture),
          postFixture(bffBaseUrl, glFixture),
        ]);
        const ghSignal = assertSignalPresent(ghResult.signals, "blocked_on_review", "github");
        const glSignal = assertSignalPresent(glResult.signals, "blocked_on_review", "gitlab");

        // Signal identity must be equal.
        if (ghSignal.id !== glSignal.id) {
          throw new Error(
            `Cross-provider: signal id must match — github '${ghSignal.id}' vs gitlab '${glSignal.id}'`,
          );
        }

        // Severity intent must be equivalent.
        if (ghSignal.severity !== glSignal.severity) {
          throw new Error(
            `Cross-provider: severity must be equivalent — github '${ghSignal.severity}' vs gitlab '${glSignal.severity}'`,
          );
        }

        // Confidence tier must be equivalent for equivalent inputs.
        if (ghSignal.confidence !== glSignal.confidence) {
          throw new Error(
            `Cross-provider: confidence must be equivalent — github '${ghSignal.confidence}' vs gitlab '${glSignal.confidence}'`,
          );
        }
      },
    },
    {
      name: "flow-insights:trunk-integration-failure signal is inferred from GitHub fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("trunk-integration-failed-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(
          result.signals,
          "trunk_integration_failure",
          "trunk-integration-failed-github",
        );
        assertNonEmpty(signal.explanation, "explanation", "trunk-integration-failed-github");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "trunk-integration-failed-github");
      },
    },
    {
      name: "flow-insights:trunk-integration-failure signal is inferred from GitLab fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("trunk-integration-failed-gitlab");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(
          result.signals,
          "trunk_integration_failure",
          "trunk-integration-failed-gitlab",
        );
        assertNonEmpty(signal.explanation, "explanation", "trunk-integration-failed-gitlab");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "trunk-integration-failed-gitlab");
      },
    },
    {
      name: "flow-insights:unclear-ownership signal is inferred from GitHub fixture (no owners)",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("unclear-ownership-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "unclear_ownership", "unclear-ownership-github");
        assertNonEmpty(signal.explanation, "explanation", "unclear-ownership-github");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "unclear-ownership-github");
      },
    },
    {
      name: "flow-insights:unclear-ownership signal is inferred from ambiguous GitHub fixture (two teams)",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("unclear-ownership-ambiguous-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "unclear_ownership", "unclear-ownership-ambiguous-github");
        assertNonEmpty(signal.explanation, "explanation", "unclear-ownership-ambiguous-github");
      },
    },
    {
      name: "flow-insights:unclear-ownership signal is inferred from GitLab fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("unclear-ownership-gitlab");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "unclear_ownership", "unclear-ownership-gitlab");
        assertNonEmpty(signal.explanation, "explanation", "unclear-ownership-gitlab");
      },
    },
    {
      name: "flow-insights:waiting-on-evidence signal is inferred from GitHub fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("waiting-on-evidence-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "waiting_on_evidence", "waiting-on-evidence-github");
        assertNonEmpty(signal.explanation, "explanation", "waiting-on-evidence-github");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "waiting-on-evidence-github");
      },
    },
    {
      name: "flow-insights:waiting-on-evidence signal is inferred from GitLab fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("waiting-on-evidence-gitlab");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "waiting_on_evidence", "waiting-on-evidence-gitlab");
        assertNonEmpty(signal.explanation, "explanation", "waiting-on-evidence-gitlab");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "waiting-on-evidence-gitlab");
      },
    },
    {
      name: "flow-insights:aging-implementation signal is inferred from GitHub fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("aging-implementation-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(
          result.signals,
          "aging_implementation",
          "aging-implementation-github",
        );
        assertNonEmpty(signal.explanation, "explanation", "aging-implementation-github");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "aging-implementation-github");
      },
    },
    {
      name: "flow-insights:aging-implementation signal is inferred from GitLab fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("aging-implementation-gitlab");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(
          result.signals,
          "aging_implementation",
          "aging-implementation-gitlab",
        );
        assertNonEmpty(signal.explanation, "explanation", "aging-implementation-gitlab");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "aging-implementation-gitlab");
      },
    },
    {
      name: "flow-insights:risk-aggregation signal is inferred from GitHub fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("risk-aggregation-github");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "risk_aggregation", "risk-aggregation-github");
        assertNonEmpty(signal.explanation, "explanation", "risk-aggregation-github");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "risk-aggregation-github");
      },
    },
    {
      name: "flow-insights:risk-aggregation signal is inferred from GitLab fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("risk-aggregation-gitlab");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(result.signals, "risk_aggregation", "risk-aggregation-gitlab");
        assertNonEmpty(signal.explanation, "explanation", "risk-aggregation-gitlab");
        assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", "risk-aggregation-gitlab");
      },
    },

    // ── Edge cases ───────────────────────────────────────────────────────────

    {
      name: "flow-insights:partial data reduces signal confidence",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("blocked-on-review-gitlab-self-managed");
        const result = await postFixture(bffBaseUrl, fixture);
        const signal = assertSignalPresent(
          result.signals,
          "blocked_on_review",
          "blocked-on-review-gitlab-self-managed",
        );
        assertConfidenceReduced(signal, "blocked-on-review-gitlab-self-managed");
      },
    },
    {
      name: "flow-insights:partial-data fixture produces reduced confidence signal",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("partial-data-github");
        const result = await postFixture(bffBaseUrl, fixture);
        if (result.signals.length === 0) {
          throw new Error("partial-data-github: expected at least one signal to be inferred");
        }
        for (const signal of result.signals) {
          assertConfidenceReduced(signal, `partial-data-github:${signal.id}`);
        }
      },
    },

    // ── Signal shape invariants ──────────────────────────────────────────────

    {
      name: "flow-insights:every inferred signal carries required fields",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const fixture = loadFixture("blocked-on-review-github");
        const result = await postFixture(bffBaseUrl, fixture);
        for (const signal of result.signals) {
          if (!signal.id || signal.id.trim() === "") {
            throw new Error("Each signal must have a non-empty 'id' field");
          }
          if (!signal.title || signal.title.trim() === "") {
            throw new Error(`Signal '${signal.id}': 'title' must be non-empty`);
          }
          assertNonEmpty(signal.explanation, "explanation", signal.id);
          assertNonEmpty(signal.recommendedNextAction, "recommendedNextAction", signal.id);
        }
      },
    },
  ];
}
