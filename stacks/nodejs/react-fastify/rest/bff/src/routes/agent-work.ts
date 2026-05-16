import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { findAgentTask, listAgentTasks } from "../agent-work/agentTaskCatalog";

const listQuerySchema = z
  .object({
    state: z.string().optional(),
    slug: z.string().optional(),
  })
  .strip();

const detailParamsSchema = z.object({
  taskId: z.string(),
});

export const agentWorkRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/agent-work/tasks", async (request) => {
    const query = listQuerySchema.parse(request.query ?? {});
    const tasks = listAgentTasks(query);

    const appliedFilters = Object.fromEntries(
      Object.entries(query).filter(
        ([, value]) => value !== undefined && `${value}`.length > 0,
      ),
    );

    return {
      generatedAt: new Date().toISOString(),
      filters: appliedFilters,
      total: tasks.length,
      tasks,
    };
  });

  app.get("/api/agent-work/tasks/:taskId", async (request, reply) => {
    const params = detailParamsSchema.parse(request.params ?? {});
    const task = findAgentTask(params.taskId);

    if (!task) {
      return reply.status(404).send({
        error: "agent_task_not_found",
        message: `No agent task found for '${params.taskId}'.`,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      task,
    };
  });
};
