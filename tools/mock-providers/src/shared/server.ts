import http from "node:http";
import { URL } from "node:url";

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  query: Record<string, string>,
  body: string,
) => Promise<void> | void;

type Route = {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
};

export class MockHttpServer {
  private routes: Route[] = [];
  private server: http.Server;

  constructor() {
    this.server = http.createServer((req, res) => {
      void this.dispatch(req, res);
    });
  }

  get(path: string, handler: RouteHandler): this {
    return this.register("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.register("POST", path, handler);
  }

  private register(method: string, pathPattern: string, handler: RouteHandler): this {
    const paramNames: string[] = [];
    const regexStr = pathPattern.replace(/:([^/]+)/g, (_, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    });
    return this;
  }

  private async dispatch(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const rawUrl = req.url ?? "/";
    const base = `http://localhost`;
    const parsed = new URL(rawUrl, base);
    const pathname = parsed.pathname;
    const query: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const method = req.method?.toUpperCase() ?? "GET";

    let body = "";
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      await new Promise<void>((resolve) => {
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on("end", resolve);
      });
    }

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      try {
        await route.handler(req, res, params, query, body);
      } catch (err) {
        if (!res.headersSent) {
          this.sendJson(res, 500, { error: "internal_error", message: String(err) });
        }
      }
      return;
    }

    this.sendJson(res, 404, { error: "not_found", path: pathname });
  }

  sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  listen(port: number, host = "127.0.0.1"): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port, host, () => resolve());
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  address(): { port: number } {
    const addr = this.server.address();
    if (!addr || typeof addr === "string") throw new Error("Server not listening");
    return { port: addr.port };
  }
}
