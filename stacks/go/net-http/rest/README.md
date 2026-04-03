# Go net/http (REST)

This stack is the default and canonical reference implementation for the IDP
portal runtime. It uses the Go standard library `net/http` package for both the
web server and the BFF server.

## Components

- **Web**: Go `net/http` server for the web tier
- **BFF**: Go `net/http` server for REST endpoints

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

This stack declares status capability, but it does not declare UI capability
and does not run `ui-profile` tests.

## Auth Capability (BFF)

The BFF supports an optional OAuth plug-in selected by the
`OUR_IDP_OAUTH_PROVIDER` environment variable. When the variable is unset or
set to `none`, no auth routes are registered and the default server behavior is
fully preserved.

### Providers

| Value | Description |
| --- | --- |
| `none` | Default. No auth routes are registered. |
| `mock` | Connects to the local `tools/mock-oauth` service (port 9000 by default). Useful for local development and contract testing. |
| `github` | GitHub OAuth 2.0. Requires `OUR_IDP_OAUTH_CLIENT_ID`, `OUR_IDP_OAUTH_CLIENT_SECRET`, and `OUR_IDP_OAUTH_REDIRECT_URL`. |

### Routes (registered only when provider ≠ none)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/auth/login` | Redirects to the provider authorization URL with a CSRF state value. |
| `GET` | `/auth/callback` | Exchanges the authorization code, sets an `idp_session` cookie, and returns user JSON. |
| `POST` | `/auth/logout` | Clears the session and expires the cookie. Returns 204. |
| `GET` | `/auth/me` | Returns the user profile for the active session, or 401. |

### Auth Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `OUR_IDP_OAUTH_PROVIDER` | `none` | Provider name: `none`, `mock`, or `github`. |
| `OUR_IDP_OAUTH_CLIENT_ID` | _(empty)_ | OAuth client ID. |
| `OUR_IDP_OAUTH_CLIENT_SECRET` | _(empty)_ | OAuth client secret. |
| `OUR_IDP_OAUTH_REDIRECT_URL` | _(empty)_ | OAuth redirect/callback URL sent to the provider. |
| `OUR_IDP_OAUTH_AUTH_URL` | _(mock default)_ | Override the provider authorization URL (mock provider only). |
| `OUR_IDP_OAUTH_TOKEN_URL` | _(mock default)_ | Override the provider token URL (mock provider only). |
| `OUR_IDP_OAUTH_USERINFO_URL` | _(mock default)_ | Override the provider userinfo URL (mock provider only). |
| `MOCK_OAUTH_PORT` | `9000` | Port for the mock OAuth service (mock provider only). |
| `OUR_IDP_OAUTH_SECURE_COOKIE` | `false` | Set to `true` in HTTPS production deployments to enable the `Secure` cookie attribute. Leave `false` for local HTTP development. |

### Quick Start with Mock Provider

```bash
# Terminal 1 – start the mock OAuth service
cd tools/mock-oauth && ./mvnw spring-boot:run -q

# Terminal 2 – start the BFF with mock provider
OUR_IDP_OAUTH_PROVIDER=mock make -C stacks/go/net-http/rest run-bff

# Initiate login (follow the redirect to /oauth/authorize, then back to /auth/callback)
# Use a cookie jar so the session cookie is saved automatically.
curl -v -L -c /tmp/idp-cookies.txt http://127.0.0.1:8000/auth/login

# Check session using the saved cookie
curl -b /tmp/idp-cookies.txt http://127.0.0.1:8000/auth/me

# Logout
curl -X POST -b /tmp/idp-cookies.txt http://127.0.0.1:8000/auth/logout
```

## Platform Note

Default run targets build and execute stable binaries in `.bin/` to avoid
ephemeral executable paths and repeated trust prompts on Windows.

## Commands

Moon (maintainer/CI canonical):

- `moon run go-net-http-rest:all`
- `moon run go-net-http-rest:check-ci`
- `moon run go-net-http-rest:check-contract`
- `moon run go-net-http-rest:run-web`
- `moon run go-net-http-rest:run-bff`
- `moon run go-net-http-rest:setup-debug-tools`
- `moon run go-net-http-rest:build-debug-web`
- `moon run go-net-http-rest:build-debug-bff`

GNU Make (compatibility):

- `make -C stacks/go/net-http/rest all`
- `make -C stacks/go/net-http/rest install`
- `make -C stacks/go/net-http/rest build`
- `make -C stacks/go/net-http/rest clean`
- `make -C stacks/go/net-http/rest check-lint`
- `make -C stacks/go/net-http/rest check-test`
- `make -C stacks/go/net-http/rest check-contract`
- `make -C stacks/go/net-http/rest check-ci`
- `make -C stacks/go/net-http/rest check`
- `make -C stacks/go/net-http/rest test` (alias for `check-test`)
- `make -C stacks/go/net-http/rest run-web`
- `make -C stacks/go/net-http/rest run-bff`
- `make -C stacks/go/net-http/rest test-contract` (alias for `check-contract`)
- `make -C stacks/go/net-http/rest setup-debug-tools`
- `make -C stacks/go/net-http/rest build-debug-web`
- `make -C stacks/go/net-http/rest build-debug-bff`

### Native Tooling Shortcuts

- `go test ./...`
- `go vet ./...`
- `go build -o .bin/idp-go-web ./web`
- `go build -o .bin/idp-go-bff ./bff`

## Container Images

Container images are built from the `Dockerfile` at the stack root using a
`SERVICE` build arg to select `web` or `bff`.

### Prerequisites

- Docker (or compatible runtime such as Rancher Desktop with dockerd/moby)

### Build

```bash
make -C stacks/go/net-http/rest build-container-web
make -C stacks/go/net-http/rest build-container-bff
make -C stacks/go/net-http/rest build-containers
```

### Run

```bash
docker run --rm -p 3300:3300 localhost/stemix-go-net-http-rest-web:latest
docker run --rm -p 8300:8300 localhost/stemix-go-net-http-rest-bff:latest
```

### Environment Variables

Containers default to `0.0.0.0` host binding (overriding the native-dev
`127.0.0.1` loopback default per ADR-0006).

- `OUR_IDP_WEB_HOST` / `OUR_IDP_API_HOST` — bind address (default `0.0.0.0`)
- `OUR_IDP_PORT` — web port (default `3300`)
- `OUR_IDP_API_PORT` — BFF port (default `8300`)
- `OUR_IDP_STATUS_WEB_URL` — optional web base URL used by the BFF status API
  to include live IDP web health in `/api/portal/summary`
- `OUR_IDP_OAUTH_PROVIDER` — auth provider (`none`, `mock`, `github`; default `none`)
- `OUR_IDP_OAUTH_SECURE_COOKIE` — set `true` to enable the `Secure` cookie
  attribute when running behind HTTPS (default `false`)

### Published Images

- `ghcr.io/ourchitecture/idp/stemix-go-net-http-rest-web`
- `ghcr.io/ourchitecture/idp/stemix-go-net-http-rest-bff`
