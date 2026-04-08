export const SESSION_COOKIE_NAME = "idp_session";
export const OAUTH_STATE_MAX_AGE_MS = 15 * 60 * 1000;

export type OAuthProviderName = "mock" | "github";

export interface OAuthProviderConfig {
  name: OAuthProviderName;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseAbsoluteUrl(value: string | undefined): string | null {
  const trimmed = normalize(value);
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!url.protocol || !url.host) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveOAuthProviderName(): OAuthProviderName | "none" | "unknown" {
  const provider = normalize(process.env.OUR_IDP_OAUTH_PROVIDER).toLowerCase();
  if (provider.length === 0 || provider === "none") {
    return "none";
  }
  if (provider === "mock" || provider === "github") {
    return provider;
  }
  return "unknown";
}

function buildMockOAuthConfig(): OAuthProviderConfig {
  const port = normalize(process.env.MOCK_OAUTH_PORT) || "9000";
  const baseUrl = `http://127.0.0.1:${port}`;

  const authorizationUrl =
    parseAbsoluteUrl(process.env.OUR_IDP_OAUTH_AUTH_URL) ?? `${baseUrl}/oauth/authorize`;
  const tokenUrl =
    parseAbsoluteUrl(process.env.OUR_IDP_OAUTH_TOKEN_URL) ?? `${baseUrl}/oauth/token`;
  const userinfoUrl =
    parseAbsoluteUrl(process.env.OUR_IDP_OAUTH_USERINFO_URL) ?? `${baseUrl}/userinfo`;

  return {
    name: "mock",
    authorizationUrl,
    tokenUrl,
    userinfoUrl,
    clientId: normalize(process.env.OUR_IDP_OAUTH_CLIENT_ID),
    clientSecret: normalize(process.env.OUR_IDP_OAUTH_CLIENT_SECRET),
    redirectUrl: normalize(process.env.OUR_IDP_OAUTH_REDIRECT_URL),
  };
}

function buildGitHubOAuthConfig(): OAuthProviderConfig {
  return {
    name: "github",
    authorizationUrl:
      parseAbsoluteUrl(process.env.OUR_IDP_OAUTH_AUTH_URL) ??
      "https://github.com/login/oauth/authorize",
    tokenUrl:
      parseAbsoluteUrl(process.env.OUR_IDP_OAUTH_TOKEN_URL) ??
      "https://github.com/login/oauth/access_token",
    userinfoUrl:
      parseAbsoluteUrl(process.env.OUR_IDP_OAUTH_USERINFO_URL) ?? "https://api.github.com/user",
    clientId: normalize(process.env.OUR_IDP_OAUTH_CLIENT_ID),
    clientSecret: normalize(process.env.OUR_IDP_OAUTH_CLIENT_SECRET),
    redirectUrl: normalize(process.env.OUR_IDP_OAUTH_REDIRECT_URL),
  };
}

export function resolveOAuthProviderConfig(): OAuthProviderConfig | null {
  const providerName = resolveOAuthProviderName();
  switch (providerName) {
    case "mock":
      return buildMockOAuthConfig();
    case "github":
      return buildGitHubOAuthConfig();
    default:
      return null;
  }
}

export function resolveSecureCookie(): boolean {
  return normalize(process.env.OUR_IDP_OAUTH_SECURE_COOKIE).toLowerCase() === "true";
}
