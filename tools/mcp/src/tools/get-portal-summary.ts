import http from "node:http";
import https from "node:https";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function resolveBffUrl(): URL {
  const raw = process.env.IDP_BFF_URL ?? "http://localhost:8000";
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

export function registerGetPortalSummary(server: McpServer): void {
  server.tool(
    "get_portal_summary",
    "Get the current status of the IDP portal, including service health metrics, active plugins, and queued intents.",
    {},
    async () => {
      const bffUrl = resolveBffUrl();
      const body = await fetchText(new URL("/api/portal/summary", bffUrl));
      return {
        content: [{ type: "text" as const, text: body }],
      };
    }
  );
}
