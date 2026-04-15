// Layer 2 contract profile for the flow insight capability.
//
// This profile is derived from tests/features/flow-insights.feature. When the
// feature file and this profile disagree, the feature file is authoritative
// (ADR-0009).
//
// NOTE: The inference API endpoint assumed here is provisional.
// This profile assumes POST /api/flow/insights on the BFF base URL.
// The exact endpoint shape must be confirmed when issue #225 (inference engine)
// and issue #226 (HTTP API surface) land. Stacks should declare
// capabilities.flowInsights.enabled = true only once they expose the endpoint.
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
import { post } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

const FIXTURE_DIR = path.resolve(__dirname, "../../../schema/fixtures/provider-adapter-input");

const PROVISIONAL_ENDPOINT = "/api/flow/insights";

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
  const response = await post(new URL(PROVISIONAL_ENDPOINT, bffBaseUrl), fixture);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `POST ${PROVISIONAL_ENDPOINT} returned ${response.status}: ${response.body}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    throw new Error(
      `POST ${PROVISIONAL_ENDPOINT} response is not valid JSON: ${response.body}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as FlowInsightsResponse).signals)
  ) {
    throw new Error(
      `POST ${PROVISIONAL_ENDPOINT} response must contain a 'signals' array`,
    );
  }

  return parsed as FlowInsightsResponse;
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
    // ── Provisional endpoint gate ──────────────────────────────────────────
    // The flow insights API endpoint is provisional until issues #225 and
    // #226 land. This test runs first and fails clearly so that stacks
    // declaring the capability before the endpoint exists get an explicit
    // error instead of silent test failures downstream.
    {
      name: "flow-insights:provisional endpoint is reachable",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const probeUrl = new URL(PROVISIONAL_ENDPOINT, bffBaseUrl);
        // Send a minimal empty-body POST; we only care that the endpoint
        // exists (non-404/405), not that it produces a valid signal result.
        const response = await post(probeUrl, {});
        if (response.status === 404 || response.status === 405) {
          throw new Error(
            `Provisional endpoint ${PROVISIONAL_ENDPOINT} returned ${response.status}. ` +
            `This profile requires the endpoint to exist (see issues #225 and #226). ` +
            `Stacks must not declare capabilities.flowInsights.enabled = true until ` +
            `the endpoint is available.`,
          );
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
