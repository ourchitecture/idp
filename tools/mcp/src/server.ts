import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CHECK_HEALTH_TOOL_DESCRIPTION,
  CHECK_HEALTH_TOOL_NAME,
  registerCheckHealth,
  runCheckHealthTool,
} from "./tools/check-health.js";
import {
  GET_PORTAL_SUMMARY_TOOL_DESCRIPTION,
  GET_PORTAL_SUMMARY_TOOL_NAME,
  registerGetPortalSummary,
  runGetPortalSummaryTool,
} from "./tools/get-portal-summary.js";
import {
  GET_FLOW_INSIGHT_TOOL_DESCRIPTION,
  GET_FLOW_INSIGHT_TOOL_NAME,
  LIST_FLOW_INSIGHTS_TOOL_DESCRIPTION,
  LIST_FLOW_INSIGHTS_TOOL_NAME,
  LIST_MY_BLOCKERS_TOOL_DESCRIPTION,
  LIST_MY_BLOCKERS_TOOL_NAME,
  LIST_SERVICE_RISK_SIGNALS_TOOL_DESCRIPTION,
  LIST_SERVICE_RISK_SIGNALS_TOOL_NAME,
  registerFlowInsightsTools,
  runGetFlowInsightTool,
  runListFlowInsightsTool,
  runListMyBlockersTool,
  runListServiceRiskSignalsTool,
} from "./tools/flow-insights.js";

const SERVER_NAME = "stemix-idp";
const SERVER_VERSION = "0.1.0";
const MCP_PROTOCOL_VERSION = "2024-11-05";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
};

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerGetPortalSummary(server);
  registerCheckHealth(server);
  registerFlowInsightsTools(server);

  return server;
}

function writeJson(
  res: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown,
  headers?: Record<string, string>
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", reject);
  });
}

async function startHttpMode(port: number): Promise<void> {
  const sessions = new Map<string, boolean>();

  const httpServer = createServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found. Use POST /mcp for MCP requests." }));
      return;
    }

    try {
      if (req.method !== "POST") {
        writeJson(res, 405, { error: "Only POST /mcp is supported." });
        return;
      }

      const body = await readRequestBody(req);
      const payload = JSON.parse(body) as JsonRpcRequest;
      const method = payload.method;

      if (payload.jsonrpc !== "2.0" || typeof method !== "string") {
        writeJson(res, 400, {
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
          id: payload.id ?? null,
        });
        return;
      }

      if (method === "initialize") {
        const sessionId = randomUUID();
        sessions.set(sessionId, false);
        process.stderr.write(
          JSON.stringify({ level: "info", msg: "MCP session initialized", sessionId }) + "\n"
        );
        writeJson(
          res,
          200,
          {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: {
              protocolVersion: MCP_PROTOCOL_VERSION,
              capabilities: {
                tools: {
                  listChanged: true,
                },
              },
              serverInfo: {
                name: SERVER_NAME,
                version: SERVER_VERSION,
              },
            },
          },
          {
            "Mcp-Session-Id": sessionId,
          }
        );
        return;
      }

      const rawSessionId = req.headers["mcp-session-id"];
      const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
      if (sessionId === undefined || !sessions.has(sessionId)) {
        writeJson(res, 400, {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: Mcp-Session-Id header is required" },
          id: payload.id ?? null,
        });
        return;
      }

      if (method === "notifications/initialized") {
        sessions.set(sessionId, true);
        res.writeHead(202);
        res.end();
        return;
      }

      if (sessions.get(sessionId) !== true) {
        writeJson(res, 400, {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: Server not initialized" },
          id: payload.id ?? null,
        });
        return;
      }

      if (method === "tools/list") {
        writeJson(res, 200, {
          jsonrpc: "2.0",
          id: payload.id ?? null,
          result: {
            tools: [
              {
                name: GET_PORTAL_SUMMARY_TOOL_NAME,
                description: GET_PORTAL_SUMMARY_TOOL_DESCRIPTION,
                inputSchema: { type: "object", properties: {}, additionalProperties: false },
              },
              {
                name: CHECK_HEALTH_TOOL_NAME,
                description: CHECK_HEALTH_TOOL_DESCRIPTION,
                inputSchema: { type: "object", properties: {}, additionalProperties: false },
              },
              {
                name: LIST_FLOW_INSIGHTS_TOOL_NAME,
                description: LIST_FLOW_INSIGHTS_TOOL_DESCRIPTION,
                inputSchema: {
                  type: "object",
                  properties: {
                    provider: { type: "string" },
                    repo: { type: "string" },
                    team: { type: "string" },
                    service: { type: "string" },
                    actor: { type: "string" },
                    audience: { type: "string", enum: ["owner", "actor", "reviewer"] },
                  },
                  additionalProperties: false,
                },
              },
              {
                name: GET_FLOW_INSIGHT_TOOL_NAME,
                description: GET_FLOW_INSIGHT_TOOL_DESCRIPTION,
                inputSchema: {
                  type: "object",
                  properties: {
                    insightId: { type: "string" },
                    audience: { type: "string", enum: ["owner", "actor", "reviewer"] },
                  },
                  required: ["insightId"],
                  additionalProperties: false,
                },
              },
              {
                name: LIST_MY_BLOCKERS_TOOL_NAME,
                description: LIST_MY_BLOCKERS_TOOL_DESCRIPTION,
                inputSchema: {
                  type: "object",
                  properties: {
                    actor: { type: "string" },
                    provider: { type: "string" },
                    repo: { type: "string" },
                    team: { type: "string" },
                    service: { type: "string" },
                  },
                  required: ["actor"],
                  additionalProperties: false,
                },
              },
              {
                name: LIST_SERVICE_RISK_SIGNALS_TOOL_NAME,
                description: LIST_SERVICE_RISK_SIGNALS_TOOL_DESCRIPTION,
                inputSchema: {
                  type: "object",
                  properties: {
                    service: { type: "string" },
                    provider: { type: "string" },
                    team: { type: "string" },
                  },
                  required: ["service"],
                  additionalProperties: false,
                },
              },
            ],
          },
        });
        return;
      }

      if (method === "tools/call") {
        const toolName = payload.params?.name;
        const toolArgs = payload.params?.arguments as unknown;
        if (toolName === GET_PORTAL_SUMMARY_TOOL_NAME) {
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: await runGetPortalSummaryTool(),
          });
          return;
        }

        if (toolName === CHECK_HEALTH_TOOL_NAME) {
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: await runCheckHealthTool(),
          });
          return;
        }

        if (toolName === LIST_FLOW_INSIGHTS_TOOL_NAME) {
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: await runListFlowInsightsTool(toolArgs),
          });
          return;
        }

        if (toolName === GET_FLOW_INSIGHT_TOOL_NAME) {
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: await runGetFlowInsightTool(toolArgs),
          });
          return;
        }

        if (toolName === LIST_MY_BLOCKERS_TOOL_NAME) {
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: await runListMyBlockersTool(toolArgs),
          });
          return;
        }

        if (toolName === LIST_SERVICE_RISK_SIGNALS_TOOL_NAME) {
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: payload.id ?? null,
            result: await runListServiceRiskSignalsTool(toolArgs),
          });
          return;
        }

        writeJson(res, 404, {
          jsonrpc: "2.0",
          error: { code: -32601, message: `Tool not found: ${String(toolName)}` },
          id: payload.id ?? null,
        });
        return;
      }

      writeJson(res, 404, {
        jsonrpc: "2.0",
        error: { code: -32601, message: `Method not found: ${method}` },
        id: payload.id ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        JSON.stringify({ level: "error", msg: "MCP request failed", error: message }) + "\n"
      );
      if (!res.headersSent) {
        writeJson(res, 500, { error: "Internal server error" });
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, "0.0.0.0", () => {
      process.stderr.write(
        JSON.stringify({ level: "info", msg: "MCP HTTP server listening", port }) + "\n"
      );
      resolve();
    });
  });

  process.once("SIGINT", () => {
    httpServer.close(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    httpServer.close(() => process.exit(0));
  });
}

async function startStdioMode(): Promise<void> {
  const server = buildMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    JSON.stringify({ level: "info", msg: "MCP stdio server started", name: SERVER_NAME, version: SERVER_VERSION }) + "\n"
  );
}

const rawPort = process.env.OUR_IDP_MCP_PORT;
const httpPort = rawPort !== undefined ? parseInt(rawPort, 10) : null;

if (httpPort !== null && !Number.isNaN(httpPort)) {
  startHttpMode(httpPort).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      JSON.stringify({ level: "error", msg: "MCP HTTP server startup failed", error: message }) + "\n"
    );
    process.exit(1);
  });
} else {
  startStdioMode().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      JSON.stringify({ level: "error", msg: "MCP stdio server startup failed", error: message }) + "\n"
    );
    process.exit(1);
  });
}
