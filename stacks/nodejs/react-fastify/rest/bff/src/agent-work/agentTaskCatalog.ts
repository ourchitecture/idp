import fs from "node:fs";
import path from "node:path";
import type {
  AgentTask,
  AgentTaskFilters,
  AgentTaskState,
  AgentTaskSummary,
} from "./types";

const VALID_STATES: ReadonlySet<AgentTaskState> = new Set<AgentTaskState>([
  "worktree-claimed",
  "planning",
  "planning-review",
  "implementing",
  "impl-validation-failed",
  "impl-validated",
  "validating",
  "ship",
  "complete-local",
  "failed",
  "blocked",
]);

// __dirname is 7 segments deep below the repo root:
//   <repo>/stacks/nodejs/react-fastify/rest/bff/{src,dist}/agent-work
// Mirrors the depth used by flow/insightsCatalog.ts.
const REPO_ROOT_FROM_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
);

const FIXTURE_DIR =
  process.env.OUR_IDP_AGENT_TASK_FIXTURE_DIR ??
  path.join(REPO_ROOT_FROM_DIR, "schema/fixtures/agent-tasks");

const LIVE_TASK_DIR =
  process.env.OUR_IDP_AGENT_TASK_DIR ??
  path.join(REPO_ROOT_FROM_DIR, ".agents/worktrees");

function isAgentTaskState(value: unknown): value is AgentTaskState {
  return typeof value === "string" && VALID_STATES.has(value as AgentTaskState);
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAgentTask(raw: unknown): AgentTask | null {
  if (raw === null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const task_id = typeof obj.task_id === "string" ? obj.task_id : null;
  const slug = typeof obj.slug === "string" ? obj.slug : null;
  const worktree_path =
    typeof obj.worktree_path === "string" ? obj.worktree_path : null;
  const observation =
    typeof obj.observation === "string" ? obj.observation : null;
  const why_it_matters =
    typeof obj.why_it_matters === "string" ? obj.why_it_matters : null;
  const what_to_do =
    typeof obj.what_to_do === "string" ? obj.what_to_do : null;

  if (
    !task_id ||
    !slug ||
    !worktree_path ||
    !observation ||
    !why_it_matters ||
    !what_to_do
  ) {
    return null;
  }

  if (!isAgentTaskState(obj.state)) return null;

  const heartbeatRaw = obj.heartbeat;
  if (heartbeatRaw === null || typeof heartbeatRaw !== "object") return null;
  const heartbeatObj = heartbeatRaw as Record<string, unknown>;
  if (!isAgentTaskState(heartbeatObj.state)) return null;
  const heartbeatUpdatedAt =
    typeof heartbeatObj.updated_at === "string" ? heartbeatObj.updated_at : null;
  if (!heartbeatUpdatedAt) return null;

  return {
    task_id,
    issue_number: asNumberOrNull(obj.issue_number),
    state: obj.state,
    slug,
    worktree_path,
    heartbeat: {
      state: heartbeatObj.state,
      updated_at: heartbeatUpdatedAt,
    },
    model: asStringOrNull(obj.model),
    tokens: asNumberOrNull(obj.tokens),
    cost: asNumberOrNull(obj.cost),
    observation,
    why_it_matters,
    what_to_do,
  };
}

function loadJsonFile(filePath: string): AgentTask | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return parseAgentTask(parsed);
  } catch {
    return null;
  }
}

function readDirSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function buildCatalog(): AgentTask[] {
  const byTaskId = new Map<string, AgentTask>();

  // Fixtures first.
  for (const file of readDirSafe(FIXTURE_DIR)) {
    if (!file.endsWith(".agent-task.json")) continue;
    const task = loadJsonFile(path.join(FIXTURE_DIR, file));
    if (task) {
      byTaskId.set(task.task_id, task);
    }
  }

  // Live worktree snapshots shadow fixtures on task_id collision.
  for (const entry of readDirSafe(LIVE_TASK_DIR)) {
    const candidate = path.join(LIVE_TASK_DIR, entry, ".agent-task.json");
    try {
      if (!fs.statSync(candidate).isFile()) continue;
    } catch {
      continue;
    }
    const task = loadJsonFile(candidate);
    if (task) {
      byTaskId.set(task.task_id, task);
    }
  }

  return Array.from(byTaskId.values());
}

const CATALOG = buildCatalog();

function matchesFilter(value: string | undefined, filter?: string): boolean {
  if (!filter) return true;
  if (!value) return false;
  return value.toLowerCase().includes(filter.toLowerCase());
}

function toSummary(task: AgentTask): AgentTaskSummary {
  return {
    task_id: task.task_id,
    issue_number: task.issue_number,
    state: task.state,
    slug: task.slug,
    observation: task.observation,
    why_it_matters: task.why_it_matters,
    what_to_do: task.what_to_do,
    heartbeat: task.heartbeat,
    model: task.model,
    tokens: task.tokens,
    cost: task.cost,
  };
}

export function listAgentTasks(filters: AgentTaskFilters): AgentTaskSummary[] {
  return CATALOG.filter((task) => {
    if (!matchesFilter(task.state, filters.state)) return false;
    if (!matchesFilter(task.slug, filters.slug)) return false;
    return true;
  }).map(toSummary);
}

export function findAgentTask(taskId: string): AgentTask | null {
  return CATALOG.find((task) => task.task_id === taskId) ?? null;
}
