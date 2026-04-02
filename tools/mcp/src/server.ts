import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerCheckHealth } from "./tools/check-health.js";
import { registerGetPortalSummary } from "./tools/get-portal-summary.js";

const SERVER_NAME = "stemix-idp";
const SERVER_VERSION = "0.1.0";

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerGetPortalSummary(server);
  registerCheckHealth(server);

  return server;
}

async function startHttpMode(port: number): Promise<void> {
  const httpServer = createServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found. Use POST /mcp for MCP requests." }));
      return;
    }

    // Each request gets its own stateless server + transport pair (no session state).
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        process.stderr.write(
          JSON.stringify({ level: "info", msg: "MCP session initialized", sessionId }) + "\n"
        );
      },
    });

    transport.onclose = () => {
      void server.close();
    };

    await server.connect(transport);

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        JSON.stringify({ level: "error", msg: "MCP request failed", error: message }) + "\n"
      );
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
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

const rawPort = process.env.MCP_HTTP_PORT;
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
