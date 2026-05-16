// Layer 2 contract profile for the agent-work capability.
//
// Validates GET /api/agent-work/tasks (list) and
// GET /api/agent-work/tasks/:taskId (detail) on any BFF that declares
// capabilities.agentWork.enabled = true.
//
// The fixture-backed MVP guarantees at least one task (goose-001) is
// always present. Tests assert on shape and the fixture's known state
// without hard-coding fragile field values where possible.

import { assert, parseJsonOrThrow } from "../assertions";
import { request } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

const KNOWN_FIXTURE_TASK_ID = "goose-001";
const KNOWN_FIXTURE_STATE = "impl-validation-failed";

function isAgentWorkEnabled(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.agentWork?.enabled === true;
}

export function createAgentWorkTests(context: ContractContext): TestCase[] {
  if (!isAgentWorkEnabled(context)) {
    return [];
  }

  const { bffBaseUrl } = context;

  return [
    {
      name: "agent-work:list endpoint returns expected shape",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/agent-work/tasks", bffBaseUrl));

        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(contentType.includes("application/json"), "agent-work list must return application/json");

        const payload = parseJsonOrThrow(response.body) as Record<string, unknown>;
        assert(typeof payload.generatedAt === "string", "Response must include generatedAt string");
        assert(typeof payload.total === "number", "Response must include numeric total");
        assert(Array.isArray(payload.tasks), "Response must include tasks array");
        assert(
          (payload.total as number) >= 1,
          "At least one fixture task must be present (goose-001)",
        );
      },
    },
    {
      name: "agent-work:each task in list has required insight fields",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/agent-work/tasks", bffBaseUrl));
        const payload = parseJsonOrThrow(response.body) as Record<string, unknown>;
        const tasks = payload.tasks as Record<string, unknown>[];

        for (const task of tasks) {
          const id = task.task_id ?? "(unknown)";
          assert(typeof task.task_id === "string", `task ${id}: task_id must be a string`);
          assert(typeof task.state === "string", `task ${id}: state must be a string`);
          assert(typeof task.slug === "string", `task ${id}: slug must be a string`);
          assert(typeof task.observation === "string", `task ${id}: observation must be a string`);
          assert(typeof task.why_it_matters === "string", `task ${id}: why_it_matters must be a string`);
          assert(typeof task.what_to_do === "string", `task ${id}: what_to_do must be a string`);
          assert(task.observation.length > 0, `task ${id}: observation must not be empty`);
          assert(task.why_it_matters.length > 0, `task ${id}: why_it_matters must not be empty`);
          assert(task.what_to_do.length > 0, `task ${id}: what_to_do must not be empty`);
        }
      },
    },
    {
      name: "agent-work:detail endpoint returns full task for known fixture",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(
          new URL(`/api/agent-work/tasks/${KNOWN_FIXTURE_TASK_ID}`, bffBaseUrl),
        );

        assert(response.status === 200, `Expected 200 for known fixture, got ${response.status}`);

        const payload = parseJsonOrThrow(response.body) as Record<string, unknown>;
        assert(typeof payload.generatedAt === "string", "Detail response must include generatedAt");
        assert(typeof payload.task === "object" && payload.task !== null, "Detail response must include task object");

        const task = payload.task as Record<string, unknown>;
        assert(task.task_id === KNOWN_FIXTURE_TASK_ID, `task_id must be '${KNOWN_FIXTURE_TASK_ID}'`);
        assert(task.state === KNOWN_FIXTURE_STATE, `state must be '${KNOWN_FIXTURE_STATE}' for fixture goose-001`);
        assert(typeof task.worktree_path === "string", "task must include worktree_path");
        assert(typeof task.heartbeat === "object", "task must include heartbeat object");
      },
    },
    {
      name: "agent-work:null model/tokens/cost are passed through as null",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(
          new URL(`/api/agent-work/tasks/${KNOWN_FIXTURE_TASK_ID}`, bffBaseUrl),
        );
        const payload = parseJsonOrThrow(response.body) as Record<string, unknown>;
        const task = payload.task as Record<string, unknown>;

        assert(task.model === null, "model must be null when unavailable — must not be synthesized");
        assert(task.tokens === null, "tokens must be null when unavailable — must not be synthesized");
        assert(task.cost === null, "cost must be null when unavailable — must not be synthesized");
      },
    },
    {
      name: "agent-work:detail endpoint returns 404 for unknown task id",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(
          new URL("/api/agent-work/tasks/does-not-exist-abc123", bffBaseUrl),
        );

        assert(response.status === 404, `Expected 404 for unknown task, got ${response.status}`);

        const payload = parseJsonOrThrow(response.body) as Record<string, unknown>;
        assert(typeof payload.error === "string", "404 response must include error field");
      },
    },
    {
      name: "agent-work:list state filter returns only matching tasks",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(
          new URL(`/api/agent-work/tasks?state=${KNOWN_FIXTURE_STATE}`, bffBaseUrl),
        );

        assert(response.status === 200, `Expected 200, got ${response.status}`);

        const payload = parseJsonOrThrow(response.body) as Record<string, unknown>;
        const tasks = payload.tasks as Record<string, unknown>[];

        for (const task of tasks) {
          assert(
            typeof task.state === "string" && task.state.includes(KNOWN_FIXTURE_STATE),
            `All filtered tasks must match state filter '${KNOWN_FIXTURE_STATE}', got '${String(task.state)}'`,
          );
        }
      },
    },
  ];
}
