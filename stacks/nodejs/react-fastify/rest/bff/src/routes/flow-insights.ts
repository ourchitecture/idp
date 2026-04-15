import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { flowInferenceEngine } from "../flow/inference";
import type { ProviderAdapterInput } from "../flow/types";

const adapterInputSchema = z.object({
  repository: z
    .object({
      provider: z.string(),
      provider_id: z.string(),
      full_name: z.string(),
      default_branch: z.string(),
      fetched_at: z.string(),
    })
    .passthrough(),
  changes: z.array(z.any()),
  actors: z.array(z.any()),
  review_states: z.array(z.any()),
  validation_runs: z.array(z.any()),
  merge_events: z.array(z.any()),
  ownership_hints: z.array(z.any()),
  evidence_states: z.array(z.any()).optional(),
})
  .strip()
  .passthrough();

export const flowInsightsRoutes: FastifyPluginAsync = async (app) => {
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
