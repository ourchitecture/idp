---
sidebar_position: 6
---

# Auth Profile

The `auth-profile` contract validates that a Stemix IDP stack correctly exposes
its OAuth 2.0 authentication endpoints. It is opt-in because auth is
provider-dependent and not always enabled in every deployment.

## Why it exists

Auth is a first-class IDP capability, but it requires an active OAuth provider
(`OUR_IDP_OAUTH_PROVIDER != "none"`) to be meaningful. This profile enforces the
observable contract of the BFF auth surface — redirect behavior, unauthenticated
responses, session cookie creation, authenticated responses, and session cookie
cleanup — using the stateful mock OAuth round-trip.

## Who must pass it

Only stacks that declare both `"auth-profile"` in `contractProfiles` **and**
`capabilities.auth.enabled = true` in their `stack.json` are required to pass
this profile.

The profile is skipped automatically when either declaration is absent.

`provider=none` behavior is explicitly out of scope: these scenarios require a
configured OAuth provider.

## Layer 1 spec

Source: [`tests/features/auth-profile.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/auth-profile.feature)

## Scenarios (5 total)

### Me endpoint returns 401 when unauthenticated

**Precondition:** The BFF server is running with an OAuth provider configured.

**Assertions:**

- `GET /auth/me` without a session cookie returns HTTP 401

### Login endpoint initiates the OAuth flow

**Precondition:** The BFF server is running with an OAuth provider configured.

**Assertions:**

- `GET /auth/login` returns HTTP 302
- The `Location` header is present and non-empty
- The `Location` header points to the configured OAuth provider authorization URL
- The `Location` URL includes a `state` parameter (captured for the callback test)

### Callback endpoint completes the OAuth flow

**Precondition:** State was captured from the login redirect.

**Assertions:**

- `GET /auth/callback?code=<code>&state=<captured-state>` returns a status code in the 3xx range
- The response sets the `idp_session` cookie

### Me endpoint returns 200 with user JSON when authenticated

**Precondition:** Session cookie was captured from the callback response.

**Assertions:**

- `GET /auth/me` with the `idp_session` cookie returns HTTP 200
- The response body is JSON containing a `login` field

### Logout endpoint accepts requests and clears the session cookie

**Precondition:** The BFF server is running with an OAuth provider configured.

**Assertions:**

- `POST /auth/logout` returns HTTP 204
- If a `Set-Cookie` header is present, the `idp_session` cookie is expired
  (`Max-Age=0` or a past `Expires` date)

## Layer 2 harness

Source: [`tests/src/profiles/auth-profile.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/auth-profile.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative.

The harness runs the full mock OAuth round-trip in order:

1. `GET /auth/me` without a cookie — asserts 401.
2. `GET /auth/login` — asserts a 3xx redirect to the provider, captures the
   `state` parameter from the `Location` header.
3. `GET /auth/callback?code=mock-code&state=<captured>` — asserts a 3xx
   redirect, captures the `idp_session` cookie from `Set-Cookie`.
4. `GET /auth/me` with the session cookie — asserts 200 and JSON with a `login`
   field.
5. `POST /auth/logout` — asserts 204 and that the `idp_session` cookie is
   expired.

Because Node.js `http.request` does not follow redirects automatically, all 3xx
responses are received and asserted directly.

## Stack declarations

Stacks that expose OAuth auth endpoints must declare both the profile and the
capability flag in `stack.json`:

```jsonc
{
  "contractProfiles": ["core", "operational", "auth-profile"],
  "capabilities": {
    "auth": {
      "enabled": true
    }
  }
}
```

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `IDP_BFF_URL` | `http://localhost:8000` | Base URL for the BFF server |
| `OUR_IDP_OAUTH_PROVIDER` | `none` | OAuth provider (`mock` or `github`) |
| `OUR_IDP_OAUTH_AUTH_URL` | provider-specific | Optional explicit authorization URL override used by the login redirect assertion |
| `MOCK_OAUTH_PORT` | `9000` | Mock OAuth provider port when `OUR_IDP_OAUTH_PROVIDER=mock` |

## Running the profile

```sh
# Terminal 1 – start the mock OAuth service
cd tools/mock-oauth && ./mvnw spring-boot:run -q

# Terminal 2 – start the BFF with mock provider
OUR_IDP_OAUTH_PROVIDER=mock make -C stacks/go/net-http/rest run-bff

# Terminal 3 – run only the auth-profile contract tests
OUR_IDP_OAUTH_PROVIDER=mock \
IDP_BFF_URL=http://localhost:8000 \
IDP_STACK_PATH=stacks/go/net-http/rest \
IDP_CONTRACT_PROFILE=auth-profile \
npm run test:contract
```

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Core Profile](./core) — Baseline HTTP surface
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
