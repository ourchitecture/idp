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

const VALID_HEALTH_STATUSES = ["pass", "fail", "warn"];
const VALID_READINESS_STATUSES = ["pass", "fail"];
const VALID_COMPONENT_TYPES = ["system", "component", "datastore"];
const CHECKS_KEY_PATTERN = /^[^:]+:[^:]+$/;

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
      name: "operational:web health payload semantics are stable",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        const response = await request(new URL("/health", webBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(
          contentType.includes("application/health+json"),
          "Web health must return application/health+json content type"
        );

        const payload = asObject(parseJsonOrThrow(response.body), "Health response");
        assert(payload.status === "pass", "Web health status must be 'pass'");
        assert(payload.serviceId === "idp-web", "Web health serviceId must be 'idp-web'");
        assert(payload.description === "IDP Web Server", "Web health description must be 'IDP Web Server'");
      },
    },
    {
      name: "operational:bff health payload semantics are stable",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/health", bffBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(
          contentType.includes("application/health+json"),
          "BFF health must return application/health+json content type"
        );

        const payload = asObject(parseJsonOrThrow(response.body), "Health response");
        assert(
          VALID_HEALTH_STATUSES.includes(payload.status as string),
          `Health status must be one of ${VALID_HEALTH_STATUSES.join(", ")}`
        );
        assert(payload.serviceId === "idp-bff", "Health serviceId must be 'idp-bff'");
        assert(payload.description === "IDP BFF Server", "Health description must be 'IDP BFF Server'");
      },
    },
    {
      name: "operational:bff health checks sub-components use IETF format",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/health", bffBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const payload = asObject(parseJsonOrThrow(response.body), "Health response");
        assert("checks" in payload, "Health response must include checks");
        const checks = asObject(payload.checks, "Health checks");

        const keys = Object.keys(checks);
        assert(keys.length > 0, "Health checks must contain at least one entry");

        for (const key of keys) {
          assert(
            CHECKS_KEY_PATTERN.test(key),
            `Check key '${key}' must use 'componentName:measurementName' format`
          );

          assert(Array.isArray(checks[key]), `Check entry '${key}' must be an array`);
          const entries = checks[key] as unknown[];
          assert(entries.length > 0, `Check entry '${key}' must contain at least one element`);

          for (const entry of entries) {
            const check = asObject(entry, `Check '${key}' entry`);
            assert(
              VALID_HEALTH_STATUSES.includes(check.status as string),
              `Check '${key}' status must be one of ${VALID_HEALTH_STATUSES.join(", ")}`
            );
            assert(
              VALID_COMPONENT_TYPES.includes(check.componentType as string),
              `Check '${key}' componentType must be one of ${VALID_COMPONENT_TYPES.join(", ")}`
            );
            assertIsoDate(check.time, `Check '${key}' time`);
          }
        }
      },
    },
    {
      name: "operational:bff readiness contract semantics are stable",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/readiness", bffBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(
          contentType.includes("application/health+json"),
          "BFF readiness must return application/health+json content type"
        );

        const payload = asObject(parseJsonOrThrow(response.body), "Readiness response");
        assert(
          VALID_READINESS_STATUSES.includes(payload.status as string),
          `Readiness status must be one of ${VALID_READINESS_STATUSES.join(", ")}`
        );
        assert("checks" in payload, "Readiness response must include checks");
        const checks = asObject(payload.checks, "Readiness checks");
        assert(Object.keys(checks).length > 0, "Readiness checks must not be empty");
      },
    },
  ];
}
