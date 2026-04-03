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
responses, and session cookie cleanup — without requiring a live OAuth round-trip.

## Who must pass it

Only stacks that declare both `"auth-profile"` in `contractProfiles` **and**
`capabilities.auth.enabled = true` in their `stack.json` are required to pass
this profile.

The profile is skipped automatically when either declaration is absent.

`provider=none` behavior is explicitly out of scope: these scenarios require a
configured OAuth provider.

## Layer 1 spec

Source: [`tests/features/auth-profile.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/auth-profile.feature)

## Scenarios (3 total)

### Login endpoint initiates the OAuth flow

**Precondition:** The BFF server is running with an OAuth provider configured.

**Assertions:**

- `GET /auth/login` returns an HTTP status code in the 3xx range
- The `Location` header is present and non-empty
- The `Location` header points to the configured OAuth provider authorization URL

### Me endpoint returns 401 when unauthenticated

**Precondition:** The BFF server is running with an OAuth provider configured.

**Assertions:**

- `GET /auth/me` without a session cookie returns HTTP 401

### Logout endpoint accepts requests and clears the session cookie

**Precondition:** The BFF server is running with an OAuth provider configured.

**Assertions:**

- `POST /auth/logout` returns HTTP 204
- If a `Set-Cookie` header is present, the `idp_session` cookie is expired
  (`Max-Age=-1` or a past `Expires` date)

## Layer 2 harness

Source: [`tests/src/profiles/auth-profile.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/auth-profile.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative.

The harness uses the zero-dependency HTTP client already present in the contract
test runner. Because Node.js `http.request` does not follow redirects
automatically, the 3xx response from `/auth/login` is received and asserted
directly.

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

| Variable                 | Default                 | Description                          |
| ------------------------ | ----------------------- | ------------------------------------ |
| `IDP_BFF_URL`            | `http://localhost:8000` | Base URL for the BFF server          |
| `OUR_IDP_OAUTH_PROVIDER` | `none`                  | OAuth provider (`mock` or `github`)  |

## Running the profile

```sh
# Start the BFF with a mock OAuth provider, then run contract tests:
OUR_IDP_OAUTH_PROVIDER=mock \
IDP_BFF_URL=http://localhost:8000 \
IDP_STACK_PATH=stacks/go/net-http/rest \
npm run test:contract
```

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Core Profile](./core) — Baseline HTTP surface
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
