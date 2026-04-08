import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { AuthorizationCode, type AuthorizationTokenConfig } from "simple-oauth2";
import {
  resolveOAuthProviderConfig,
  resolveOAuthProviderName,
  resolveSecureCookie,
  SESSION_COOKIE_NAME,
} from "../auth/config";
import { SessionStore, StateStore, type SessionUser } from "../auth/stores";

interface CallbackQuery {
  code?: string;
  state?: string;
}

interface OAuthClient {
  client: AuthorizationCode;
  redirectUrl: string;
  userinfoUrl: URL;
}

async function fetchUserInfo(userinfoUrl: URL, accessToken: string): Promise<SessionUser> {
  const response = await fetch(userinfoUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "idp-bff",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`userinfo responded with ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (typeof payload !== "object" || payload === null) {
    throw new Error("userinfo payload is not an object");
  }

  const record = payload as Record<string, unknown>;
  const login = record.login;
  if (typeof login !== "string" || login.length === 0) {
    throw new Error("userinfo payload missing login");
  }

  const user: SessionUser = { login };
  if (typeof record.id === "number") {
    user.id = record.id;
  }
  if (typeof record.name === "string" && record.name.length > 0) {
    user.name = record.name;
  }
  if (typeof record.email === "string" && record.email.length > 0) {
    user.email = record.email;
  }
  if (typeof record.avatar_url === "string" && record.avatar_url.length > 0) {
    user.avatar_url = record.avatar_url;
  }

  return user;
}

function buildOAuthClient(): OAuthClient | null {
  const provider = resolveOAuthProviderConfig();
  if (provider === null) {
    return null;
  }

  if (
    provider.authorizationUrl.length === 0 ||
    provider.tokenUrl.length === 0 ||
    provider.userinfoUrl.length === 0 ||
    provider.redirectUrl.length === 0 ||
    provider.clientId.length === 0 ||
    provider.clientSecret.length === 0
  ) {
    throw new Error(`OAuth provider configuration is incomplete for ${provider.name}`);
  }

  const authorizationUrl = new URL(provider.authorizationUrl);
  const tokenUrl = new URL(provider.tokenUrl);
  const userinfoUrl = new URL(provider.userinfoUrl);
  // Validate redirect URL format; the value is reused as-is in redirects.
  // eslint-disable-next-line no-new
  new URL(provider.redirectUrl);

  const client = new AuthorizationCode({
    client: {
      id: provider.clientId,
      secret: provider.clientSecret,
    },
    auth: {
      authorizeHost: authorizationUrl.origin,
      authorizePath: authorizationUrl.pathname + authorizationUrl.search,
      tokenHost: tokenUrl.origin,
      tokenPath: tokenUrl.pathname + tokenUrl.search,
    },
    options: {
      authorizationMethod: "body",
    },
  });

  return {
    client,
    redirectUrl: provider.redirectUrl,
    userinfoUrl,
  };
}

function unauthorized(reply: FastifyReply) {
  reply.code(401).send("unauthorized");
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const providerName = resolveOAuthProviderName();
  if (providerName === "none") {
    return;
  }

  let oauthClient: OAuthClient | null = null;
  try {
    oauthClient = buildOAuthClient();
  } catch (error) {
    app.log.error({
      msg: "Failed to initialize OAuth provider",
      error,
    });
    throw error;
  }

  if (oauthClient === null) {
    return;
  }

  await app.register(cookie);

  const stateStore = new StateStore();
  const sessionStore = new SessionStore();
  const secureCookie = resolveSecureCookie();

  app.get("/auth/login", async (_request, reply) => {
    const state = stateStore.create();
    const authorizationUrl = oauthClient.client.authorizeURL({
      redirect_uri: oauthClient.redirectUrl,
      state,
    });

    reply.redirect(authorizationUrl);
  });

  app.get<{
    Querystring: CallbackQuery;
  }>("/auth/callback", async (request, reply) => {
    const { code, state } = request.query;

    if (!stateStore.consume(state)) {
      reply.code(400).send("invalid state");
      return;
    }

    if (code === undefined || code.length === 0) {
      reply.code(400).send("missing code");
      return;
    }

    let accessToken: string;
    try {
      const tokenResponse = await oauthClient.client.getToken({
        code,
        redirect_uri: oauthClient.redirectUrl,
      } as AuthorizationTokenConfig);

      const token = tokenResponse?.token as Record<string, unknown>;
      const value = token?.access_token;
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("empty access token");
      }
      accessToken = value;
    } catch (error) {
      app.log.error({
        msg: "OAuth token exchange failed",
        error,
      });
      reply.code(502).send("token exchange failed");
      return;
    }

    let user: SessionUser;
    try {
      user = await fetchUserInfo(oauthClient.userinfoUrl, accessToken);
    } catch (error) {
      app.log.error({
        msg: "Failed to fetch user info",
        error,
      });
      reply.code(502).send("userinfo fetch failed");
      return;
    }

    const sessionId = sessionStore.create(user);

    reply
      .setCookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookie,
      })
      .redirect("/");
  });

  app.post("/auth/logout", async (request, reply) => {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    sessionStore.delete(sessionId);

    reply
      .setCookie(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookie,
        maxAge: 0,
        expires: new Date(0),
      })
      .code(204)
      .send();
  });

  app.get("/auth/me", async (request, reply) => {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    const user = sessionStore.get(sessionId);

    if (user === undefined) {
      unauthorized(reply);
      return;
    }

    reply.send(user);
  });
};
