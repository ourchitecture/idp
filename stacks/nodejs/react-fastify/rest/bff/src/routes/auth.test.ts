import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, beforeEach, test } from "node:test";
import Fastify from "fastify";
import { authRoutes, resetAuthStores } from "./auth";

type EnvMap = Record<string, string | undefined>;

const AUTH_ENV_KEYS = [
  "OUR_IDP_OAUTH_PROVIDER",
  "OUR_IDP_OAUTH_AUTH_URL",
  "OUR_IDP_OAUTH_TOKEN_URL",
  "OUR_IDP_OAUTH_USERINFO_URL",
  "OUR_IDP_OAUTH_CLIENT_ID",
  "OUR_IDP_OAUTH_CLIENT_SECRET",
  "OUR_IDP_OAUTH_REDIRECT_URL",
  "OUR_IDP_OAUTH_SECURE_COOKIE",
  "OUR_IDP_OAUTH_MOCK_PORT",
] satisfies Array<keyof NodeJS.ProcessEnv>;

function withEnv(overrides: EnvMap): () => void {
  const previous = new Map<string, string | undefined>();

  for (const key of AUTH_ENV_KEYS) {
    previous.set(key, process.env[key]);
  }

  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function createApp() {
  const app = Fastify({
    logger: false,
  });

  return app;
}

function startMockOAuthServer() {
  const requests: { tokens: string[]; authHeaders: string[] } = { tokens: [], authHeaders: [] };

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/oauth/token") {
      const body = await new Promise<string>((resolve) => {
        let data = "";
        req.on("data", (chunk) => {
          data += chunk.toString();
        });
        req.on("end", () => resolve(data));
      });

      const params = new URLSearchParams(body);
      const code = params.get("code") ?? "";
      requests.tokens.push(code);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ access_token: `token-${code}`, token_type: "Bearer" }));
      return;
    }

    if (req.method === "GET" && req.url === "/userinfo") {
      requests.authHeaders.push(req.headers.authorization ?? "");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          login: "mock-user",
          id: 42,
          name: "Mock User",
          email: "mock@example.com",
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise<{
    baseUrl: string;
    close: () => Promise<void>;
    requests: typeof requests;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://${address.address}:${address.port}`,
        requests,
        close: () =>
          new Promise<void>((closeResolve) => {
            server.close(() => closeResolve());
          }),
      });
    });
  });
}

beforeEach(() => {
  resetAuthStores();
});

afterEach(() => {
  resetAuthStores();
});

test("skips auth route registration when provider is none", async (t) => {
  const restoreEnv = withEnv({ OUR_IDP_OAUTH_PROVIDER: "none" });
  t.after(restoreEnv);
  const app = createApp();
  await app.register(authRoutes);

  const response = await app.inject({ method: "GET", url: "/auth/login" });
  assert.strictEqual(response.statusCode, 404);

  await app.close();
});

test("registers auth routes when provider is mock", async (t) => {
  const restoreEnv = withEnv({
    OUR_IDP_OAUTH_PROVIDER: "mock",
    OUR_IDP_OAUTH_AUTH_URL: "http://127.0.0.1:9999/oauth/authorize",
    OUR_IDP_OAUTH_TOKEN_URL: "http://127.0.0.1:9999/oauth/token",
    OUR_IDP_OAUTH_USERINFO_URL: "http://127.0.0.1:9999/userinfo",
    OUR_IDP_OAUTH_CLIENT_ID: "client",
    OUR_IDP_OAUTH_CLIENT_SECRET: "secret",
    OUR_IDP_OAUTH_REDIRECT_URL: "http://localhost/auth/callback",
  });
  t.after(restoreEnv);

  const app = createApp();
  await app.register(authRoutes);

  const response = await app.inject({ method: "GET", url: "/auth/login" });
  assert.strictEqual(response.statusCode, 302);
  const location = response.headers.location ?? "";
  assert.ok(location.includes("state="));

  await app.close();
});

test("completes login flow, sets cookie, and returns session user", async (t) => {
  const server = await startMockOAuthServer();
  t.after(async () => {
    await server.close();
  });

  const restoreEnv = withEnv({
    OUR_IDP_OAUTH_PROVIDER: "mock",
    OUR_IDP_OAUTH_AUTH_URL: `${server.baseUrl}/oauth/authorize`,
    OUR_IDP_OAUTH_TOKEN_URL: `${server.baseUrl}/oauth/token`,
    OUR_IDP_OAUTH_USERINFO_URL: `${server.baseUrl}/userinfo`,
    OUR_IDP_OAUTH_CLIENT_ID: "client-id",
    OUR_IDP_OAUTH_CLIENT_SECRET: "client-secret",
    OUR_IDP_OAUTH_REDIRECT_URL: "http://localhost/auth/callback",
  });
  t.after(restoreEnv);

  const app = createApp();
  await app.register(authRoutes);

  const login = await app.inject({ method: "GET", url: "/auth/login" });
  assert.strictEqual(login.statusCode, 302);

  const loginURL = new URL(login.headers.location ?? "", "http://localhost");
  const state = loginURL.searchParams.get("state");
  assert.ok(state && state.length > 0);

  const callback = await app.inject({
    method: "GET",
    url: `/auth/callback?code=test-code&state=${state}`,
  });
  assert.strictEqual(callback.statusCode, 302);

  const sessionCookie = callback.cookies?.find((cookie) => cookie.name === "idp_session");
  assert.ok(sessionCookie);
  assert.ok(sessionCookie.value.length > 0);

  const me = await app.inject({
    method: "GET",
    url: "/auth/me",
    cookies: {
      idp_session: sessionCookie.value,
    },
  });

  assert.strictEqual(me.statusCode, 200);
  const body = me.json();
  assert.strictEqual(body.login, "mock-user");

  const logout = await app.inject({
    method: "POST",
    url: "/auth/logout",
    cookies: {
      idp_session: sessionCookie.value,
    },
  });
  assert.strictEqual(logout.statusCode, 204);

  const afterLogout = await app.inject({
    method: "GET",
    url: "/auth/me",
    cookies: {
      idp_session: sessionCookie.value,
    },
  });
  assert.strictEqual(afterLogout.statusCode, 401);

  await app.close();
});

test("returns 401 when session cookie is missing", async (t) => {
  const server = await startMockOAuthServer();
  t.after(async () => {
    await server.close();
  });

  const restoreEnv = withEnv({
    OUR_IDP_OAUTH_PROVIDER: "mock",
    OUR_IDP_OAUTH_AUTH_URL: `${server.baseUrl}/oauth/authorize`,
    OUR_IDP_OAUTH_TOKEN_URL: `${server.baseUrl}/oauth/token`,
    OUR_IDP_OAUTH_USERINFO_URL: `${server.baseUrl}/userinfo`,
    OUR_IDP_OAUTH_CLIENT_ID: "client-id",
    OUR_IDP_OAUTH_CLIENT_SECRET: "client-secret",
    OUR_IDP_OAUTH_REDIRECT_URL: "http://localhost/auth/callback",
  });
  t.after(restoreEnv);

  const app = createApp();
  await app.register(authRoutes);

  const me = await app.inject({ method: "GET", url: "/auth/me" });
  assert.strictEqual(me.statusCode, 401);

  await app.close();
});
