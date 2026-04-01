import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";

const serviceSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["healthy", "degraded"]),
  latencyMs: z.number().nonnegative(),
});

const summaryResponseSchema = z.object({
  generatedAt: z.string(),
  status: z.enum(["ok", "degraded"]),
  metrics: z.object({
    servicesHealthy: z.number().int().nonnegative(),
    activePlugins: z.number().int().nonnegative(),
    queuedIntents: z.number().int().nonnegative(),
  }),
  services: z.array(serviceSchema),
});

type Service = z.infer<typeof serviceSchema>;

function getServiceSet(): Service[] {
  return [
    {
      id: "catalog",
      label: "Service Catalog",
      status: "healthy",
      latencyMs: 24,
    },
    {
      id: "policy",
      label: "Policy Engine",
      status: "healthy",
      latencyMs: 36,
    },
    {
      id: "plugin-runtime",
      label: "Plugin Runtime",
      status: "degraded",
      latencyMs: 88,
    },
  ];
}

export const portalSummaryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/portal/summary", async () => {
    const services = getServiceSet();
    const servicesHealthy = services.filter((service) => service.status === "healthy").length;

    return summaryResponseSchema.parse({
      generatedAt: new Date().toISOString(),
      status: servicesHealthy === services.length ? "ok" : "degraded",
      metrics: {
        servicesHealthy,
        activePlugins: 7,
        queuedIntents: 5,
      },
      services,
    });
  });
};
