import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { findAgentTask, listAgentTasks } from "./agentTaskCatalog";
import type { AgentTask } from "./types";

function findRepoRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, "schema"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Repository root not found from agent task catalog tests");
    }

    current = parent;
  }
}

const repoRoot = findRepoRoot(__dirname);
const failedValidationFixturePath = path.join(
  repoRoot,
  "schema",
  "fixtures",
  "agent-tasks",
  "impl-validation-failed-goose-001.agent-task.json",
);

test("loads the impl-validation-failed goose task fixture", () => {
  const raw = fs.readFileSync(failedValidationFixturePath, "utf8");
  const fixture = JSON.parse(raw) as AgentTask;

  assert.equal(fixture.task_id, "goose-001");
  assert.equal(fixture.state, "impl-validation-failed");
  assert.equal(fixture.heartbeat.state, "impl-validation-failed");
  assert.equal(fixture.model, null);
  assert.equal(fixture.tokens, null);
  assert.equal(fixture.cost, null);
});

test("maps failed validation state to a concrete human action", () => {
  const task = findAgentTask("goose-001");

  assert.ok(task, "expected goose-001 fixture to load into the catalog");
  assert.equal(task.state, "impl-validation-failed");
  assert.match(task.what_to_do, /Open the worktree/);
  assert.match(task.what_to_do, /fix the type annotation/);
  assert.match(task.what_to_do, /skip_to=implement/);
});

test("filters agent tasks by impl-validation-failed state", () => {
  const tasks = listAgentTasks({ state: "impl-validation-failed" });
  const task = tasks.find((candidate) => candidate.task_id === "goose-001");

  assert.ok(task, "expected state filter to include goose-001");
  assert.equal(task.state, "impl-validation-failed");
  assert.ok(task.what_to_do.length > 0);
});
