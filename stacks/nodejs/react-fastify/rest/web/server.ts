import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "127.0.0.1";

const HEALTH_RESPONSE = JSON.stringify({
  status: "pass",
  serviceId: "idp-web",
  description: "IDP Web Server",
});

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0) {
    return undefined;
  }

  return port;
}

function resolvePort(): number {
  const overridePort = parsePort(process.env.OUR_IDP_PORT);
  if (overridePort !== undefined) {
    return overridePort;
  }

  const fallbackPort = parsePort(process.env.PORT);
  if (fallbackPort !== undefined) {
    return fallbackPort;
  }

  return DEFAULT_PORT;
}

function resolveHost(): string {
  const overrideHost = process.env.OUR_IDP_WEB_HOST?.trim();
  if (overrideHost !== undefined && overrideHost.length > 0) {
    return overrideHost;
  }

  return DEFAULT_HOST;
}

async function start(): Promise<void> {
  const host = resolveHost();
  const port = resolvePort();
  const currentFile = fileURLToPath(import.meta.url);
  const webRoot = path.dirname(currentFile);
  const configFile = path.join(webRoot, "vite.config.ts");

  const server = await createServer({
    root: webRoot,
    configFile,
    server: {
      host,
      port,
    },
  });

  // Add /health middleware before Vite handles requests
  server.middlewares.use("/health", (_req, res) => {
    res.setHeader("Content-Type", "application/health+json; charset=utf-8");
    res.writeHead(200);
    res.end(HEALTH_RESPONSE);
  });

  await server.listen();

  console.log(
    JSON.stringify({
      level: "info",
      msg: "IDP web server listening",
      host,
      port,
      mode: "vite-dev",
    })
  );
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Failed to start IDP web server",
      error: message,
    })
  );

  process.exitCode = 1;
});
