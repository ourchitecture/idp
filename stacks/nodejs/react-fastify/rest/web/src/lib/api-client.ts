type PortalStatus = "ok" | "degraded";
type ServiceStatus = "healthy" | "degraded";

export type PortalSummary = {
  generatedAt: string;
  status: PortalStatus;
  metrics: {
    servicesHealthy: number;
    activePlugins: number;
    queuedIntents: number;
  };
  services: Array<{
    id: string;
    label: string;
    status: ServiceStatus;
    latencyMs: number;
  }>;
};

export type BffHealth = {
  status: PortalStatus;
  service: "idp-bff";
  timestamp: string;
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
        Accept: "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType !== null && !contentType.includes("application/json")) {
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
  if (payload.service !== "idp-bff") {
    throw new Error("Invalid health payload: expected service to be 'idp-bff'");
  }

  return payload;
}

export function fetchPortalSummary(): Promise<PortalSummary> {
  return fetchJson<PortalSummary>("/api/portal/summary");
}

export function fetchBffHealth(): Promise<BffHealth> {
  return fetchJson<BffHealth>("/api/health").then(assertHealthPayload);
}
