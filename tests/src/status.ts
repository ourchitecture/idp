import { assert } from "./assertions";

export type PortalSummary = {
  generatedAt: string;
  status: "ok" | "degraded";
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
    status: "healthy" | "degraded";
    latencyMs: number;
    observedAt: string;
  }>;
};

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function assertNonNegativeInteger(value: unknown, message: string): asserts value is number {
  assert(typeof value === "number" && Number.isInteger(value) && value >= 0, message);
}

function assertNonNegativeNumber(value: unknown, message: string): asserts value is number {
  assert(typeof value === "number" && Number.isFinite(value) && value >= 0, message);
}

export function parsePortalSummaryOrThrow(value: unknown): PortalSummary {
  assert(typeof value === "object" && value !== null, "Portal summary must be a JSON object");

  const candidate = value as Record<string, unknown>;
  assert(candidate.status === "ok" || candidate.status === "degraded", "Portal summary status must be 'ok' or 'degraded'");
  assert(isIsoTimestamp(candidate.generatedAt), "Portal summary generatedAt must be an ISO-8601 timestamp");

  const metrics = candidate.metrics as Record<string, unknown>;
  assert(typeof metrics === "object" && metrics !== null, "Portal summary metrics must be an object");
  assertNonNegativeInteger(metrics.totalComponents, "metrics.totalComponents must be a non-negative integer");
  assertNonNegativeInteger(metrics.healthyComponents, "metrics.healthyComponents must be a non-negative integer");
  assertNonNegativeInteger(metrics.degradedComponents, "metrics.degradedComponents must be a non-negative integer");

  const freshness = candidate.freshness as Record<string, unknown>;
  assert(typeof freshness === "object" && freshness !== null, "Portal summary freshness must be an object");
  assertNonNegativeInteger(freshness.maxAgeSeconds, "freshness.maxAgeSeconds must be a non-negative integer");

  const components = candidate.components;
  assert(Array.isArray(components), "Portal summary components must be an array");

  for (const component of components) {
    assert(typeof component === "object" && component !== null, "Each portal summary component must be an object");
    const entry = component as Record<string, unknown>;
    assert(typeof entry.id === "string" && entry.id.length > 0, "Each component must have a non-empty id");
    assert(typeof entry.label === "string" && entry.label.length > 0, "Each component must have a non-empty label");
    assert(entry.kind === "service", "Each component kind must be 'service'");
    assert(
      entry.status === "healthy" || entry.status === "degraded",
      "Each component status must be 'healthy' or 'degraded'"
    );
    assertNonNegativeNumber(entry.latencyMs, "Each component latencyMs must be a non-negative number");
    assert(isIsoTimestamp(entry.observedAt), "Each component observedAt must be an ISO-8601 timestamp");
  }

  return candidate as unknown as PortalSummary;
}
