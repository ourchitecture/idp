import { z } from "zod";
import { fetchText, resolveBffUrl, applyQuery } from "../http-client.js";
export const LIST_FLOW_INSIGHTS_TOOL_NAME = "list_flow_insights";
export const LIST_FLOW_INSIGHTS_TOOL_DESCRIPTION = "List provider-neutral flow insights with optional filters for provider, repo, team, service, actor, or audience.";
export const GET_FLOW_INSIGHT_TOOL_NAME = "get_flow_insight";
export const GET_FLOW_INSIGHT_TOOL_DESCRIPTION = "Get a detailed flow insight by ID. The response matches the HTTP flow insights detail contract.";
export const LIST_MY_BLOCKERS_TOOL_NAME = "list_my_blockers";
export const LIST_MY_BLOCKERS_TOOL_DESCRIPTION = "List the flow insight signals that are blocking the specified actor (for example, blocked on review or missing evidence).";
export const LIST_SERVICE_RISK_SIGNALS_TOOL_NAME = "list_service_risk_signals";
export const LIST_SERVICE_RISK_SIGNALS_TOOL_DESCRIPTION = "List aggregated risk signals for a specific service scope.";
const severitySchema = z.enum(["low", "medium", "high"]);
const confidenceSchema = z.enum(["low", "medium", "high"]);
const stageSchema = z.enum([
    "review",
    "validation",
    "ownership",
    "evidence",
    "implementation",
    "aggregate",
]);
const audienceSchema = z.enum(["owner", "actor", "reviewer"]);
const flowInsightSummarySchema = z.object({
    insightId: z.string(),
    signalId: z.string(),
    title: z.string(),
    severity: severitySchema.optional(),
    confidence: confidenceSchema.optional(),
    provider: z.string(),
    repository: z.object({
        full_name: z.string(),
    }),
    scope: z
        .object({
        service: z.string().optional(),
        team: z.string().optional(),
        stage: stageSchema.optional(),
    })
        .optional(),
    services: z.array(z.string()),
    teams: z.array(z.string()),
    actors: z.array(z.string()),
    summary: z.string(),
    observedAt: z.string().optional(),
});
const flowInsightDetailSchema = flowInsightSummarySchema.extend({
    explanation: z.string().optional(),
    recommendedNextAction: z.string().optional(),
    relatedEntities: z.array(z.unknown()).optional(),
    source: z.object({
        fixtureId: z.string(),
        scenario: z.string().optional(),
        description: z.string().optional(),
    }),
});
const listResponseSchema = z.object({
    generatedAt: z.string(),
    filters: z.record(z.string(), z.unknown()).optional(),
    total: z.number().int().nonnegative(),
    insights: z.array(flowInsightSummarySchema),
});
const detailResponseSchema = z.object({
    generatedAt: z.string(),
    insight: flowInsightDetailSchema,
});
const listFlowInsightsInputSchema = z.object({
    provider: z.string().optional(),
    repo: z.string().optional(),
    team: z.string().optional(),
    service: z.string().optional(),
    actor: z.string().optional(),
    audience: audienceSchema.optional(),
});
const getFlowInsightInputSchema = z.object({
    insightId: z.string().min(1).refine((id) => !id.includes('/') && !id.includes('..'), { message: "insightId must not contain path separators or parent directory references" }),
    audience: audienceSchema.optional(),
});
const listMyBlockersInputSchema = z.object({
    actor: z.string().min(1, "actor is required to find personal blockers"),
    provider: z.string().optional(),
    repo: z.string().optional(),
    team: z.string().optional(),
    service: z.string().optional(),
});
const listServiceRiskSignalsInputSchema = z.object({
    service: z.string().min(1),
    provider: z.string().optional(),
    team: z.string().optional(),
});
const BLOCKER_SIGNAL_IDS = new Set(["blocked_on_review", "waiting_on_evidence", "aging_implementation"]);
const RISK_SIGNAL_ID = "risk_aggregation";
async function fetchList(filters) {
    const bffUrl = resolveBffUrl();
    const url = applyQuery(new URL("/api/flow/insights", bffUrl), filters);
    const body = await fetchText(url);
    return listResponseSchema.parse(JSON.parse(body));
}
async function fetchDetail(insightId, audience) {
    const bffUrl = resolveBffUrl();
    const encodedInsightId = encodeURIComponent(insightId);
    const url = applyQuery(new URL(`/api/flow/insights/${encodedInsightId}`, bffUrl), { audience });
    const body = await fetchText(url);
    return detailResponseSchema.parse(JSON.parse(body));
}
export async function runListFlowInsightsTool(rawArgs) {
    const args = listFlowInsightsInputSchema.parse(rawArgs ?? {});
    const result = await fetchList(args);
    return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
}
export async function runGetFlowInsightTool(rawArgs) {
    const args = getFlowInsightInputSchema.parse(rawArgs ?? {});
    const detail = await fetchDetail(args.insightId, args.audience);
    return {
        content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
    };
}
export async function runListMyBlockersTool(rawArgs) {
    const args = listMyBlockersInputSchema.parse(rawArgs ?? {});
    const result = await fetchList({ ...args, audience: "actor" });
    const insights = result.insights.filter((insight) => BLOCKER_SIGNAL_IDS.has(insight.signalId));
    const filtered = {
        ...result,
        total: insights.length,
        insights,
    };
    return {
        content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
}
export async function runListServiceRiskSignalsTool(rawArgs) {
    const args = listServiceRiskSignalsInputSchema.parse(rawArgs ?? {});
    const result = await fetchList({ service: args.service, provider: args.provider, team: args.team });
    const insights = result.insights.filter((insight) => insight.signalId === RISK_SIGNAL_ID);
    const filtered = {
        ...result,
        total: insights.length,
        insights,
    };
    return {
        content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
}
export function registerFlowInsightsTools(server) {
    server.tool(LIST_FLOW_INSIGHTS_TOOL_NAME, LIST_FLOW_INSIGHTS_TOOL_DESCRIPTION, listFlowInsightsInputSchema.shape, async (args) => runListFlowInsightsTool(args));
    server.tool(GET_FLOW_INSIGHT_TOOL_NAME, GET_FLOW_INSIGHT_TOOL_DESCRIPTION, getFlowInsightInputSchema.shape, async (args) => runGetFlowInsightTool(args));
    server.tool(LIST_MY_BLOCKERS_TOOL_NAME, LIST_MY_BLOCKERS_TOOL_DESCRIPTION, listMyBlockersInputSchema.shape, async (args) => runListMyBlockersTool(args));
    server.tool(LIST_SERVICE_RISK_SIGNALS_TOOL_NAME, LIST_SERVICE_RISK_SIGNALS_TOOL_DESCRIPTION, listServiceRiskSignalsInputSchema.shape, async (args) => runListServiceRiskSignalsTool(args));
}
