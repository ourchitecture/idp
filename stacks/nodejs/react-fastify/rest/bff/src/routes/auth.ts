import cookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";
import { AuthorizationCode } from "simple-oauth2";
import {
  buildProviderConfig,
  resolveOAuthProviderName,
  resolveSecureCookie,
  type OAuthProviderConfig,
} from "../auth/config";
import { SessionStore, StateStore, type UserInfo } from "../auth/store";

const SESSION_COOKIE_NAME = "idp_session";
const USERINFO_TIMEOUT_MS = 10_000;

const states = new StateStore();
const sessions = new SessionStore();

function isConfigComplete(config: OAuthProviderConfig): boolean {
  return config.clientID !== "" && config.clientSecret !== "" && config.redirectURL !== "";
}

function createOAuthClient(config: OAuthProviderConfig): AuthorizationCode | null {
  try {
    const authURL = new URL(config.authURL);
    const tokenURL = new URL(config.tokenURL);

    return new AuthorizationCode({
      client: {
        id: config.clientID,
        secret: config.clientSecret,
      },
      auth: {
        authorizeHost: authURL.origin,
        authorizePath: authURL.pathname,
        tokenHost: tokenURL.origin,
        tokenPath: tokenURL.pathname,
      },
      http: {
        headers: {
          accept: "application/json",
        },
      },
    });
  } catch (error) {
    return null;
  }
}

async function fetchUserInfo(userinfoURL: string, accessToken: string): Promise<UserInfo> {
  const response = await fetch(userinfoURL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(USERINFO_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`userinfo returned ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as Partial<UserInfo>;
  if (payload.login === undefined) {
    throw new Error("userinfo payload missing login");
  }

  return {
    login: payload.login,
    id: payload.id,
    name: payload.name,
    email: payload.email,
    avatar_url: payload.avatar_url,
  };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const providerName = resolveOAuthProviderName();
  const config = buildProviderConfig(providerName);
  if (config === null) {
    return;
  }

  if (!isConfigComplete(config)) {
    app.log.warn(
      {
        provider: providerName,
      },
      "Auth provider missing required configuration; skipping auth route registration.",
    );
    return;
  }

  const oauthClient = createOAuthClient(config);
  if (oauthClient === null) {
    app.log.error({ provider: providerName }, "Failed to construct OAuth client; skipping auth routes.");
    return;
  }

  const secureCookie = resolveSecureCookie();

  await app.register(cookie);

  app.get("/auth/login", async (_request, reply) => {
    const state = states.create();
    const authorizeURL = oauthClient.authorizeURL({
      state,
      redirect_uri: config.redirectURL,
    });

    reply.redirect(authorizeURL);
  });

  app.get("/auth/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string };

    if (!states.consume(query.state)) {
      return reply.status(400).send({ error: "invalid or missing state" });
    }

    if (query.code === undefined || query.code === "") {
      return reply.status(400).send({ error: "missing code" });
    }

    let accessToken: string | undefined;
    try {
      const tokenResponse = await oauthClient.getToken({
        code: query.code,
        redirect_uri: config.redirectURL,
      });

      const rawToken = tokenResponse?.token as { access_token?: string } | undefined;
      accessToken = rawToken?.access_token;
    } catch (error) {
      request.log.error({ err: error }, "Token exchange failed");
      return reply.status(502).send({ error: "token exchange failed" });
    }

    if (accessToken === undefined || accessToken === "") {
      return reply.status(502).send({ error: "token exchange returned empty token" });
    }

    let user: UserInfo;
    try {
      user = await fetchUserInfo(config.userinfoURL, accessToken);
    } catch (error) {
      request.log.error({ err: error }, "Failed to fetch user info");
      return reply.status(502).send({ error: "failed to fetch user info" });
    }

    const sessionId = sessions.create(user);
    reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: secureCookie,
    });

    reply.redirect("/");
  });

  app.post("/auth/logout", async (request, reply) => {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    sessions.delete(sessionId);

    reply.setCookie(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: secureCookie,
      maxAge: 0,
    });

    reply.status(204).send();
  });

  app.get("/auth/me", async (request, reply) => {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    const user = sessions.get(sessionId);
    if (user === undefined) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    return user;
  });
};

export function resetAuthStores(): void {
  states.clear();
  sessions.clear();
}
