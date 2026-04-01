import { assert, parseJsonOrThrow } from "../assertions";
import { request } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

function assertIsoDate(value: unknown, fieldName: string): void {
  assert(typeof value === "string" && value.length > 0, `${fieldName} must be a non-empty string`);
  const timestamp = Date.parse(value);
  assert(!Number.isNaN(timestamp), `${fieldName} must be an ISO-8601 compatible timestamp`);
}

function asObject(value: unknown, fieldName: string): Record<string, unknown> {
  assert(typeof value === "object" && value !== null, `${fieldName} must be an object`);
  return value as Record<string, unknown>;
}

export function createOperationalTests(context: ContractContext): TestCase[] {
  const { webBaseUrl, bffBaseUrl } = context;

  return [
    {
      name: "operational:web honors override-aware runtime port contract",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        const response = await request(new URL("/", webBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);
      },
    },
    {
      name: "operational:bff health payload semantics are stable",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/health", bffBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const payload = asObject(parseJsonOrThrow(response.body), "Health response");
        assert("status" in payload, "Health response must include status");
        assert("service" in payload, "Health response must include service");
        assert("timestamp" in payload, "Health response must include timestamp");

        assert(
          payload.status === "ok" || payload.status === "degraded",
          "Health status must be 'ok' or 'degraded'"
        );
        assert(payload.service === "idp-bff", "Health service must be 'idp-bff'");
        assertIsoDate(payload.timestamp, "Health timestamp");
      },
    },
    {
      name: "operational:bff readiness contract semantics are stable",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/readiness", bffBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const payload = asObject(parseJsonOrThrow(response.body), "Readiness response");
        assert("status" in payload, "Readiness response must include status");
        assert("checks" in payload, "Readiness response must include checks");
        assert("timestamp" in payload, "Readiness response must include timestamp");

        assert(payload.status === "ready", "Readiness status must be 'ready'");
        const checks = asObject(payload.checks, "Readiness checks");
        assert("bff" in checks, "Readiness checks must include 'bff'");
        assert("routing" in checks, "Readiness checks must include 'routing'");
        assertIsoDate(payload.timestamp, "Readiness timestamp");
      },
    },
  ];
}
