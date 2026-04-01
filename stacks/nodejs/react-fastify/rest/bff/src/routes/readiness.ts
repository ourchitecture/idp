import type { FastifyPluginAsync } from "fastify";

export const readinessRoutes: FastifyPluginAsync = async (app) => {
  app.get("/readiness", async (_request, reply) => {
    const now = new Date().toISOString();
    return reply
      .header("Content-Type", "application/health+json; charset=utf-8")
      .status(200)
      .send({
        status: "pass",
        checks: {
          "bff:ready": [
            {
              componentType: "system",
              status: "pass",
              time: now,
            },
          ],
          "routing:ready": [
            {
              componentType: "component",
              status: "pass",
              time: now,
            },
          ],
        },
      });
  });
};
