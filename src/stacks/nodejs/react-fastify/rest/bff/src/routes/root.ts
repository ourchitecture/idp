import type { FastifyPluginAsync } from "fastify";

export const rootRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return {
      status: "ok",
      service: "idp-bff",
    };
  });
};
