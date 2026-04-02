import { parseJsonOrThrow } from "../assertions";
import { request } from "../http";
import { ensureServiceAvailable } from "../runtime";
import { parsePortalSummaryOrThrow } from "../status";
import type { ContractContext, TestCase } from "../types";

function isStatusEnabled(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.status?.enabled === true;
}

export function createStatusProfileTests(context: ContractContext): TestCase[] {
  if (!isStatusEnabled(context)) {
    return [];
  }

  const { bffBaseUrl } = context;

  return [
    {
      name: "status-profile:bff portal summary returns expected shape",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/portal/summary", bffBaseUrl));

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`Expected 2xx, got ${response.status}`);
        }

        const contentType = response.headers["content-type"] ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("Portal summary must return application/json content type");
        }

        parsePortalSummaryOrThrow(parseJsonOrThrow(response.body));
      },
    },
    {
      name: "status-profile:portal summary metrics are internally consistent",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/portal/summary", bffBaseUrl));
        const summary = parsePortalSummaryOrThrow(parseJsonOrThrow(response.body));

        const healthyCount = summary.components.filter((component) => component.status === "healthy").length;
        const degradedCount = summary.components.filter((component) => component.status === "degraded").length;

        if (summary.metrics.totalComponents !== summary.components.length) {
          throw new Error("metrics.totalComponents must equal the number of components");
        }
        if (summary.metrics.healthyComponents !== healthyCount) {
          throw new Error("metrics.healthyComponents must equal the number of healthy components");
        }
        if (summary.metrics.degradedComponents !== degradedCount) {
          throw new Error("metrics.degradedComponents must equal the number of degraded components");
        }

        const expectedStatus = degradedCount > 0 ? "degraded" : "ok";
        if (summary.status !== expectedStatus) {
          throw new Error(`summary.status must be '${expectedStatus}' when metrics indicate that state`);
        }
      },
    },
    {
      name: "status-profile:portal summary timestamps and freshness are valid",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/api/portal/summary", bffBaseUrl));
        const summary = parsePortalSummaryOrThrow(parseJsonOrThrow(response.body));

        const generatedAt = Date.parse(summary.generatedAt);
        const now = Date.now();
        if (Math.abs(now - generatedAt) > 60_000) {
          throw new Error("generatedAt must be within 60 seconds of the current time");
        }

        let maxAgeSeconds = 0;
        for (const component of summary.components) {
          const observedAt = Date.parse(component.observedAt);
          if (observedAt > generatedAt + 5_000) {
            throw new Error("component observedAt timestamps must not be meaningfully in the future");
          }

          const ageSeconds = Math.max(0, Math.floor((generatedAt - observedAt) / 1000));
          if (ageSeconds > maxAgeSeconds) {
            maxAgeSeconds = ageSeconds;
          }
        }

        if (summary.freshness.maxAgeSeconds !== maxAgeSeconds) {
          throw new Error("freshness.maxAgeSeconds must equal the oldest component observation age");
        }
      },
    },
  ];
}
