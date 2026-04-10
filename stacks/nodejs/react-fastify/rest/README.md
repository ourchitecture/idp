# Node.js React + Fastify (REST)

This stack is an additional React-focused reference implementation for
TypeScript-centric teams. It combines a Vite + React web portal with a Fastify
BFF.

## Components

- **Web**: React 19 + TypeScript + Vite + React Router + TanStack Query
- **BFF**: Fastify 5 + TypeScript + Zod validation

## Port Contract

- Web default: `3000` (`OUR_IDP_PORT` then `PORT` override)
- BFF default: `8000` (`OUR_IDP_API_PORT` override)

## Host Contract

- Web default host: `127.0.0.1` (override with `OUR_IDP_WEB_HOST`)
- BFF default host: `127.0.0.1` (override with `OUR_IDP_API_HOST`)

## Contract Profiles

- `core`
- `operational`
- `status-profile`
- `ui-profile`
- `auth-profile` (opt-in, requires OAuth provider configuration)

This stack declares status capability and UI capability mode `spa`.
Rendered `ui-profile` checks use a local Chromium-family browser; set
`IDP_UI_BROWSER_PATH` if Chrome or Edge cannot be auto-detected on the current
machine.

The `auth-profile` contract is opt-in and requires a configured OAuth provider
(see [Auth Capability](#auth-capability) below). Use the dedicated
`check-contract-auth` target to validate auth behavior locally.

## Auth Capability

The BFF implements the shared OAuth-based `auth-profile`. Auth routes are
registered only when `OUR_IDP_OAUTH_PROVIDER` is set to a supported provider.
The default (`none`) keeps auth disabled and preserves existing behaviour.

### Providers

- `none` (default): auth routes are not registered.
- `mock`: uses the local mock OAuth service (`tools/mock-oauth`, default port
  `9000`). Override endpoints with `OUR_IDP_OAUTH_AUTH_URL`,
  `OUR_IDP_OAUTH_TOKEN_URL`, and `OUR_IDP_OAUTH_USERINFO_URL` if needed; default
  base URL is `http://127.0.0.1:${OUR_IDP_OAUTH_MOCK_PORT:-9000}`.
- `github`: uses GitHub OAuth App endpoints.

### Required env vars

- `OUR_IDP_OAUTH_PROVIDER` — `none`, `mock`, or `github`
- `OUR_IDP_OAUTH_CLIENT_ID`
- `OUR_IDP_OAUTH_CLIENT_SECRET`
- `OUR_IDP_OAUTH_REDIRECT_URL` — e.g. `http://127.0.0.1:8000/auth/callback`

### Optional env vars

- `OUR_IDP_OAUTH_SECURE_COOKIE` — set to `true` to mark the `idp_session`
  cookie as `Secure` (use HTTPS when enabled).
- `OUR_IDP_SESSION_TTL_MINUTES` — session lifetime in minutes (default `60`);
  expired sessions are cleaned and return `401`.
- `OUR_IDP_OAUTH_MOCK_PORT` — default `9000`
- `OUR_IDP_OAUTH_AUTH_URL`, `OUR_IDP_OAUTH_TOKEN_URL`,
  `OUR_IDP_OAUTH_USERINFO_URL` — override mock endpoints when needed

### Routes and session contract

- `GET /auth/login` — starts the OAuth flow with a CSRF state and redirects to
  the provider.
- `GET /auth/callback` — validates state, exchanges the code, fetches user info,
  sets `idp_session` (`HttpOnly`, `SameSite=Lax`, optional `Secure`), and
  redirects to `/`.
- `POST /auth/logout` — clears the session and expires `idp_session`.
- `GET /auth/me` — returns session-backed user info or `401` when unauthenticated.

### Local auth validation

The stack provides a dedicated target to run the full auth-profile contract
validation, including the mock OAuth service:

```sh
# Run auth-profile validation (requires Java 21 for mock OAuth)
make -C stacks/nodejs/react-fastify/rest check-contract-auth

# Or with moon directly
moon run nodejs-react-fastify-rest:check-contract-auth
```

This target:

- Builds the mock OAuth JAR (requires Java 21)
- Starts the mock OAuth service on port 9000
- Starts the web and BFF servers with `OUR_IDP_OAUTH_PROVIDER=mock`
- Runs the auth-profile contract tests
- Cleans up all processes

See the [auth-profile documentation](../../../../docs/content/testing/profiles/auth-profile.md)
for more details on prerequisites, environment variables, and GitHub OAuth setup.

## Commands

Moon (maintainer/CI canonical):

- `moon run nodejs-react-fastify-rest:all`
- `moon run nodejs-react-fastify-rest:check-ci`
- `moon run nodejs-react-fastify-rest:check-contract`
- `moon run nodejs-react-fastify-rest:check-contract-auth` (opt-in auth validation)
- `moon run nodejs-react-fastify-rest:run-web`
- `moon run nodejs-react-fastify-rest:run-bff`

GNU Make (compatibility):

- `make -C stacks/nodejs/react-fastify/rest all`
- `make -C stacks/nodejs/react-fastify/rest install`
- `make -C stacks/nodejs/react-fastify/rest build`
- `make -C stacks/nodejs/react-fastify/rest clean`
- `make -C stacks/nodejs/react-fastify/rest check-lint`
- `make -C stacks/nodejs/react-fastify/rest check-test`
- `make -C stacks/nodejs/react-fastify/rest check-contract`
- `make -C stacks/nodejs/react-fastify/rest check-contract-auth` (opt-in auth validation)
- `make -C stacks/nodejs/react-fastify/rest check-ci`
- `make -C stacks/nodejs/react-fastify/rest check`
- `make -C stacks/nodejs/react-fastify/rest test` (alias for `check-test`)
- `make -C stacks/nodejs/react-fastify/rest run-web`
- `make -C stacks/nodejs/react-fastify/rest run-bff`
- `make -C stacks/nodejs/react-fastify/rest test-contract` (alias for `check-contract`)
- `make -C stacks/nodejs/react-fastify/rest check-java` (verify Java 21+ in PATH)
- `make -C stacks/nodejs/react-fastify/rest build-mock-oauth` (build mock OAuth JAR)

### Native Tooling Shortcuts

- `npm run typecheck:stack:react-fastify`
- `npm run build:web:react-fastify`
- `npm run start:web:react-fastify`
- `npm run start:bff:react-fastify`
- `npm run lint:md` (local markdownlint-cli2 -- run from this directory)

## Container Images

Container images are built from separate Dockerfiles for each component:

- `web/Dockerfile` -- nginx-based SPA with BFF proxy
- `bff/Dockerfile` -- Node.js Fastify server

### Prerequisites

- Docker (or compatible runtime such as Rancher Desktop with dockerd/moby)

### Build

```bash
make -C stacks/nodejs/react-fastify/rest build-container-web
make -C stacks/nodejs/react-fastify/rest build-container-bff
make -C stacks/nodejs/react-fastify/rest build-containers
```

### Run

```bash
docker run --rm -p 8400:8400 localhost/stemix-nodejs-react-fastify-rest-bff:latest
docker run --rm -p 3400:3400 -e BFF_URL=http://host.docker.internal:8400 localhost/stemix-nodejs-react-fastify-rest-web:latest
```

The web container uses nginx and proxies `/api/*` requests to the BFF via the
`BFF_URL` environment variable (required at container startup).

### Environment Variables

**Web (nginx)**:

- `BFF_URL` -- BFF backend URL for API proxy (required, example:
  `http://host.docker.internal:8400`)

**BFF (Fastify)**:

- `OUR_IDP_API_HOST` -- bind address (default `0.0.0.0`)
- `OUR_IDP_API_PORT` -- BFF port (default `8400`)
- `OUR_IDP_STATUS_WEB_URL` -- optional web base URL used by
  `/api/portal/summary` to include live IDP web health

### Published Images

- `ghcr.io/ourchitecture/idp/stemix-nodejs-react-fastify-rest-web`
- `ghcr.io/ourchitecture/idp/stemix-nodejs-react-fastify-rest-bff`
