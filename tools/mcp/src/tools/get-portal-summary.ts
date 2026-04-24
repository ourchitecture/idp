import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchText, resolveBffUrl } from "../http-client.js";

export const GET_PORTAL_SUMMARY_TOOL_NAME = "get_portal_summary";
export const GET_PORTAL_SUMMARY_TOOL_DESCRIPTION =
  "Get the shared IDP status summary for IDP-owned components from the BFF portal summary contract.";

const portalSummarySchema = z.object({
  generatedAt: z.string(),
  status: z.enum(["ok", "degraded"]),
  metrics: z.object({
    totalComponents: z.number().int().nonnegative(),
    healthyComponents: z.number().int().nonnegative(),
    degradedComponents: z.number().int().nonnegative(),
  }),
  freshness: z.object({
    maxAgeSeconds: z.number().int().nonnegative(),
  }),
  components: z.array(z.object({
    id: z.string(),
    label: z.string(),
    kind: z.literal("service"),
    status: z.enum(["healthy", "degraded"]),
    latencyMs: z.number().nonnegative(),
    observedAt: z.string(),
  })).min(1),
});

export async function runGetPortalSummaryTool(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const bffUrl = resolveBffUrl();
  const body = await fetchText(new URL("/api/portal/summary", bffUrl));
  const summary = portalSummarySchema.parse(JSON.parse(body) as unknown);

  return {
    content: [{ type: "text", text: JSON.stringify(summary) }],
  };
}

export function registerGetPortalSummary(server: McpServer): void {
  server.tool(
    GET_PORTAL_SUMMARY_TOOL_NAME,
    GET_PORTAL_SUMMARY_TOOL_DESCRIPTION,
    {},
    async () => runGetPortalSummaryTool()
  );
}
