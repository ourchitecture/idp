import { request, post } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

function isAuthEnabled(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.auth?.enabled === true;
}

function resolveExpectedAuthorizationUrl(): URL {
  const overrideUrl = process.env.OUR_IDP_OAUTH_AUTH_URL?.trim();
  if (overrideUrl !== undefined && overrideUrl.length > 0) {
    return new URL(overrideUrl);
  }

  const provider = process.env.OUR_IDP_OAUTH_PROVIDER?.trim().toLowerCase();
  if (provider === "mock") {
    const port = process.env.MOCK_OAUTH_PORT?.trim() || "9000";
    return new URL(`http://127.0.0.1:${port}/oauth/authorize`);
  }

  if (provider === "github") {
    return new URL("https://github.com/login/oauth/authorize");
  }

  throw new Error(
    "auth-profile requires OUR_IDP_OAUTH_PROVIDER to be set to 'mock' or 'github', or OUR_IDP_OAUTH_AUTH_URL to be provided"
  );
}

export function createAuthProfileTests(context: ContractContext): TestCase[] {
  if (!isAuthEnabled(context)) {
    return [];
  }

  const { bffBaseUrl } = context;
  const expectedAuthorizationUrl = resolveExpectedAuthorizationUrl();

  return [
    {
      name: "auth-profile:login endpoint initiates the OAuth flow",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        // Node.js http.request does not follow redirects automatically,
        // so the 3xx response is received directly.
        const response = await request(new URL("/auth/login", bffBaseUrl));

        if (response.status < 300 || response.status >= 400) {
          throw new Error(
            `Expected 3xx redirect from /auth/login, got ${response.status}`
          );
        }

        const location = response.headers["location"] ?? "";
        if (location.length === 0) {
          throw new Error(
            "Expected a non-empty Location header from /auth/login redirect"
          );
        }

        let redirectUrl: URL;
        try {
          redirectUrl = new URL(location);
        } catch {
          throw new Error(
            `Expected /auth/login to redirect to an absolute OAuth provider URL, got ${location}`
          );
        }

        if (
          redirectUrl.origin !== expectedAuthorizationUrl.origin ||
          redirectUrl.pathname !== expectedAuthorizationUrl.pathname
        ) {
          throw new Error(
            `Expected /auth/login redirect to point to ${expectedAuthorizationUrl.toString()}, got ${redirectUrl.toString()}`
          );
        }
      },
    },
    {
      name: "auth-profile:me endpoint returns 401 when unauthenticated",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await request(new URL("/auth/me", bffBaseUrl));

        if (response.status !== 401) {
          throw new Error(
            `Expected 401 from /auth/me without a session cookie, got ${response.status}`
          );
        }
      },
    },
    {
      name: "auth-profile:logout endpoint returns 204 and clears session cookie",
      run: async () => {
        await ensureServiceAvailable("BFF server", bffBaseUrl);
        const response = await post(new URL("/auth/logout", bffBaseUrl), {});

        if (response.status !== 204) {
          throw new Error(
            `Expected 204 from POST /auth/logout, got ${response.status}`
          );
        }

        const setCookie = response.headers["set-cookie"] ?? "";
        if (setCookie.length > 0) {
          const lowerCookie = setCookie.toLowerCase();
          if (
            lowerCookie.includes("idp_session") &&
            !lowerCookie.includes("max-age=0") &&
            !lowerCookie.includes("expires=thu, 01 jan 1970")
          ) {
            throw new Error(
              "POST /auth/logout must expire the idp_session cookie (Max-Age=0 or past Expires)"
            );
          }
        }
      },
    },
  ];
}
