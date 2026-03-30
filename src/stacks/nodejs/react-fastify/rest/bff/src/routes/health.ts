import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal("idp-bff"),
  timestamp: z.string(),
});

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/health", async () => {
    return healthResponseSchema.parse({
      status: "ok",
      service: "idp-bff",
      timestamp: new Date().toISOString(),
    });
  });
};
