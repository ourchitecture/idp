# Contract Test Harness

This TypeScript test harness validates intent compliance without depending on any
implementation code. Any portal implementation can run these tests by exposing
the required HTTP endpoints.

## Requirements

- Node.js 18+ (for stable runtime behavior)

## Configuration

- `IDP_WEB_URL` (default: `http://localhost:3000`)
- `IDP_BFF_URL` (default: `http://localhost:8000`)
- `IDP_STACK_PATH` (optional; stack path used to load `stack.json` profile and
  capability declarations, example: `stacks/nodejs/react-fastify/rest`)
- `IDP_CONTRACT_PROFILE` (optional single profile override)
- `IDP_CONTRACT_PROFILES` (optional comma-separated profile list override)

## Conformance Profiles

- `core`: required baseline behavior
- `operational`: runtime and operational behavior checks
- `ui-profile`: UI-capability contract checks for stacks that declare UI support

By default, the harness runs `core` + `operational`, and only runs
`ui-profile` when both:

- requested by environment profile selection, and
- declared in stack metadata (`stack.json`)

When `IDP_STACK_PATH` is provided and no profile override env vars are set,
profiles are selected from `stack.json` (`contractProfiles`).

## Run

```bash
npm run test:contract
```

Via moon project task:

```bash
moon run contract-tests:check-contract
```

If the system is not running, the harness prints instructions to start a stack
or run `make dev`.

Example with overrides:

```bash
IDP_WEB_URL="http://localhost:3001" IDP_BFF_URL="http://localhost:8001" npm run test:contract
```

Example for a specific stack and explicit profile set:

```bash
IDP_STACK_PATH="stacks/nodejs/react-fastify/rest" IDP_CONTRACT_PROFILES="core,operational,ui-profile" npm run test:contract
```

## Container Image

A container image is available for running the contract tests in isolation.

### Prerequisites

- Docker (or compatible runtime such as Rancher Desktop with dockerd/moby)

### Build

```bash
make -C tests build-container
```

### Run

Pass the target web and BFF URLs as environment variables:

```bash
docker run --rm \
  -e IDP_WEB_URL=http://host.docker.internal:3300 \
  -e IDP_BFF_URL=http://host.docker.internal:8300 \
  -e IDP_STACK_PATH=stacks/go/net-http/rest \
  localhost/stemix-contract-tests:latest
```

### Published Image

- `ghcr.io/ourchitecture/idp/stemix-contract-tests`
