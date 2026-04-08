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
- `auth-profile`

This stack declares status capability and UI capability mode `spa`.
Rendered `ui-profile` checks use a local Chromium-family browser; set
`IDP_UI_BROWSER_PATH` if Chrome or Edge cannot be auto-detected on the current
machine.

## Auth Capability

Auth enables optional OAuth sign-in that matches the shared ADR-0013 /
`auth-profile` contract. Routes are registered only when
`OUR_IDP_OAUTH_PROVIDER` is set to `mock` or `github`; the default `none`
preserves existing behavior (no `/auth/*` endpoints). Sessions are kept
in-memory and issued via the `idp_session` HttpOnly cookie (SameSite=Lax,
Secure when `OUR_IDP_OAUTH_SECURE_COOKIE=true`).

Supported providers and environment:

- `OUR_IDP_OAUTH_PROVIDER` — `none` (default), `mock`, or `github`
- `OUR_IDP_OAUTH_CLIENT_ID` / `OUR_IDP_OAUTH_CLIENT_SECRET` — required when
  provider is `mock` or `github`
- `OUR_IDP_OAUTH_REDIRECT_URL` — required redirect URI for the OAuth app
- `OUR_IDP_OAUTH_AUTH_URL` / `OUR_IDP_OAUTH_TOKEN_URL` /
  `OUR_IDP_OAUTH_USERINFO_URL` — optional overrides; mock defaults to
  `http://127.0.0.1:${MOCK_OAUTH_PORT|9000}/oauth/{authorize,token}` and
  `/userinfo`
- `MOCK_OAUTH_PORT` — mock provider port (default `9000`)
- `OUR_IDP_OAUTH_SECURE_COOKIE` — set to `true` to add the Secure cookie flag

Local mock flow: start the mock OAuth server from `tools/mock-oauth` (or point
to another provider), then run the BFF with
`OUR_IDP_OAUTH_PROVIDER=mock OUR_IDP_OAUTH_CLIENT_ID=<id> OUR_IDP_OAUTH_CLIENT_SECRET=<secret> OUR_IDP_OAUTH_REDIRECT_URL=http://127.0.0.1:8400/auth/callback`.
The default contract checks skip `auth-profile`; include it by setting
`IDP_CONTRACT_PROFILES=auth-profile` and providing a running OAuth server.

## Commands

Moon (maintainer/CI canonical):

- `moon run nodejs-react-fastify-rest:all`
- `moon run nodejs-react-fastify-rest:check-ci`
- `moon run nodejs-react-fastify-rest:check-contract`
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
- `make -C stacks/nodejs/react-fastify/rest check-ci`
- `make -C stacks/nodejs/react-fastify/rest check`
- `make -C stacks/nodejs/react-fastify/rest test` (alias for `check-test`)
- `make -C stacks/nodejs/react-fastify/rest run-web`
- `make -C stacks/nodejs/react-fastify/rest run-bff`
- `make -C stacks/nodejs/react-fastify/rest test-contract` (alias for `check-contract`)

### Native Tooling Shortcuts

- `npm run typecheck:stack:react-fastify`
- `npm run test:stack:react-fastify`
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
