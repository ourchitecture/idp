import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";

const checkEntrySchema = z.object({
  componentType: z.enum(["system", "component", "datastore"]),
  status: z.enum(["pass", "fail", "warn"]),
  time: z.string(),
});

const healthResponseSchema = z.object({
  status: z.enum(["pass", "fail", "warn"]),
  serviceId: z.literal("idp-bff"),
  description: z.literal("IDP BFF Server"),
  checks: z.record(z.string(), z.array(checkEntrySchema)).optional(),
});

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_request, reply) => {
    const now = new Date().toISOString();
    const payload = healthResponseSchema.parse({
      status: "pass",
      serviceId: "idp-bff",
      description: "IDP BFF Server",
      checks: {
        "bff:responseTime": [
          {
            componentType: "system",
            status: "pass",
            time: now,
          },
        ],
        "routing:availability": [
          {
            componentType: "component",
            status: "pass",
            time: now,
          },
        ],
      },
    });

    return reply
      .header("Content-Type", "application/health+json; charset=utf-8")
      .status(200)
      .send(payload);
  });
};
