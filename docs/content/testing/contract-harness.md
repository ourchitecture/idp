# Contract Test Harness

Stemix IDP uses a **contract test harness** to prove that any reference
implementation behaves correctly — regardless of which language or framework it
is built with. This document explains what the harness is, why it exists, how
to run it, and how to build a new implementation that passes it.

---

## Why this exists

Stemix IDP is designed to support multiple reference implementations across
different languages and frameworks. A Go implementation, a Node.js/React
implementation, and any future implementation must all behave identically from
the outside, even though their internals are completely different.

The contract test harness is the enforcement mechanism for that guarantee. It
makes HTTP requests to a running implementation and asserts that the responses
match the published contract. Any implementation that passes all applicable
tests is considered compliant. No implementation internals are imported or
inspected.

This is Layer 2 of the three-layer architecture defined in
[ADR-0001](../architecture/decisions/intent-driven-architecture):

- **Layer 1 — Intent Specifications**: what the platform must do (declarative,
  technology-agnostic Gherkin `.feature` files in `tests/features/`; see
  [ADR-0009](../architecture/decisions/intent-specification-format))
- **Layer 2 — Contract Tests**: proof that an implementation satisfies those
  intents (this harness)
- **Layer 3 — Implementations**: the actual stacks in `stacks/`

---

## Quick start for newcomers

The fastest way to see the harness in action:

```bash
# 1. Install pinned toolchain (Go, Node.js/npm, Python, uv)
proto install

# 2. Install Node.js dependencies
npm install

# 3. Start the default stack (Go web + BFF servers)
make dev

# 4. In a second terminal, run the contract tests
make test
```

> Note: Weekly onboarding checks exercise these commands on GitHub-hosted runners for Linux, macOS, and Windows. Windows runners cannot run Linux containers (for example `rhysd/actionlint`) because Docker is locked to Windows-container mode there; local Windows setups with WSL + Rancher/Podman Desktop can run the Linux container path, but that environment cannot be reproduced in hosted runners.

If everything is working you will see structured JSON log lines for each test,
followed by a summary. Passing tests emit `"msg": "contract test passed"`;
failing tests emit `"msg": "contract test failed"` with an `error` field.

If the servers are not running, the harness prints startup instructions and
exits with a non-zero code:

```text
Unable to reach web server at http://localhost:3000.
Error: connect ECONNREFUSED 127.0.0.1:3000
Start a technology stack and re-run the contract tests:
  Option 1: make dev
  Option 2:
    make -C stacks/go/net-http/rest run-web
    make -C stacks/go/net-http/rest run-bff
```

---

## Harness location and design

```text
tests/
├── README.md          Quick reference (env vars, run commands)
├── moon.yml           Moon task definitions
├── tsconfig.json      TypeScript configuration
├── features/          Layer 1 intent specifications (Gherkin .feature files)
│   ├── core.feature
│   ├── auth-profile.feature
│   ├── operational.feature
│   ├── status-profile.feature
│   └── ui-profile.feature
└── src/
    ├── index.ts       Entry point and test runner
    ├── types.ts       Shared types (ProfileName, TestCase, StackMetadata, …)
    ├── http.ts        Zero-dependency Node.js HTTP client
    ├── assertions.ts  assert() and parseJsonOrThrow() helpers
    ├── browser.ts     Headless Chromium helper for rendered UI checks
    ├── runtime.ts     URL resolution, stack.json loading, profile selection
    └── profiles/
        ├── index.ts          Routes a profile name to its test factory
        ├── core.ts           5 baseline tests
        ├── auth-profile.ts   5 OAuth auth tests
        ├── operational.ts    5 runtime/semantic tests
        ├── status-profile.ts 3 API-first status tests
        └── ui-profile.ts     5 UI capability tests
```

**Key design choices:**

- No external test framework. The runner is a plain `async main()` loop. Each
  test is `{ name: string; run: () => Promise<void> }`. Failures throw errors.
- All output is newline-delimited JSON (structured logging), making it easy to
  parse in CI pipelines.
- The harness never imports implementation code. Compliance is validated
  entirely through HTTP.
- Node.js 18+ is required for the harness runtime. Rendered `ui-profile` checks
  additionally require a local Chromium-family browser such as Chrome or Edge.

---

## Conformance profiles

Tests are grouped into **conformance profiles**. Each profile covers a distinct
area of expected behavior. Stacks declare which profiles they support in their
`stack.json` metadata file.

### `core` — baseline behavior (5 tests)

Required by every implementation. Validates that the fundamental HTTP surface
is present and shaped correctly. Health and readiness endpoints follow the
[IETF Health Check Response Format](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06)
([ADR-0011](../architecture/decisions/ietf-health-endpoint-contract)).

| Test | What is checked |
| --- | --- |
| `core:web responds to GET /` | Web server is reachable; responds with a 2xx status |
| `core:web health endpoint returns the expected shape` | `GET /health` returns 2xx `application/health+json` with `status`, `serviceId`, and `description` |
| `core:bff root returns JSON status` | BFF `/` returns `application/json` with `status` and `service` fields |
| `core:bff health endpoint returns expected shape` | `GET /health` returns 2xx `application/health+json` with `status`, `serviceId`, and `description` |
| `core:bff readiness endpoint returns expected shape` | `GET /readiness` returns 2xx `application/health+json` with `status` and `checks` |

### `operational` — runtime and semantic stability (5 tests)

Required for all supported Tier 1 stacks. Validates that runtime conventions
are honored and that response payloads carry the correct semantic values, not
just the correct shape. All health-related assertions conform to
[IETF `draft-inadarei-api-health-check-06`](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06)
([ADR-0011](../architecture/decisions/ietf-health-endpoint-contract)).

| Test | What is checked |
| --- | --- |
| `operational:web honors override-aware runtime port contract` | Web server is reachable on the configured port (validates the env-var override chain) |
| `operational:web health payload semantics are stable` | `status` is `"pass"`; `serviceId` is exactly `"idp-web"`; `description` is exactly `"IDP Web Server"` |
| `operational:bff health payload semantics are stable` | `status` is one of `"pass"`, `"fail"`, or `"warn"`; `serviceId` is exactly `"idp-bff"`; `description` is exactly `"IDP BFF Server"` |
| `operational:bff health checks sub-components use IETF format` | `checks` is an object; each key uses `componentName:measurementName` format; each entry has `status`, `componentType`, and `time` (ISO-8601) |
| `operational:bff readiness contract semantics are stable` | `status` is `"pass"` or `"fail"`; `checks` is a non-empty object |

### `ui-profile` — UI capability checks (5 tests)

Optional. Only runs when the stack declares `capabilities.ui.enabled: true` in
`stack.json`. Validates externally observable UI behavior without asserting
framework internals (no React/Vue/Next-specific checks).

| Test | What is checked |
| --- | --- |
| `ui-profile:web root returns HTML document shell` | `GET /` returns `text/html` with `<html` in the body |
| `ui-profile:web document shell includes a title` | `GET /` body contains a `<title` tag |
| `ui-profile:web root renders live portal summary content` | rendered `GET /` includes the status summary cards and a live component label |
| `ui-profile:status route renders detailed portal summary content` | rendered `GET /status` includes the detailed status view and publication guidance |
| `ui-profile:web mode declaration is valid (<mode>)` | Declared `ui.mode` is one of `spa`, `ssr`, or `server-rendered` |

### `status-profile` — API-first IDP status checks (3 tests)

Optional. Only runs when the stack declares `capabilities.status.enabled: true`
in `stack.json`. It validates the shared `GET /api/portal/summary` contract
that feeds the portal home page, dedicated status route, MCP
`get_portal_summary` tool, and static status publisher.

| Test | What is checked |
| --- | --- |
| `status-profile:bff portal summary returns expected shape` | `GET /api/portal/summary` returns JSON with status, metrics, freshness, and component entries |
| `status-profile:portal summary metrics are internally consistent` | aggregate counts and top-level status match the component list |
| `status-profile:portal summary timestamps and freshness are valid` | timestamps are ISO-8601 and freshness metadata matches component observation ages |

### `auth-profile` — OAuth 2.0 authentication contract (5 tests)

Optional. Only runs when the stack declares `capabilities.auth.enabled: true`
in `stack.json`. It validates the observable contract of the BFF auth surface
when an OAuth provider is active (`OUR_IDP_OAUTH_PROVIDER != "none"`).
`provider=none` behavior is out of scope.

The profile is stack-agnostic. Today the Go reference stack declares it, and
future stacks may declare it once they expose the same auth contract.

| Test | What is checked |
| --- | --- |
| `auth-profile:me endpoint returns 401 when unauthenticated` | `GET /auth/me` without a session cookie returns HTTP 401 |
| `auth-profile:login endpoint initiates the OAuth flow` | `GET /auth/login` returns a 3xx redirect whose `Location` header points at the configured provider authorization URL and includes a `state` parameter |
| `auth-profile:callback endpoint completes the OAuth flow` | `GET /auth/callback?code=<code>&state=<captured-state>` returns a 3xx redirect and sets the `idp_session` cookie |
| `auth-profile:me endpoint returns 200 with user JSON when authenticated` | `GET /auth/me` with the `idp_session` cookie returns HTTP 200 with JSON containing a `login` field |
| `auth-profile:logout endpoint returns 204 and clears session cookie` | `POST /auth/logout` returns HTTP 204; if `Set-Cookie` is present it expires `idp_session` |

---

## Profile selection logic

Which profiles the harness runs is determined by a priority chain evaluated at
startup:

1. **`IDP_CONTRACT_PROFILES`** (comma-separated list) — highest priority,
   overrides everything else.
2. **`IDP_CONTRACT_PROFILE`** (single profile name) — alternative single-profile
   override.
3. **`IDP_STACK_PATH` is set, no override env vars** — reads
   `stack.json → contractProfiles` from the declared stack directory.
4. **Nothing set** — defaults to `["core", "operational"]`.

The `ui-profile` profile has an additional gate: even if it is requested, the
harness generates zero tests for it unless `stack.json` declares
`capabilities.ui.enabled: true`. This means the profile is safe to include in
`contractProfiles` for a UI stack without breaking non-UI stacks.

The `status-profile` profile behaves the same way: it generates zero tests
unless `stack.json` declares `capabilities.status.enabled: true`.

The `auth-profile` profile behaves the same way: it generates zero tests unless
`stack.json` declares `capabilities.auth.enabled: true`.

---

## The `stack.json` capability declaration

Every stack must include a `stack.json` at its root. The harness reads this
file when `IDP_STACK_PATH` is set.

Minimum required fields:

```jsonc
{
  "language": "go",
  "framework": "net-http",
  "interface": "rest",
  "contractProfiles": ["core", "operational"],
  "capabilities": {
    "status": {
      "enabled": false
    },
    "auth": {
      "enabled": false
    },
    "ui": {
      "enabled": false
    }
  }
}
```

For a UI-capable stack:

```jsonc
{
  "language": "nodejs",
  "framework": "react-fastify",
  "interface": "rest",
  "contractProfiles": ["core", "operational", "status-profile", "ui-profile"],
  "capabilities": {
    "auth": {
      "enabled": false
    },
    "status": {
      "enabled": true
    },
    "ui": {
      "enabled": true,
      "mode": "spa"
    }
  }
}
```

**Field reference:**

| Field | Type | Description |
| --- | --- | --- |
| `language` | string | Implementation language (e.g. `go`, `nodejs`, `rust`) |
| `framework` | string | Server framework (e.g. `net-http`, `fastify`, `axum`) |
| `interface` | string | Interface type (currently always `rest`) |
| `contractProfiles` | `ProfileName[]` | Profiles this stack must pass |
| `capabilities.status.enabled` | boolean | Whether this stack exposes the shared IDP status API |
| `capabilities.auth.enabled` | boolean | Whether this stack exposes the optional OAuth auth endpoints |
| `capabilities.ui.enabled` | boolean | Whether this stack serves a UI |
| `capabilities.ui.mode` | `"spa" \| "ssr" \| "server-rendered"` | UI rendering mode when enabled |

---

## Environment variables

### Pointing the harness at a running stack

| Variable | Default | Purpose |
| --- | --- | --- |
| `IDP_WEB_URL` | `http://localhost:3000` | Base URL for the web server |
| `IDP_BFF_URL` | `http://localhost:8000` | Base URL for the BFF |
| `IDP_STACK_PATH` | _(unset)_ | Relative path to the stack directory; loads `stack.json` |
| `IDP_CONTRACT_PROFILES` | _(unset)_ | Comma-separated list of profiles to run |
| `IDP_CONTRACT_PROFILE` | _(unset)_ | Single profile override |
| `IDP_UI_BROWSER_PATH` | _(auto-detect)_ | Chrome or Edge executable path for rendered `ui-profile` checks |
| `OUR_IDP_OAUTH_PROVIDER` | `none` | OAuth provider selection used by `auth-profile` redirect assertions |
| `OUR_IDP_OAUTH_AUTH_URL` | _(unset)_ | Explicit authorization URL override for `auth-profile` redirect assertions |
| `OUR_IDP_OAUTH_MOCK_PORT` | `9000` | Mock OAuth provider port used when `OUR_IDP_OAUTH_PROVIDER=mock` |

### Controlling where a stack binds

| Variable | Default | Purpose |
| --- | --- | --- |
| `OUR_IDP_PORT` | `3000` | Web server port |
| `PORT` | _(fallback)_ | Secondary web server port override |
| `OUR_IDP_API_PORT` | `8000` | BFF port |
| `OUR_IDP_WEB_HOST` | `127.0.0.1` | Web server bind address |
| `OUR_IDP_API_HOST` | `127.0.0.1` | BFF bind address |

All local defaults bind to loopback (`127.0.0.1`). Override host only when
you explicitly need LAN, container, or remote-device access.

---

## Running the harness

### Against a running stack (default ports)

```bash
# moon canonical
moon run contract-tests:check-contract

# npm script alias
npm run test:contract
```

### Against a running stack (custom URLs)

Use the `npm` script when passing env var overrides directly on the command line:

```bash
IDP_WEB_URL="http://localhost:3001" \
  IDP_BFF_URL="http://localhost:8001" \
  npm run test:contract
```

### For a specific stack with all profiles

```bash
IDP_STACK_PATH="stacks/nodejs/react-fastify/rest" \
  IDP_CONTRACT_PROFILES="core,operational,status-profile,ui-profile" \
  npm run test:contract
```

### A single profile only

```bash
IDP_CONTRACT_PROFILE="core" npm run test:contract
```

### Automated via stack Makefile (recommended for CI)

Each stack's `check-contract` target starts the servers, waits for them to
bind, runs the harness against isolated test ports, then shuts everything down
regardless of outcome:

```bash
# Default stack (go/net-http/rest)
make check-contract

# Specific stack
make -C stacks/nodejs/react-fastify/rest check-contract

# Via moon (canonical)
moon run go-net-http-rest:check-contract
moon run nodejs-react-fastify-rest:check-contract
```

The Python runner accepts start commands in direct executable form with
optional inline environment prefixes, for example
`OUR_IDP_API_PORT=8300 go run ./bff` or
`OUR_IDP_API_PORT=8300 env -- ./bin/idp-bff`. This keeps the command contract
portable across Windows, macOS, and Linux without requiring stack-specific
launcher scripts.

### Root convenience shortcut

```bash
# Runs lint + tests + contract checks for the default stack
make check

# Alias
make test
```

---

## Port isolation for contract testing

Each stack runs the harness on ports separate from the default dev ports to
prevent accidental conflicts:

| Stack | Web test port | BFF test port |
| --- | --- | --- |
| `go/net-http/rest` | `3300` | `8300` |
| `nodejs/react-fastify/rest` | `3400` | `8400` |

Default dev ports (`3000` / `8000`) are left free so developers can run tests
while a dev stack is still running in a separate terminal.

---

## Reference implementations

Two stacks currently ship as reference implementations. Both must pass their
declared profiles on every change.

### `stacks/go/net-http/rest` — Default and canonical reference (Tier 1)

- **Language / framework**: Go 1.25, standard library `net/http` only
- **Moon project ID**: `go-net-http-rest`
- **Profiles**: `core`, `operational`, `status-profile`, `auth-profile`
- **Components**: two compiled binaries in `.bin/`
  - `idp-go-web` — serves `GET /`, `GET /health`, binds `127.0.0.1:3000`
  - `idp-go-bff` — serves `GET /`, `GET /health`, `GET /readiness`,
    binds `127.0.0.1:8000`
- **Stable binary paths**: avoids ephemeral `go run` temp executables for
  Windows compatibility (see [ADR-0006](../architecture/decisions/cross-platform-local-runtime-ux-baseline))

Start:

```bash
make dev
# or
make -C stacks/go/net-http/rest run-web
make -C stacks/go/net-http/rest run-bff
```

### `stacks/nodejs/react-fastify/rest` — React reference (Tier 1)

- **Language / framework**: TypeScript, Node.js 24, Fastify 5 (BFF), Vite +
  React 19 (web SPA)
- **Moon project ID**: `nodejs-react-fastify-rest`
- **Profiles**: `core`, `operational`, `status-profile`, `ui-profile`
  (`ui.mode: spa`)
- **Auth status**: does not yet declare `auth-profile`; when auth is added it
  must follow the same shared contract used by the Go reference stack
- **Components**:
  - `web/server.ts` — Vite dev server serving the React SPA, binds
    `127.0.0.1:3000`
  - `bff/src/server.ts` — Fastify API, binds `127.0.0.1:8000`; additionally
    serves `GET /api/portal/summary`

Start:

```bash
make -C stacks/nodejs/react-fastify/rest run-web
make -C stacks/nodejs/react-fastify/rest run-bff
```

---

## Creating a new compliant implementation

Follow these steps to add a new reference implementation and bring it into
compliance with the contract test harness.

### Step 1: Choose a stack path

Stack paths follow the convention `stacks/<language>/<framework>/<interface>`.
For example:

```text
stacks/rust/axum/rest
stacks/nodejs/express/rest
stacks/go/chi/rest
```

### Step 2: Create `stack.json`

Create `stack.json` at the root of your stack directory. Start with the minimum
profiles:

```jsonc
{
  "language": "rust",
  "framework": "axum",
  "interface": "rest",
  "contractProfiles": ["core", "operational"],
  "capabilities": {
    "ui": {
      "enabled": false
    }
  }
}
```

Add `"ui-profile"` to `contractProfiles` and set `capabilities.ui.enabled` to
`true` only when your stack serves a UI.

### Step 3: Implement the required HTTP endpoints

All health and readiness endpoints must conform to
[IETF `draft-inadarei-api-health-check-06`](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06)
([ADR-0011](../architecture/decisions/ietf-health-endpoint-contract)).

Your **web server** must expose:

#### BFF `GET /`

Returns a `200` response. If `ui-profile` is declared, the response must
be `text/html` and the body must include `<html` and `<title`.

#### BFF `GET /health`

Returns `200 application/health+json` with at minimum:

```json
{
  "status": "pass",
  "serviceId": "idp-web",
  "description": "IDP Web Server"
}
```

`status` must be `"pass"` for a healthy server. `serviceId` must be exactly
`"idp-web"`. `description` must be exactly `"IDP Web Server"`.

Your **BFF** must expose:

#### `GET /`

Returns `200 application/json` with at minimum:

```json
{
  "status": "ok",
  "service": "idp-bff"
}
```

#### `GET /health`

Returns `200 application/health+json`. The `operational` profile additionally
requires:

```json
{
  "status": "pass",
  "serviceId": "idp-bff",
  "description": "IDP BFF Server",
  "checks": {
    "bff:responseTime": [
      {
        "componentType": "system",
        "status": "pass",
        "time": "<ISO-8601 string>"
      }
    ]
  }
}
```

`status` must be one of `"pass"`, `"fail"`, or `"warn"`. `serviceId` must be
exactly `"idp-bff"`. `description` must be exactly `"IDP BFF Server"`. Each key
in `checks` must use `componentName:measurementName` format. Each check entry
must include `status`, `componentType`, and `time` (ISO-8601).

HTTP status codes: `200` for `pass` or `warn`, `503` for `fail`.

#### `GET /readiness`

Returns `200 application/health+json`. The `operational` profile additionally
requires:

```json
{
  "status": "pass",
  "checks": {
    "bff:status": [
      {
        "componentType": "system",
        "status": "pass",
        "time": "<ISO-8601 string>"
      }
    ]
  }
}
```

`status` must be `"pass"` or `"fail"` (readiness is binary — no `"warn"`).
`checks` must be a non-empty object.

### Step 4: Honor the port and host contract

Implement the following environment variable override chain:

| Service | Default port | Override env var(s) | Default host | Host override |
| --- | --- | --- | --- | --- |
| Web | `3000` | `OUR_IDP_PORT`, then `PORT` | `127.0.0.1` | `OUR_IDP_WEB_HOST` |
| BFF | `8000` | `OUR_IDP_API_PORT` | `127.0.0.1` | `OUR_IDP_API_HOST` |

### Step 5: Add a GNU Makefile

Create a `Makefile` with these required targets. Use isolated test ports
(choose ports not already taken by existing stacks — see the port table above):

```makefile
# Required variables
ROOT_DIR := $(shell git rev-parse --show-toplevel 2>/dev/null || pwd)
WEB_TEST_PORT := 3500
BFF_TEST_PORT := 8500

check-contract:
    @# Start both servers on test ports, run the harness, always kill servers
    @OUR_IDP_PORT="$(WEB_TEST_PORT)" <your-web-start-cmd> >/dev/null 2>&1 & WEB_PID=$$!; \
    OUR_IDP_API_PORT="$(BFF_TEST_PORT)" <your-bff-start-cmd> >/dev/null 2>&1 & BFF_PID=$$!; \
    trap 'kill $$WEB_PID $$BFF_PID 2>/dev/null || true' EXIT; \
    sleep 2; \
    IDP_WEB_URL="http://127.0.0.1:$(WEB_TEST_PORT)" \
      IDP_BFF_URL="http://127.0.0.1:$(BFF_TEST_PORT)" \
      IDP_STACK_PATH="stacks/<language>/<framework>/rest" \
      npm --prefix "$(ROOT_DIR)" run test:contract; \
    EXIT_CODE=$$?; \
    exit $$EXIT_CODE

test-contract: check-contract

run-web:
    <your-web-start-cmd>

run-bff:
    <your-bff-start-cmd>

install:
    <install dependencies>

build:
    <build artifacts>

check-lint:
    <run linters>

check-test:
    <run unit tests>

check-ci: build check-lint check-test

check: check-lint check-test check-contract

test: check

all: install build check

clean:
    <remove build artifacts>

.PHONY: all install build clean check-lint check-test check-contract \
        check-ci check test test-contract run-web run-bff
```

All target names are required. See
[ADR-0002](../architecture/decisions/stack-layout-and-make-contract) for the full
Make target contract.

### Step 6: Run the harness against your implementation

```bash
# Start your servers
make run-web &
make run-bff &

# Run with explicit stack path (moon canonical)
IDP_STACK_PATH="stacks/<language>/<framework>/rest" \
  moon run contract-tests:check-contract
# Or with moon: IDP_STACK_PATH="stacks/<language>/<framework>/rest" npm run test:contract

# Or use the automated target
make check-contract
```

Iterate until all declared profile tests pass.

### Step 7: Add a `moon.yml`

Add a `moon.yml` so your stack integrates with the CI orchestration system:

```yaml
$schema: "https://moonrepo.dev/schemas/project.json"

type: application
language: <language>

tasks:
  run-web:
    command: ["make", "run-web"]
  run-bff:
    command: ["make", "run-bff"]
  install:
    command: ["make", "install"]
  build:
    command: ["make", "build"]
  check-lint:
    command: ["make", "check-lint"]
  check-test:
    command: ["make", "check-test"]
  check-contract:
    command: ["make", "check-contract"]
  check-ci:
    command: ["make", "check-ci"]
  check:
    command: ["make", "check"]
  test:
    command: ["make", "test"]
  all:
    command: ["make", "all"]
  clean:
    command: ["make", "clean"]
```

Register the project in `.moon/workspace.yml` under `projects`.

---

## Output format

All harness output is structured JSON, one object per line.

**Profile selection announcement:**

```json
{
  "level": "info",
  "msg": "contract profiles selected",
  "profiles": ["core", "operational"],
  "stackPath": "stacks/go/net-http/rest"
}
```

**Passing test:**

```json
{
  "level": "info",
  "msg": "contract test passed",
  "test": "core:web responds to GET /"
}
```

**Failing test:**

```json
{
  "level": "error",
  "msg": "contract test failed",
  "test": "core:bff root returns JSON status",
  "error": "BFF root must return application/json content type"
}
```

**Fatal runner error (no profiles selected, service unreachable, etc.):**

```json
{
  "level": "error",
  "msg": "contract test runner failed",
  "error": "Unable to reach BFF server at http://localhost:8000.\n..."
}
```

Exit codes: `0` if all tests pass, `1` if any test fails or the runner errors.

---

## Roadmap notes

### Test harness container (available)

A published container image of the contract test harness is available, so you
can validate a running implementation without cloning this repository or
installing Node.js.

```bash
docker run --rm \
  -e IDP_WEB_URL="http://host.docker.internal:3000" \
  -e IDP_BFF_URL="http://host.docker.internal:8000" \
  -e IDP_CONTRACT_PROFILES="core,operational" \
  ghcr.io/ourchitecture/idp/stemix-contract-tests:<version>
```

Tags follow the standardized container strategy in
[ADR-0010](../architecture/decisions/container-build-strategy):

- Use a **version tag** (for example `0.1.0-alpha.1`) for reproducible runs.
- Use `edge` to run the latest image built from `main`.
- `latest` is only set for stable releases (never updated for pre-releases).

### Semantic versioning for the harness (planned)

Strict semantic versioning releases for the contract test harness are coming
soon. Releases will follow [SemVer 2.0.0](https://semver.org/) conventions:

- **Patch** — bug fixes to existing tests (no behavioral change to the contract)
- **Minor** — new optional profiles or new tests within existing optional profiles
- **Major** — additions to required profiles (`core`, `operational`) or removal of tests

Version pinning will give implementations a guaranteed upgrade path: a stack
that passes `v1.2.0` will always pass `v1.2.x`, and upgrading to `v1.3.0` will
only require implementing newly added optional capability tests.

### Opt-in capability batches (under research)

The team is researching how to group tests into named, opt-in batches of
capabilities beyond the current profile model. The goal is to allow any
reference implementation to declare compliance with specific, bounded areas of
Stemix IDP functionality — for example, portal summary rendering, portal
catalog search, or AI-assisted workflows — without being required to implement
the entire platform surface.

This research may result in a more granular capability taxonomy that sits below
the profile level, enabling fine-grained conformance claims and a richer
ecosystem of partial or specialized implementations.

---

## Related resources

- [tests/README.md](https://github.com/ourchitecture/idp/blob/main/tests/README.md) — Quick reference for env vars and run commands
- [stacks/README.md](https://github.com/ourchitecture/idp/blob/main/stacks/README.md) — Stack layout conventions and portfolio roles
- [ADR-0001](../architecture/decisions/intent-driven-architecture) — Three-layer intent/contract/implementation architecture
- [ADR-0002](../architecture/decisions/stack-layout-and-make-contract) — Stack layout and GNU Make target contract
- [ADR-0003](../architecture/decisions/contract-harness-and-runtime-port-contract) — Contract harness design and port contract
- [ADR-0004](../architecture/decisions/implementation-portfolio-and-support-tiers) — Implementation portfolio and support tiers
- [ADR-0005](../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0006](../architecture/decisions/cross-platform-local-runtime-ux-baseline) — Cross-platform runtime UX baseline
- [ADR-0007](../architecture/decisions/moon-required-proto-enhanced-toolchain-policy) — Moon orchestration and toolchain policy
- [ADR-0009](../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 intent specification format
- [ADR-0011](../architecture/decisions/ietf-health-endpoint-contract) — IETF health endpoint contract
