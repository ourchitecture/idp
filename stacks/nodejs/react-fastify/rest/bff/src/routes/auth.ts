import cookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";
import { Issuer, type Client, type UserinfoResponse } from "openid-client";
import {
  buildProviderConfig,
  resolveOAuthProviderName,
  resolveSecureCookie,
  type OAuthProviderConfig,
} from "../auth/config";
import {
  SessionStore,
  StateStore,
  resolveSessionTTLMinutes,
  type UserInfo,
} from "../auth/store";

const SESSION_COOKIE_NAME = "idp_session";

const states = new StateStore();

type SessionStoreOptions = {
  sessionTtlMinutes?: number;
  now?: () => number;
};

function createSessionStore(options?: SessionStoreOptions): SessionStore {
  const ttlMinutes = options?.sessionTtlMinutes ?? resolveSessionTTLMinutes();
  const now = options?.now ?? Date.now;
  return new SessionStore(ttlMinutes, now);
}

let sessions = createSessionStore();

function isConfigComplete(config: OAuthProviderConfig): boolean {
  return config.clientID !== "" && config.clientSecret !== "" && config.redirectURL !== "";
}

function buildOAuthClient(config: OAuthProviderConfig): Client | null {
  try {
    const authUrl = new URL(config.authURL);
    const issuer = new Issuer({
      issuer: authUrl.origin,
      authorization_endpoint: config.authURL,
      token_endpoint: config.tokenURL,
      userinfo_endpoint: config.userinfoURL,
    });

    return new issuer.Client({
      client_id: config.clientID,
      client_secret: config.clientSecret,
      redirect_uris: [config.redirectURL],
      response_types: ["code"],
    });
  } catch {
    return null;
  }
}

function normalizeUserInfo(payload: UserinfoResponse): UserInfo {
  const login = (payload as Record<string, string | undefined>).login;
  if (login === undefined || login === "") {
    throw new Error("userinfo payload missing login");
  }

  return {
    login,
    id: (payload as Record<string, number | undefined>).id,
    name: (payload as Record<string, string | undefined>).name,
    email: (payload as Record<string, string | undefined>).email,
    avatar_url: (payload as Record<string, string | undefined>).avatar_url,
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

  const client = buildOAuthClient(config);
  if (client === null) {
    app.log.error({ provider: providerName }, "Failed to construct OAuth client; skipping auth routes.");
    return;
  }
  const secureCookie = resolveSecureCookie();

  await app.register(cookie);

  app.get("/auth/login", async (request, reply) => {
    const state = states.create();
    const uri = client.authorizationUrl({
      state,
      redirect_uri: config.redirectURL,
    });
    reply.redirect(uri);
  });

  app.get("/auth/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string };

    if (!states.consume(query.state)) {
      return reply.status(400).send({ error: "invalid or missing state" });
    }
    if (!query.code) {
      return reply.status(400).send({ error: "missing code" });
    }

    let accessToken: string | undefined;
    try {
      const tokenSet = await client.oauthCallback(config.redirectURL, query, { state: query.state });
      accessToken = tokenSet.access_token ?? undefined;
    } catch (error) {
      request.log.error({ err: error }, "Token exchange failed");
      return reply.status(502).send({ error: "token exchange failed" });
    }

    if (accessToken === undefined || accessToken === "") {
      return reply.status(502).send({ error: "token exchange returned empty token" });
    }

    let user: UserInfo;
    try {
      const userInfo = await client.userinfo(accessToken);
      user = normalizeUserInfo(userInfo);
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

export function resetAuthStores(options?: SessionStoreOptions): void {
  states.clear();
  sessions.stop();
  sessions = createSessionStore(options);
}
