# Technology Stacks

Each technology stack is a self-contained implementation of the Intent-Driven
Portal. Stacks must expose the same external behavior so the contract test
harness can validate compliance.

Support tiers and portfolio roles are defined in
`docs/content/architecture/decisions/0004-implementation-portfolio-and-support-tiers.md`.

## Conventions

- Maintainer and CI orchestration is standardized on moon project tasks.
- GNU Make targets remain available as compatibility wrappers per ADR-0007.
- Contributors may use system-installed language tools, while `proto` provides
  pinned toolchain convenience and CI parity.
- Stacks are organized as `stacks/<language>/<framework>/<interface>`.
- Each stack directory includes a GNU Makefile with the same targets:
  - `all`
  - `install`
  - `build`
  - `clean`
  - `check-lint`
  - `check-test`
  - `check-contract`
  - `check-ci`
  - `check`
  - `test` (stack-defined alias)
  - `test-contract` (stack-defined alias for `check-contract`)
  - `run-web`
  - `run-bff`
- Web server defaults to port 3000 (override with `OUR_IDP_PORT`, then `PORT`).
- BFF server defaults to port 8000 (override with `OUR_IDP_API_PORT`).
- Web host defaults to `127.0.0.1` (override with `OUR_IDP_WEB_HOST`).
- BFF host defaults to `127.0.0.1` (override with `OUR_IDP_API_HOST`).
- Contract tests live in `tests/src/` and are run via `make test-contract`.

## Portfolio Roles

- **Default/reference (Tier 1)**: `go/net-http/rest`
- **Additional reference (Tier 1, React-focused)**: `nodejs/react-fastify/rest`
- **Supported (first-class)**: TypeScript-only and TypeScript + React stacks

## Current Stacks

- `go/net-http/rest`
- `nodejs/react-fastify/rest`

## Moon Project IDs

- `go-net-http-rest` -> `stacks/go/net-http/rest`
- `nodejs-react-fastify-rest` -> `stacks/nodejs/react-fastify/rest`

## Examples

- `go/chi/rest`
- `go/fiber/graphql`
- `rust/axum/rest`
- `nodejs/express/rest`
- `nodejs/fastify/graphql`
