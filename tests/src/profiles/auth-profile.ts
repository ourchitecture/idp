import { request, post } from "../http";
import { ensureServiceAvailable } from "../runtime";
import type { ContractContext, TestCase } from "../types";

function isAuthEnabled(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.auth?.enabled === true;
}

export function createAuthProfileTests(context: ContractContext): TestCase[] {
  if (!isAuthEnabled(context)) {
    return [];
  }

  const { bffBaseUrl } = context;

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
            !lowerCookie.includes("max-age=-1") &&
            !lowerCookie.includes("expires=thu, 01 jan 1970")
          ) {
            throw new Error(
              "POST /auth/logout must expire the idp_session cookie (MaxAge=-1 or past Expires)"
            );
          }
        }
      },
    },
  ];
}
