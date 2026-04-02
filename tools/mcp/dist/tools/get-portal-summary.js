import http from "node:http";
import https from "node:https";
import { z } from "zod";
export const GET_PORTAL_SUMMARY_TOOL_NAME = "get_portal_summary";
export const GET_PORTAL_SUMMARY_TOOL_DESCRIPTION = "Get the shared IDP status summary for IDP-owned components from the BFF portal summary contract.";
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
function resolveBffUrl() {
    const raw = process.env.IDP_BFF_URL ?? "http://localhost:8000";
    return new URL(raw);
}
function fetchText(url) {
    const client = url.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
        const req = client.request(url, { method: "GET" }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
            res.on("error", reject);
        });
        req.on("error", reject);
        req.end();
    });
}
export async function runGetPortalSummaryTool() {
    const bffUrl = resolveBffUrl();
    const body = await fetchText(new URL("/api/portal/summary", bffUrl));
    const summary = portalSummarySchema.parse(JSON.parse(body));
    return {
        content: [{ type: "text", text: JSON.stringify(summary) }],
    };
}
export function registerGetPortalSummary(server) {
    server.tool(GET_PORTAL_SUMMARY_TOOL_NAME, GET_PORTAL_SUMMARY_TOOL_DESCRIPTION, {}, async () => runGetPortalSummaryTool());
}
