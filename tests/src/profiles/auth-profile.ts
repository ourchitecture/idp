import { request, post } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

function isAuthEnabled(context: ContractContext): boolean {
  if (context.stackMetadata?.capabilities?.auth?.enabled !== true) {
    return false;
  }

  const provider = process.env.OUR_IDP_OAUTH_PROVIDER?.trim().toLowerCase();
  if (provider === undefined || provider === "" || provider === "none") {
    return false;
  }

  if (provider === "mock" || provider === "github") {
    const clientId = process.env.OUR_IDP_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.OUR_IDP_OAUTH_CLIENT_SECRET?.trim();
    const redirectUrl = process.env.OUR_IDP_OAUTH_REDIRECT_URL?.trim();
    if (!clientId || !clientSecret || !redirectUrl) {
      return false;
    }
  }

  return true;
}

function resolveExpectedAuthorizationUrl(): URL {
  const overrideUrl = process.env.OUR_IDP_OAUTH_AUTH_URL?.trim();
  if (overrideUrl !== undefined && overrideUrl.length > 0) {
    return new URL(overrideUrl);
  }

  const provider = process.env.OUR_IDP_OAUTH_PROVIDER?.trim().toLowerCase();
  if (provider === "mock") {
    const port = process.env.OUR_IDP_OAUTH_MOCK_PORT?.trim() || "9000";
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

  // Shared state captured across sequential tests.
  let capturedState = "";
  let capturedSessionCookie = "";

  return [
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

        const state = redirectUrl.searchParams.get("state");
        if (!state) {
          throw new Error(
            "Expected a state parameter in the /auth/login redirect URL"
          );
        }
        capturedState = state;
      },
    },
    {
      name: "auth-profile:callback endpoint completes the OAuth flow",
      run: async () => {
        if (!capturedState) {
          throw new Error(
            "auth-profile:callback requires state captured from the login test"
          );
        }

        const callbackUrl = new URL("/auth/callback", bffBaseUrl);
        callbackUrl.searchParams.set("code", "mock-code");
        callbackUrl.searchParams.set("state", capturedState);

        const response = await request(callbackUrl);

        if (response.status < 300 || response.status >= 400) {
          throw new Error(
            `Expected 3xx redirect from /auth/callback, got ${response.status}`
          );
        }

        const setCookie = response.headers["set-cookie"] ?? "";
        const match = /idp_session=([^;,\s]+)/i.exec(setCookie);
        if (!match) {
          throw new Error(
            "Expected idp_session cookie to be set by /auth/callback"
          );
        }
        capturedSessionCookie = `idp_session=${match[1]}`;
      },
    },
    {
      name: "auth-profile:me endpoint returns 200 with user JSON when authenticated",
      run: async () => {
        if (!capturedSessionCookie) {
          throw new Error(
            "auth-profile:me authenticated requires session cookie captured from the callback test"
          );
        }

        const response = await request(new URL("/auth/me", bffBaseUrl), {
          Cookie: capturedSessionCookie,
        });

        if (response.status !== 200) {
          throw new Error(
            `Expected 200 from /auth/me with a session cookie, got ${response.status}`
          );
        }

        let body: unknown;
        try {
          body = JSON.parse(response.body);
        } catch {
          throw new Error("Expected JSON body from /auth/me with session");
        }

        if (
          typeof body !== "object" ||
          body === null ||
          !("login" in body) ||
          typeof (body as Record<string, unknown>).login !== "string"
        ) {
          throw new Error(
            "Expected /auth/me response body to be JSON containing a login field"
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
