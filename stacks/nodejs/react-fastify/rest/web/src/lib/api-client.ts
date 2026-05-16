type PortalStatus = "ok" | "degraded";
type ServiceStatus = "healthy" | "degraded";
type HealthStatus = "pass" | "fail" | "warn";

export type PortalSummary = {
  generatedAt: string;
  status: PortalStatus;
  metrics: {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
  };
  freshness: {
    maxAgeSeconds: number;
  };
  components: Array<{
    id: string;
    label: string;
    kind: "service";
    status: ServiceStatus;
    latencyMs: number;
    observedAt: string;
  }>;
};

export type BffHealth = {
  status: HealthStatus;
  serviceId: "idp-bff";
  description: string;
  checks?: Record<
    string,
    Array<{
      componentType: string;
      status: HealthStatus;
      time: string;
    }>
  >;
};

const REQUEST_TIMEOUT_MS = 8_000;

const rawBaseUrl =
  typeof import.meta.env.VITE_BFF_BASE_URL === "string"
    ? import.meta.env.VITE_BFF_BASE_URL.trim()
    : "";
const apiBaseUrl = rawBaseUrl.replace(/\/$/, "");

function buildApiUrl(path: string): string {
  return apiBaseUrl.length > 0 ? `${apiBaseUrl}${path}` : path;
}

function createAbortController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { controller, timeoutId } = createAbortController(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/health+json, application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (
      contentType !== null &&
      !contentType.includes("application/json") &&
      !contentType.includes("application/health+json")
    ) {
      throw new Error(`Expected JSON response, received '${contentType}'`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    if (error instanceof Error) {
      throw new Error(`Request to '${path}' failed: ${error.message}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function assertHealthPayload(payload: BffHealth): BffHealth {
  if (payload.serviceId !== "idp-bff") {
    throw new Error("Invalid health payload: expected serviceId to be 'idp-bff'");
  }

  return payload;
}

export function fetchPortalSummary(): Promise<PortalSummary> {
  return fetchJson<PortalSummary>("/api/portal/summary");
}

export function fetchBffHealth(): Promise<BffHealth> {
  return fetchJson<BffHealth>("/health").then(assertHealthPayload);
}

export type AgentTaskState =
  | "worktree-claimed"
  | "planning"
  | "planning-review"
  | "implementing"
  | "impl-validation-failed"
  | "impl-validated"
  | "validating"
  | "ship"
  | "complete-local"
  | "failed"
  | "blocked";

export type AgentTaskHeartbeat = {
  state: AgentTaskState;
  updated_at: string;
};

export type AgentTask = {
  task_id: string;
  issue_number: number | null;
  state: AgentTaskState;
  slug: string;
  worktree_path: string;
  heartbeat: AgentTaskHeartbeat;
  model: string | null;
  tokens: number | null;
  cost: number | null;
  observation: string;
  why_it_matters: string;
  what_to_do: string;
};

export type AgentTaskList = {
  generatedAt: string;
  filters: Record<string, string>;
  total: number;
  tasks: AgentTask[];
};

export type AgentTaskDetail = {
  generatedAt: string;
  task: AgentTask;
};

export type AgentTaskFilters = {
  state?: string;
  slug?: string;
};

function buildAgentTaskQuery(filters?: AgentTaskFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.slug) params.set("slug", filters.slug);
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export function fetchAgentTasks(
  filters?: AgentTaskFilters,
): Promise<AgentTaskList> {
  return fetchJson<AgentTaskList>(
    `/api/agent-work/tasks${buildAgentTaskQuery(filters)}`,
  );
}

export function fetchAgentTask(taskId: string): Promise<AgentTaskDetail> {
  return fetchJson<AgentTaskDetail>(
    `/api/agent-work/tasks/${encodeURIComponent(taskId)}`,
  );
}
