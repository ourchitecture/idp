import type { FastifyPluginAsync } from "fastify";

export const readinessRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/readiness", async (_request, reply) => {
    return reply.status(200).send({
      status: "ready",
      checks: {
        bff: "ok",
        routing: "ok",
      },
      timestamp: new Date().toISOString(),
    });
  });
};
