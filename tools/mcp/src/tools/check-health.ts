import http from "node:http";
import https from "node:https";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const CHECK_HEALTH_TOOL_NAME = "check_health";
export const CHECK_HEALTH_TOOL_DESCRIPTION =
  "Check the health and readiness status of the IDP BFF service. Returns both the IETF health check response and the readiness check response.";

function resolveBffUrl(): URL {
  const raw = process.env.OUR_IDP_BFF_URL ?? "http://localhost:8000";
  return new URL(raw);
}

function fetchText(url: URL): Promise<string> {
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, { method: "GET" }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

export async function runCheckHealthTool(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const bffUrl = resolveBffUrl();

  const [healthBody, readinessBody] = await Promise.all([
    fetchText(new URL("/health", bffUrl)),
    fetchText(new URL("/readiness", bffUrl)),
  ]);

  const result = {
    health: JSON.parse(healthBody) as unknown,
    readiness: JSON.parse(readinessBody) as unknown,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
}

export function registerCheckHealth(server: McpServer): void {
  server.tool(
    CHECK_HEALTH_TOOL_NAME,
    CHECK_HEALTH_TOOL_DESCRIPTION,
    {},
    async () => runCheckHealthTool()
  );
}
