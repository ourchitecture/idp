import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health";
import { portalSummaryRoutes } from "./routes/portal-summary";
import { readinessRoutes } from "./routes/readiness";
import { rootRoutes } from "./routes/root";

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "OPTIONS"],
  });

  await app.register(rootRoutes);
  await app.register(healthRoutes);
  await app.register(readinessRoutes);
  await app.register(portalSummaryRoutes);

  return app;
}
