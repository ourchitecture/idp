import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { flowInferenceEngine } from "../flow/inference";
import { adapterInputSchema } from "../flow/schema";
import { findFlowInsightDetail, listFlowInsights } from "../flow/insightsCatalog";
import type { ProviderAdapterInput } from "../flow/types";

const listQuerySchema = z
  .object({
    provider: z.string().optional(),
    repo: z.string().optional(),
    team: z.string().optional(),
    service: z.string().optional(),
    actor: z.string().optional(),
    audience: z.enum(["owner", "actor", "reviewer"]).optional(),
  })
  .strip();

const detailParamsSchema = z.object({
  insightId: z.string(),
});

export const flowInsightsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/flow/insights", async (request) => {
    const query = listQuerySchema.parse(request.query ?? {});
    const insights = listFlowInsights(query);

    const appliedFilters = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && `${value}`.length > 0),
    );

    return {
      generatedAt: new Date().toISOString(),
      filters: appliedFilters,
      total: insights.length,
      insights,
    };
  });

  app.get("/api/flow/insights/:insightId", async (request, reply) => {
    const params = detailParamsSchema.parse(request.params ?? {});
    const query = listQuerySchema.parse(request.query ?? {});
    const insight = findFlowInsightDetail(params.insightId, query.audience);

    if (!insight) {
      return reply.status(404).send({
        error: "insight_not_found",
        message: `No insight found for '${params.insightId}'.`,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      insight,
    };
  });

  app.post("/api/flow/insights", async (request, reply) => {
    const parsed = adapterInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_provider_adapter_input",
        message: "Request body must conform to ProviderAdapterInput schema.",
        details: parsed.error.flatten(),
      });
    }

    const input = parsed.data as ProviderAdapterInput;
    const result = flowInferenceEngine.infer(input, { now: new Date() });
    return result;
  });
};
