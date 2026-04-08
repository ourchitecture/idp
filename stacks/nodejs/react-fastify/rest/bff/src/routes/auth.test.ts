import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "../app";
import type { SessionUser } from "../auth/stores";

function withEnv<T>(overrides: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const original = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    original.set(key, process.env[key]);
    process.env[key] = value;
  }

  return fn().finally(() => {
    for (const [key, value] of original.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

function parseSessionCookie(rawSetCookie: unknown): string {
  const header = Array.isArray(rawSetCookie) ? rawSetCookie[0] : rawSetCookie;
  if (typeof header !== "string") {
    return "";
  }
  return header.split(";")[0] ?? "";
}

async function startMockOAuthServer(userLogin = "alice") {
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/oauth/token")) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ access_token: "mock-token", token_type: "bearer" }));
      return;
    }
    if (req.url?.startsWith("/userinfo")) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ login: userLogin, email: `${userLogin}@example.com` }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Mock OAuth server failed to bind");
  }

  const baseUrl = `http://${address.address}:${address.port}`;
  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function buildAppWithAuth(mockBaseUrl: string) {
  const env = {
    OUR_IDP_OAUTH_PROVIDER: "mock",
    OUR_IDP_OAUTH_CLIENT_ID: "client-id",
    OUR_IDP_OAUTH_CLIENT_SECRET: "client-secret",
    OUR_IDP_OAUTH_REDIRECT_URL: "http://127.0.0.1:8400/auth/callback",
    OUR_IDP_OAUTH_AUTH_URL: `${mockBaseUrl}/oauth/authorize`,
    OUR_IDP_OAUTH_TOKEN_URL: `${mockBaseUrl}/oauth/token`,
    OUR_IDP_OAUTH_USERINFO_URL: `${mockBaseUrl}/userinfo`,
  };

  return withEnv(env, async () => {
    const app = await createApp();
    return app;
  });
}

test("auth routes are not registered when provider is none", async () => {
  await withEnv(
    {
      OUR_IDP_OAUTH_PROVIDER: "none",
    },
    async () => {
      const app = await createApp();
      const response = await app.inject({
        method: "GET",
        url: "/auth/login",
      });

      assert.equal(response.statusCode, 404);
      await app.close();
    }
  );
});

test("login redirects to provider and includes state", async () => {
  const mockOAuth = await startMockOAuthServer();

  try {
    const app = await buildAppWithAuth(mockOAuth.baseUrl);

    const response = await app.inject({
      method: "GET",
      url: "/auth/login",
    });

    assert.equal(response.statusCode, 302);
    const location = response.headers.location;
    assert.ok(typeof location === "string" && location.startsWith(mockOAuth.baseUrl));

    const redirectUrl = new URL(location ?? "");
    assert.ok(redirectUrl.searchParams.get("state"));
    assert.equal(redirectUrl.searchParams.get("redirect_uri"), "http://127.0.0.1:8400/auth/callback");

    await app.close();
  } finally {
    await mockOAuth.close();
  }
});

test("callback rejects missing or invalid state", async () => {
  const mockOAuth = await startMockOAuthServer();
  try {
    const app = await buildAppWithAuth(mockOAuth.baseUrl);

    const response = await app.inject({
      method: "GET",
      url: "/auth/callback?code=abc",
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  } finally {
    await mockOAuth.close();
  }
});

test("callback sets session cookie and me/logout behave as expected", async () => {
  const mockOAuth = await startMockOAuthServer("charlie");
  try {
    const app = await buildAppWithAuth(mockOAuth.baseUrl);

    const login = await app.inject({
      method: "GET",
      url: "/auth/login",
    });
    const redirectUrl = new URL(login.headers.location ?? "");
    const state = redirectUrl.searchParams.get("state");
    assert.ok(state);

    const callback = await app.inject({
      method: "GET",
      url: `/auth/callback?code=test-code&state=${state}`,
    });

    assert.equal(callback.statusCode, 302);
    const sessionCookie = parseSessionCookie(callback.headers["set-cookie"]);
    assert.ok(sessionCookie.startsWith("idp_session="));

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(me.statusCode, 200);
    const user = await me.json<SessionUser>();
    assert.equal(user.login, "charlie");

    const logout = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: {
        cookie: sessionCookie,
      },
    });
    assert.equal(logout.statusCode, 204);
    const logoutCookie = parseSessionCookie(logout.headers["set-cookie"]);
    assert.ok(logoutCookie.startsWith("idp_session="));
    const logoutHeader = Array.isArray(logout.headers["set-cookie"])
      ? logout.headers["set-cookie"].join(";")
      : logout.headers["set-cookie"] ?? "";
    assert.ok(logoutHeader.toLowerCase().includes("max-age=0"));

    const meAfterLogout = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        cookie: sessionCookie,
      },
    });
    assert.equal(meAfterLogout.statusCode, 401);

    await app.close();
  } finally {
    await mockOAuth.close();
  }
});
