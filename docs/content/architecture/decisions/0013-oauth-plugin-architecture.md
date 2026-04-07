---
status: proposed
date: 2026-04-07
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# ADR-0013: Optional OAuth Plug-In Architecture

## Context and Problem Statement

The IDP BFF servers need to support authenticated users while remaining
deployable without any OAuth dependency. Different deployments require
different OAuth providers (local testing, GitHub, and future enterprise
IdPs), and contract testing requires a fully automated, provider-independent
path that does not depend on live external services.

How should the IDP architecture integrate OAuth authentication so that:

- The default deployment requires no auth configuration?
- Auth can be layered on through environment-driven provider selection?
- Contract tests can exercise the full OAuth round-trip without a browser or
  external service?
- New providers can be added without rewriting the core BFF logic?

### Gate Assessment

<!-- ADR intake threshold per AGENTS.md -->

- **Cross-cutting scope** — provider selection, session cookie strategy, auth
  routes, contract test profile (`auth-profile`), and future provider
  implementations are all affected.
- **Costly to reverse** — once session cookie names and auth route paths are
  published and consumed by front-end code and tests, changing them requires
  coordinated migration.
- **Contract surface** — defines the HTTP auth interface (`/auth/login`,
  `/auth/callback`, `/auth/logout`, `/auth/me`), the session cookie contract,
  and the opt-in conformance model (`auth-profile` vs. default profiles).
- **Multi-quarter longevity** — provider abstraction and session cookie
  conventions will be relevant for the lifetime of any auth-enabled IDP
  deployment.
- **Drift risk** — without a recorded model, future stacks may implement auth
  with incompatible routes, cookie names, or provider-selection conventions.

All five gates are true. Two are hard gates (costly to reverse, contract
surface). The intake threshold is met.

## Decision Drivers

- Auth must be opt-in so that the default IDP stack works without any OAuth
  configuration — no environment variable required, no routes registered
- The provider selection mechanism must be a single, well-known environment
  variable so that deployment environments can be switched without code changes
- Contract tests must be fully automated — no browser interaction, no external
  service dependency
- The auth contract must be testable against any compliant BFF implementation,
  not just the Go reference stack
- New OAuth providers must be addable without modifying route registration or
  session logic

## Considered Options

- Bundle a single fixed OAuth provider in the BFF (no plug-in model)
- Use an external OAuth library (e.g., `golang.org/x/oauth2`) for the
  reference implementation
- Implement auth as an optional plug-in selected by environment variable,
  using only Go standard library HTTP primitives

## Decision Outcome

Chosen option: "Implement auth as an optional plug-in selected by environment
variable, using only Go standard library HTTP primitives", because it keeps the
default BFF free of auth dependencies, avoids external library version drift,
and enables automated contract testing through a dedicated mock OAuth service
without requiring a browser.

### Provider Selection

Auth is enabled by setting `OUR_IDP_OAUTH_PROVIDER` to a recognized provider
name. When the variable is unset or set to `"none"`, no auth routes are
registered and the BFF behaves identically to a non-auth deployment.

| `OUR_IDP_OAUTH_PROVIDER` | Behavior |
| --- | --- |
| `none` (default, or unset) | No auth routes registered; BFF runs without OAuth |
| `mock` | Auth routes registered using the local mock OAuth service |
| `github` | Auth routes registered using the GitHub OAuth App flow |

The default is `none` for backward compatibility. All existing non-auth BFF
behavior is preserved exactly when `OUR_IDP_OAUTH_PROVIDER` is absent.

### Auth Routes (registered only when provider ≠ `none`)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/auth/login` | Redirect to provider authorization URL with CSRF state |
| `GET` | `/auth/callback` | Exchange code for token, fetch user profile, set session cookie |
| `POST` | `/auth/logout` | Clear session and expire session cookie |
| `GET` | `/auth/me` | Return authenticated user profile, or 401 |

### Session Cookie

| Property | Value |
| --- | --- |
| Name | `idp_session` |
| HttpOnly | `true` |
| SameSite | `Lax` |
| Secure | Controlled by `OUR_IDP_OAUTH_SECURE_COOKIE=true`; defaults to `false` for local HTTP |
| Path | `/` |

### Go Reference Implementation

The Go reference stack (`stacks/go/net-http/rest`) resolves provider
endpoints from environment variables rather than importing an external OAuth
library. This keeps the dependency graph minimal and makes endpoint URLs
fully overridable for testing.

Provider endpoint variables used by the `mock` provider:

| Variable | Default |
| --- | --- |
| `OUR_IDP_OAUTH_AUTH_URL` | `http://127.0.0.1:<MOCK_OAUTH_PORT>/oauth/authorize` |
| `OUR_IDP_OAUTH_TOKEN_URL` | `http://127.0.0.1:<MOCK_OAUTH_PORT>/oauth/token` |
| `OUR_IDP_OAUTH_USERINFO_URL` | `http://127.0.0.1:<MOCK_OAUTH_PORT>/userinfo` |
| `MOCK_OAUTH_PORT` | `9000` |

The `github` provider uses fixed GitHub API URLs and requires
`OUR_IDP_OAUTH_CLIENT_ID`, `OUR_IDP_OAUTH_CLIENT_SECRET`, and
`OUR_IDP_OAUTH_REDIRECT_URL`.

This is an implementation detail of the Go reference stack. Other stack
implementations are free to use their ecosystem's OAuth libraries as long as
they satisfy the auth-profile contract.

### Mock OAuth Service for Automated Testing

Automated contract testing of the auth flow requires a fully programmable
OAuth service that responds to the authorization code grant without a
browser. The IDP uses a dedicated mock OAuth service (`tools/mock-oauth`) —
a Spring Boot application that exists solely for test purposes and is never
deployed to any real environment.

The mock service exposes the minimal OAuth 2.0 authorization code endpoints:

| Path | Purpose |
| --- | --- |
| `GET /oauth/authorize` | Issues an authorization redirect with a predictable code |
| `POST /oauth/token` | Exchanges the code for a test access token |
| `GET /userinfo` | Returns a minimal test user profile |

Using a dedicated mock service (rather than stubbing the BFF internals)
verifies the actual HTTP round-trip — the same path exercised in real
deployments — while remaining fully deterministic and requiring no external
network access.

### `auth-profile` Conformance Profile

Auth contract testing is implemented as a distinct, opt-in conformance
profile (`auth-profile`) rather than an extension of the default `core` or
`operational` profiles.

A stack must explicitly declare both of the following in `stack.json` to
activate auth contract testing:

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

When either declaration is absent, the auth-profile scenarios are skipped
automatically. This ensures that stacks without auth support are not penalized
in CI.

### Consequences

- Good, because the default BFF requires no OAuth configuration and all
  existing behavior is fully preserved when `OUR_IDP_OAUTH_PROVIDER` is
  absent or `none`
- Good, because the mock OAuth service enables fully automated, browser-free
  contract testing of the complete OAuth round-trip
- Good, because provider-endpoint URLs are resolvable from environment
  variables, making the test harness portable across CI and local environments
- Good, because the opt-in `auth-profile` model means non-auth stacks never
  fail auth contract checks
- Good, because the Go reference stack avoids external OAuth library
  dependency drift by using only standard library HTTP primitives
- Bad, because each new provider requires an explicit implementation in the BFF
  — there is no generic OIDC auto-discovery in this MVP
- Bad, because the mock OAuth service requires Java 21, which is not managed
  by the repo's `proto` toolchain — contributors must install it separately
- Neutral, because the `github` provider path cannot be fully exercised by
  the automated contract test harness; browser-based or manual testing is
  required for real GitHub OAuth flows

### Confirmation

- `stacks/go/net-http/rest/bff/auth.go` implements provider selection via
  `OUR_IDP_OAUTH_PROVIDER` and registers routes only when provider ≠ `none`
- `tools/mock-oauth` provides the Spring Boot mock OAuth service used by
  automated auth contract tests
- `tests/features/auth-profile.feature` specifies the Layer 1 auth intent
- `tests/src/profiles/auth-profile.ts` implements the Layer 2 contract tests
  against the `auth-profile` conformance profile
- Auth-capable stacks declare `auth-profile` in `contractProfiles` and
  `capabilities.auth.enabled = true` in `stack.json`

## Pros and Cons of the Options

### Bundle a single fixed OAuth provider

- Good, because simplest initial implementation
- Bad, because all deployments inherit OAuth dependencies even when auth is
  not needed
- Bad, because switching providers requires code changes
- Bad, because contract tests cannot run without a specific provider

### Use an external OAuth library

- Good, because reduces boilerplate for token exchange and PKCE
- Good, because library handles edge cases (token refresh, error formats)
- Bad, because adds an external dependency that must be versioned and audited
- Bad, because library abstractions may not expose all endpoint URLs needed
  for test overrides
- Bad, because PKCE and advanced flows are out of scope for this MVP

### Optional plug-in selected by environment variable (chosen)

- Good, because default deployment is auth-free with no code or env changes
- Good, because a single `OUR_IDP_OAUTH_PROVIDER` variable controls the
  entire auth surface — no per-endpoint configuration required in the common
  case
- Good, because the mock provider enables fully automated testing without any
  browser or live external service
- Good, because endpoint URL overrides allow the same BFF binary to target
  different environments without recompilation
- Bad, because each new provider must be explicitly implemented in BFF code

## More Information

### Future Extension Path

This ADR covers the current MVP scope: `mock` and `github` providers, with
session-cookie-based state. Future work may include:

- General OIDC federation (Okta, Azure AD, Google) — requires provider
  auto-discovery from the OIDC well-known configuration endpoint
- Token-based stateless sessions (JWT) — replaces the in-process session store
- Multi-provider selection at runtime — requires a provider registry rather
  than a switch statement

These extensions are explicitly out of scope for this ADR. When they are
implemented, a follow-on ADR should be recorded if the changes are
cross-cutting and expensive to reverse.

### References

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [GitHub OAuth Apps documentation](https://docs.github.com/en/apps/oauth-apps)

### Related Decisions

- [0001](0001-intent-driven-architecture.md) — Layered intent/contract/implementation
  architecture
- [0003](0003-contract-harness-and-runtime-port-contract.md) — Contract harness
  mechanics and runtime port defaults
- [0005](0005-shared-capability-contract-and-conformance-profiles.md) — Profile-based
  conformance model (auth-profile is an opt-in profile)
- [0009](0009-intent-specification-format.md) — Gherkin as the Layer 1 intent
  specification format (auth intent is in `tests/features/auth-profile.feature`)
