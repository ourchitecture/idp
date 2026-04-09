export type OAuthProviderName = "none" | "mock" | "github";

export interface OAuthProviderConfig {
  provider: Exclude<OAuthProviderName, "none">;
  authURL: string;
  tokenURL: string;
  userinfoURL: string;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function resolveOAuthProviderName(env = process.env): OAuthProviderName {
  const raw = normalize(env.OUR_IDP_OAUTH_PROVIDER);
  if (raw === "") {
    return "none";
  }

  const normalized = raw.toLowerCase();
  if (normalized === "mock" || normalized === "github") {
    return normalized;
  }

  return "none";
}

export function resolveSecureCookie(env = process.env): boolean {
  return normalize(env.OUR_IDP_OAUTH_SECURE_COOKIE).toLowerCase() === "true";
}

export function buildMockOAuthConfig(env = process.env): OAuthProviderConfig {
  const port = normalize(env.OUR_IDP_OAUTH_MOCK_PORT) || "9000";
  const base = `http://127.0.0.1:${port}`;
  const defaultRedirect = "http://127.0.0.1:8400/auth/callback";

  return {
    provider: "mock",
    authURL: normalize(env.OUR_IDP_OAUTH_AUTH_URL) || `${base}/oauth/authorize`,
    tokenURL: normalize(env.OUR_IDP_OAUTH_TOKEN_URL) || `${base}/oauth/token`,
    userinfoURL: normalize(env.OUR_IDP_OAUTH_USERINFO_URL) || `${base}/userinfo`,
    clientID: normalize(env.OUR_IDP_OAUTH_CLIENT_ID) || "mock-client-id",
    clientSecret: normalize(env.OUR_IDP_OAUTH_CLIENT_SECRET) || "mock-client-secret",
    redirectURL: normalize(env.OUR_IDP_OAUTH_REDIRECT_URL) || defaultRedirect,
  };
}

export function buildGitHubOAuthConfig(env = process.env): OAuthProviderConfig {
  return {
    provider: "github",
    authURL: "https://github.com/login/oauth/authorize",
    tokenURL: "https://github.com/login/oauth/access_token",
    userinfoURL: "https://api.github.com/user",
    clientID: normalize(env.OUR_IDP_OAUTH_CLIENT_ID),
    clientSecret: normalize(env.OUR_IDP_OAUTH_CLIENT_SECRET),
    redirectURL: normalize(env.OUR_IDP_OAUTH_REDIRECT_URL),
  };
}

export function buildProviderConfig(
  providerName: OAuthProviderName,
  env = process.env,
): OAuthProviderConfig | null {
  switch (providerName) {
    case "mock":
      return buildMockOAuthConfig(env);
    case "github":
      return buildGitHubOAuthConfig(env);
    default:
      return null;
  }
}
