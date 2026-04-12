import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import YAML from "yaml";
import type { ProviderAdapterInput } from "../types";
import { buildGitHubProviderInput } from "./adapter";
import { blockedOnReviewSource, trunkIntegrationFailureSource } from "./fixtures";

function findRepoRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, "schema"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Repository root not found from adapter tests");
    }
    current = parent;
  }
}

const repoRoot = findRepoRoot(__dirname);
const fixtureDir = path.join(repoRoot, "schema", "fixtures", "provider-adapter-input");

function loadNormalizedFixture(filename: string): ProviderAdapterInput {
  const filePath = path.join(fixtureDir, filename);
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.parse(content) as Partial<ProviderAdapterInput> & Record<string, unknown>;
  return {
    repository: parsed.repository ?? { provider: "github", provider_id: "", full_name: "", default_branch: "", fetched_at: "" },
    changes: parsed.changes ?? [],
    actors: parsed.actors ?? [],
    review_states: parsed.review_states ?? [],
    validation_runs: parsed.validation_runs ?? [],
    merge_events: parsed.merge_events ?? [],
    ownership_hints: parsed.ownership_hints ?? [],
  };
}

function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item)) as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = pruneUndefined(val);
    }
    return result as T;
  }
  return value;
}

function normalizeOutput(input: ProviderAdapterInput): ProviderAdapterInput {
  const normalized = pruneUndefined<ProviderAdapterInput>({
    ...input,
    changes: [...input.changes].sort((a, b) => a.provider_id.localeCompare(b.provider_id)),
    actors: [...input.actors].sort((a, b) => a.provider_id.localeCompare(b.provider_id)),
    review_states: [...input.review_states].sort((a, b) => a.change_id.localeCompare(b.change_id)),
    validation_runs: [...input.validation_runs].sort((a, b) => {
      if (a.change_id !== b.change_id) {
        return a.change_id.localeCompare(b.change_id);
      }
      if (a.scope !== b.scope) {
        return a.scope.localeCompare(b.scope);
      }
      return (a.run_at ?? "").localeCompare(b.run_at ?? "");
    }),
    merge_events: [...input.merge_events].sort((a, b) => a.change_id.localeCompare(b.change_id)),
    ownership_hints: [...input.ownership_hints].sort((a, b) => {
        const pathA = a.path_pattern ?? "";
        const pathB = b.path_pattern ?? "";
        if (pathA !== pathB) {
          return pathA.localeCompare(pathB);
        }
        return (a.source ?? "").localeCompare(b.source ?? "");
      }),
  });

  return normalized;
}

test("normalizes GitHub data for blocked-on-review scenario", () => {
  const result = buildGitHubProviderInput(blockedOnReviewSource);
  const expected = loadNormalizedFixture("blocked-on-review-github.yaml");

  assert.deepStrictEqual(normalizeOutput(result), normalizeOutput(expected));
});

test("normalizes GitHub data with trunk integration failure after merge", () => {
  const result = buildGitHubProviderInput(trunkIntegrationFailureSource);
  const expected = loadNormalizedFixture("trunk-integration-failed-github.yaml");

  assert.deepStrictEqual(normalizeOutput(result), normalizeOutput(expected));
});
