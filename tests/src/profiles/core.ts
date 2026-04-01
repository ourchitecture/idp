import { assert, parseJsonOrThrow } from "../assertions";
import { request } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

export function createCoreTests(context: ContractContext): TestCase[] {
  const { webBaseUrl, bffBaseUrl } = context;

  return [
    {
      name: "core:web responds to GET /",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        const response = await request(new URL("/", webBaseUrl));
        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);
      },
    },
    {
      name: "core:web health endpoint returns expected shape",
      run: async () => {
        await ensureServiceAvailable("web server", webBaseUrl);
        const response = await request(new URL("/health", webBaseUrl));

        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(
          contentType.includes("application/health+json"),
          "Web health must return application/health+json content type"
        );

        const payload = parseJsonOrThrow(response.body);
        assert(typeof payload === "object" && payload !== null, "Health response must be a JSON object");
        assert("status" in payload, "Health response must include status");
        assert("serviceId" in payload, "Health response must include serviceId");
        assert("description" in payload, "Health response must include description");
      },
    },
    {
      name: "core:bff root returns JSON status",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/", bffBaseUrl));

        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(contentType.includes("application/json"), "BFF root must return application/json content type");

        const payload = parseJsonOrThrow(response.body);
        assert(
          typeof payload === "object" && payload !== null && "status" in payload,
          "Response JSON must include a status field"
        );
        assert(
          typeof (payload as Record<string, unknown>).status === "string",
          "Response JSON status field must be a string"
        );
        assert(
          typeof payload === "object" && payload !== null && "service" in payload,
          "Response JSON must include a service field"
        );
        assert(
          typeof (payload as Record<string, unknown>).service === "string",
          "Response JSON service field must be a string"
        );
      },
    },
    {
      name: "core:bff health endpoint returns expected shape",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/health", bffBaseUrl));

        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(
          contentType.includes("application/health+json"),
          "BFF health must return application/health+json content type"
        );

        const payload = parseJsonOrThrow(response.body);
        assert(typeof payload === "object" && payload !== null, "Health response must be a JSON object");
        assert("status" in payload, "Health response must include status");
        assert("serviceId" in payload, "Health response must include serviceId");
        assert("description" in payload, "Health response must include description");
      },
    },
    {
      name: "core:bff readiness endpoint returns expected shape",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/readiness", bffBaseUrl));

        assert(response.status >= 200 && response.status < 300, `Expected 2xx, got ${response.status}`);

        const contentType = response.headers["content-type"] ?? "";
        assert(
          contentType.includes("application/health+json"),
          "BFF readiness must return application/health+json content type"
        );

        const payload = parseJsonOrThrow(response.body);
        assert(typeof payload === "object" && payload !== null, "Readiness response must be a JSON object");
        assert("status" in payload, "Readiness response must include status");
        assert("checks" in payload, "Readiness response must include checks");
      },
    },
  ];
}
