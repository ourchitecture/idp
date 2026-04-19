// GitLab adapter integration tests.
// These tests start the GitLab mock provider, fetch provider-shaped data via
// real HTTP calls, normalize through the real GitLab adapter, and compare the
// output against the canonical YAML fixture for each scenario.
//
// Test layers validated here: Layer 2 (mock provider integration).
// Layer 1 (fixture contract) is in stacks/*/bff/src/flow/gitlab/adapter.test.ts.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test, before, after } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { createGitLabMockServer } from "../gitlab/server.js";
import type { GitLabScenario } from "../gitlab/scenarios.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");

const adapterPath = path.join(
  repoRoot,
  "stacks/nodejs/react-fastify/rest/bff/src/flow/gitlab/adapter.ts",
);

const { buildGitLabProviderInput } = (await import(adapterPath)) as {
  buildGitLabProviderInput: (source: unknown) => unknown;
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

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function buildSourceFromMock(
  baseUrl: string,
  scenario: GitLabScenario,
  fetchedAt: string,
): Promise<unknown> {
  const projectId = encodeURIComponent(scenario.project.path_with_namespace);
  const apiBase = `${baseUrl}/api/v4/projects/${projectId}`;

  const project = (await fetchJson(apiBase)) as Record<string, unknown>;

  const mergeRequests = (await fetchJson(`${apiBase}/merge_requests`)) as Array<{
    iid: number | string;
    sha?: string;
    merge_commit_sha?: string | null;
    merged_at?: string | null;
    target_branch: string;
    source_branch: string;
    state: string;
  }>;

  const approvalsByMergeIid: Record<string, unknown> = {};
  const pipelinesByMergeIid: Record<string, unknown[]> = {};
  const commitStatusesBySha: Record<string, unknown[]> = {};

  for (const mr of mergeRequests) {
    const iid = String(mr.iid);

    const approval = await fetchJson(`${apiBase}/merge_requests/${iid}/approvals`);
    if (approval) approvalsByMergeIid[iid] = approval;

    const pipelines = (await fetchJson(`${apiBase}/merge_requests/${iid}/pipelines`)) as unknown[];
    if (pipelines && pipelines.length > 0) pipelinesByMergeIid[iid] = pipelines;

    if (mr.sha) {
      const statuses = (await fetchJson(
        `${apiBase}/repository/commits/${mr.sha}/statuses`,
      )) as unknown[];
      if (statuses && statuses.length > 0) commitStatusesBySha[mr.sha] = statuses;
    }
  }

  // Trunk pipelines for the default branch
  const trunkPipelinesByBranch: Record<string, unknown[]> = {};
  const defaultBranch = (project["default_branch"] as string) ?? scenario.project.default_branch;
  const trunkPipelines = (await fetchJson(
    `${apiBase}/pipelines?ref=${encodeURIComponent(defaultBranch)}`,
  )) as unknown[];
  if (trunkPipelines && trunkPipelines.length > 0) {
    trunkPipelinesByBranch[defaultBranch] = trunkPipelines;
  }

  // CODEOWNERS
  const codeownersText = await fetchText(`${apiBase}/repository/files/CODEOWNERS/raw`);

  // Issues referenced in MR descriptions
  const issueIidsSet = new Set<string>();
  for (const mr of mergeRequests) {
    const body = (mr as unknown as { description?: string | null }).description ?? "";
    const pattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      issueIidsSet.add(match[1]);
    }
  }
  const issues: unknown[] = [];
  for (const iid of issueIidsSet) {
    const issue = await fetchJson(`${apiBase}/issues/${iid}`);
    if (issue) issues.push(issue);
  }

  return {
    project,
    merge_requests: mergeRequests,
    approvals_by_merge_iid: approvalsByMergeIid,
    pipelines_by_merge_iid: pipelinesByMergeIid,
    trunk_pipelines_by_branch: trunkPipelinesByBranch,
    commit_statuses_by_sha: commitStatusesBySha,
    issues,
    codeowners_text: codeownersText ?? undefined,
    group_owners: scenario.group_owners,
    base_url: scenario.base_url,
    self_managed: scenario.self_managed,
    add_trunk_validation_placeholder: false,
    fetched_at: fetchedAt,
  };
}

// --- Test suite ---

const server = createGitLabMockServer();
let baseUrl: string;

before(async () => {
  await server.listen(0); // random port
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await server.close();
});

test("GitLab mock health endpoint returns ok", async () => {
  const res = await fetch(`${baseUrl}/_mock/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { status: string };
  assert.equal(body.status, "ok");
});

test("GitLab mock scenario switching works", async () => {
  const switchRes = await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "trunk-integration-failure" }),
  });
  assert.equal(switchRes.status, 200);

  const resetRes = await fetch(`${baseUrl}/_mock/reset`, { method: "POST" });
  assert.equal(resetRes.status, 200);
});

test("blocked-on-review: normalized output matches canonical fixture", async () => {
  await fetch(`${baseUrl}/_mock/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "blocked-on-review" }),
  });

  const scenario = server.getActiveScenario();
  const source = await buildSourceFromMock(baseUrl, scenario, "2026-04-01T10:00:00Z");
  const result = buildGitLabProviderInput(source) as ProviderAdapterInput;
  const expected = loadFixture("blocked-on-review-gitlab");

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
  const result = buildGitLabProviderInput(source) as ProviderAdapterInput;
  const expected = loadFixture("trunk-integration-failed-gitlab");

  assert.deepStrictEqual(sortedOutput(result), sortedOutput(expected));
});

test("GitLab mock returns 404 for unknown project", async () => {
  const res = await fetch(`${baseUrl}/api/v4/projects/no-such-project`);
  assert.equal(res.status, 404);
});
