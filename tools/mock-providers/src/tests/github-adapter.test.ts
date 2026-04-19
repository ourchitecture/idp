// GitHub adapter integration tests.
// These tests start the GitHub mock provider, fetch provider-shaped data via
// real HTTP calls, normalize through the real GitHub adapter, and compare the
// output against the canonical YAML fixture for each scenario.
//
// Test layers validated here: Layer 2 (mock provider integration).
// Layer 1 (fixture contract) is in stacks/*/bff/src/flow/github/adapter.test.ts.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test, before, after } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { createGitHubMockServer } from "../github/server.js";
import type { GitHubScenario } from "../github/scenarios.js";

// Resolve repo root relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");

// Resolve adapter from the Node.js BFF
const adapterPath = path.join(
  repoRoot,
  "stacks/nodejs/react-fastify/rest/bff/src/flow/github/adapter.ts",
);

// Dynamic import with tsx support
const { buildGitHubProviderInput } = (await import(adapterPath)) as {
  buildGitHubProviderInput: (source: unknown) => unknown;
};

const fixtureDir = path.join(repoRoot, "schema/fixtures/provider-adapter-input");

type ProviderAdapterInput = {
  repository: Record<string, unknown>;
  changes: unknown[];
  actors: unknown[];
  review_states: unknown[];
  validation_runs: unknown[];
  merge_events: unknown[];
  evidence_states: unknown[];
  ownership_hints: unknown[];
};

function loadFixture(fixtureId: string): ProviderAdapterInput {
  const content = fs.readFileSync(path.join(fixtureDir, `${fixtureId}.yaml`), "utf8");
  const parsed = YAML.parse(content) as Partial<ProviderAdapterInput>;
  return {
    repository: (parsed.repository as Record<string, unknown>) ?? {},
    changes: parsed.changes ?? [],
    actors: parsed.actors ?? [],
    review_states: parsed.review_states ?? [],
    validation_runs: parsed.validation_runs ?? [],
    merge_events: parsed.merge_events ?? [],
    evidence_states: parsed.evidence_states ?? [],
    ownership_hints: parsed.ownership_hints ?? [],
  };
}

function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => pruneUndefined(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = pruneUndefined(v);
    }
    return out as T;
  }
  return value;
}

function sortedOutput(input: ProviderAdapterInput): ProviderAdapterInput {
  return pruneUndefined({
    ...input,
    changes: [...input.changes].sort((a, b) =>
      String((a as { provider_id: string }).provider_id).localeCompare(
        String((b as { provider_id: string }).provider_id),
      ),
    ),
    actors: [...input.actors].sort((a, b) =>
      String((a as { provider_id: string }).provider_id).localeCompare(
        String((b as { provider_id: string }).provider_id),
      ),
    ),
    review_states: [...input.review_states].sort((a, b) =>
      String((a as { change_id: string }).change_id).localeCompare(
        String((b as { change_id: string }).change_id),
      ),
    ),
    validation_runs: [...input.validation_runs].sort((a, b) => {
      const ar = a as { change_id: string; scope: string; run_at?: string };
      const br = b as { change_id: string; scope: string; run_at?: string };
      if (ar.change_id !== br.change_id) return ar.change_id.localeCompare(br.change_id);
      if (ar.scope !== br.scope) return ar.scope.localeCompare(br.scope);
      return (ar.run_at ?? "").localeCompare(br.run_at ?? "");
    }),
    merge_events: [...input.merge_events].sort((a, b) =>
      String((a as { change_id: string }).change_id).localeCompare(
        String((b as { change_id: string }).change_id),
      ),
    ),
    evidence_states: [...(input.evidence_states ?? [])].sort((a, b) =>
      String((a as { change_id: string }).change_id).localeCompare(
        String((b as { change_id: string }).change_id),
      ),
    ),
    ownership_hints: [...input.ownership_hints].sort((a, b) => {
      const ha = a as { path_pattern?: string; source?: string };
      const hb = b as { path_pattern?: string; source?: string };
      if ((ha.path_pattern ?? "") !== (hb.path_pattern ?? ""))
        return (ha.path_pattern ?? "").localeCompare(hb.path_pattern ?? "");
      return (ha.source ?? "").localeCompare(hb.source ?? "");
    }),
  });
}

// --- HTTP helpers ---

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status} ${url}`);
  return res.status === 404 ? null : res.json();
}

async function buildSourceFromMock(
  baseUrl: string,
  scenario: GitHubScenario,
  fetchedAt: string,
): Promise<unknown> {
  const { full_name } = scenario.repository;
  const [owner, repo] = full_name.split("/");

  const repository = (await fetchJson(`${baseUrl}/repos/${owner}/${repo}`)) as Record<
    string,
    unknown
  >;

  const pullRequests = (await fetchJson(
    `${baseUrl}/repos/${owner}/${repo}/pulls?state=all`,
  )) as Array<{ number: number; head: { sha?: string }; merge_commit_sha?: string | null; merged_at?: string | null }>;

  const reviewsByPullNumber: Record<number, unknown[]> = {};
  const checkRunsByPullNumber: Record<number, unknown[]> = {};

  for (const pr of pullRequests) {
    const reviews = (await fetchJson(
      `${baseUrl}/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
    )) as unknown[];
    reviewsByPullNumber[pr.number] = reviews ?? [];

    if (pr.head.sha) {
      const checkData = (await fetchJson(
        `${baseUrl}/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`,
      )) as { check_runs?: unknown[] } | null;
      checkRunsByPullNumber[pr.number] = checkData?.check_runs ?? [];
    }
  }

  // Collect workflow runs per branch from PR head branches + default branch
  const workflowRunsByBranch: Record<string, unknown[]> = {};
  const branches = new Set<string>();
  for (const pr of pullRequests) {
    const headRef = (pr as unknown as { head: { ref: string } }).head.ref;
    if (headRef) branches.add(headRef);
    if (pr.merge_commit_sha) branches.add(scenario.repository.default_branch);
  }
  for (const branch of branches) {
    const data = (await fetchJson(
      `${baseUrl}/repos/${owner}/${repo}/actions/runs?head_branch=${encodeURIComponent(branch)}`,
    )) as { workflow_runs?: unknown[] } | null;
    if (data?.workflow_runs && data.workflow_runs.length > 0) {
      workflowRunsByBranch[branch] = data.workflow_runs;
    }
  }

  // Collect commit statuses for PR head SHAs and merge commit SHAs
  const statusesByHeadSha: Record<string, unknown[]> = {};
  for (const pr of pullRequests) {
    if (pr.head.sha) {
      const statuses = (await fetchJson(
        `${baseUrl}/repos/${owner}/${repo}/commits/${pr.head.sha}/statuses`,
      )) as unknown[] | null;
      if (statuses && (statuses as unknown[]).length > 0) {
        statusesByHeadSha[pr.head.sha] = statuses as unknown[];
      }
    }
    if (pr.merge_commit_sha) {
      const statuses = (await fetchJson(
        `${baseUrl}/repos/${owner}/${repo}/commits/${pr.merge_commit_sha}/statuses`,
      )) as unknown[] | null;
      if (statuses && (statuses as unknown[]).length > 0) {
        statusesByHeadSha[pr.merge_commit_sha] = statuses as unknown[];
      }
    }
  }

  // Branch protection for default branch
  const bpRaw = (await fetchJson(
    `${baseUrl}/repos/${owner}/${repo}/branches/${scenario.repository.default_branch}/protection`,
  )) as Record<string, unknown> | null;
  let branchProtection: Record<string, unknown> | undefined;
  if (bpRaw) {
    const rprr = bpRaw["required_pull_request_reviews"] as
      | { required_approving_review_count?: number }
      | undefined;
    const rr = bpRaw["required_reviewers"] as Array<{ type: string; name: string; id?: string }> | undefined;
    branchProtection = {
      required_approving_review_count: rprr?.required_approving_review_count,
      required_reviewers: rr,
    };
  }

  // CODEOWNERS
  const coRaw = (await fetchJson(
    `${baseUrl}/repos/${owner}/${repo}/contents/CODEOWNERS`,
  )) as { content?: string; encoding?: string } | null;
  let codeownersText: string | undefined;
  if (coRaw?.content && coRaw.encoding === "base64") {
    codeownersText = Buffer.from(coRaw.content, "base64").toString("utf8");
  }

  // Issues referenced in PR bodies
  const issueNumbersSet = new Set<number>();
  for (const pr of pullRequests) {
    const body = (pr as unknown as { body?: string | null }).body ?? "";
    const pattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      issueNumbersSet.add(parseInt(match[1], 10));
    }
  }
  const issues: unknown[] = [];
  for (const num of issueNumbersSet) {
    const issue = await fetchJson(`${baseUrl}/repos/${owner}/${repo}/issues/${num}`);
    if (issue) issues.push(issue);
  }

  return {
    repository,
    pull_requests: pullRequests,
    reviews_by_pull_number: reviewsByPullNumber,
    check_runs_by_pull_number: checkRunsByPullNumber,
    workflow_runs_by_branch: workflowRunsByBranch,
    statuses_by_head_sha: statusesByHeadSha,
    branch_protection: branchProtection,
    codeowners_text: codeownersText,
    issues,
    fetched_at: fetchedAt,
  };
}

// --- Test suite ---

const server = createGitHubMockServer();
let baseUrl: string;

before(async () => {
  await server.listen(0); // random port
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await server.close();
});

test("GitHub mock health endpoint returns ok", async () => {
  const res = await fetch(`${baseUrl}/_mock/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { status: string };
  assert.equal(body.status, "ok");
});

test("GitHub mock scenario switching works", async () => {
  const switchRes = await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "trunk-integration-failure" }),
  });
  assert.equal(switchRes.status, 200);
  const body = (await switchRes.json()) as { scenario: string };
  assert.equal(body.scenario, "trunk-integration-failure");

  const resetRes = await fetch(`${baseUrl}/_mock/reset`, { method: "POST" });
  assert.equal(resetRes.status, 200);
});

test("GitHub mock returns 404 for unknown scenario", async () => {
  const res = await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "nonexistent-scenario" }),
  });
  assert.equal(res.status, 404);
});

test("blocked-on-review: normalized output matches canonical fixture", async () => {
  await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "blocked-on-review" }),
  });

  const scenario = server.getActiveScenario();
  const source = await buildSourceFromMock(baseUrl, scenario, "2026-04-01T10:00:00Z");
  const result = buildGitHubProviderInput(source) as ProviderAdapterInput;
  const expected = loadFixture("blocked-on-review-github");

  assert.deepStrictEqual(sortedOutput(result), sortedOutput(expected));
});

test("trunk-integration-failure: normalized output matches canonical fixture", async () => {
  await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "trunk-integration-failure" }),
  });

  const scenario = server.getActiveScenario();
  const source = await buildSourceFromMock(baseUrl, scenario, "2026-04-02T12:00:00Z");
  const result = buildGitHubProviderInput(source) as ProviderAdapterInput;
  const expected = loadFixture("trunk-integration-failed-github");

  assert.deepStrictEqual(sortedOutput(result), sortedOutput(expected));
});

test("changes-requested: normalized output matches canonical fixture", async () => {
  await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "changes-requested" }),
  });

  const scenario = server.getActiveScenario();
  const source = await buildSourceFromMock(baseUrl, scenario, "2026-04-03T12:05:00Z");
  const result = buildGitHubProviderInput(source) as ProviderAdapterInput;
  const expected = loadFixture("changes-requested-github");

  assert.deepStrictEqual(sortedOutput(result), sortedOutput(expected));
});

test("partial-data: normalized output matches canonical fixture", async () => {
  await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "partial-data" }),
  });

  const scenario = server.getActiveScenario();
  const source = await buildSourceFromMock(baseUrl, scenario, "2026-04-04T09:30:00Z");
  const result = buildGitHubProviderInput(source) as ProviderAdapterInput;
  const expected = loadFixture("partial-data-github");

  assert.deepStrictEqual(sortedOutput(result), sortedOutput(expected));
});

test("GitHub mock returns 404 for unknown repository", async () => {
  const res = await fetch(`${baseUrl}/repos/unknown-org/no-such-repo`);
  assert.equal(res.status, 404);
});
