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
- `ui-profile`

This stack declares UI capability mode `spa`.

## Commands

- `make -C src/stacks/nodejs/react-fastify/rest install`
- `make -C src/stacks/nodejs/react-fastify/rest build`
- `make -C src/stacks/nodejs/react-fastify/rest clean`
- `make -C src/stacks/nodejs/react-fastify/rest check-lint`
- `make -C src/stacks/nodejs/react-fastify/rest check-test`
- `make -C src/stacks/nodejs/react-fastify/rest check`
- `make -C src/stacks/nodejs/react-fastify/rest test` (alias for `check-test`)
- `make -C src/stacks/nodejs/react-fastify/rest run-web`
- `make -C src/stacks/nodejs/react-fastify/rest run-bff`
- `make -C src/stacks/nodejs/react-fastify/rest test-contract`

### Native Tooling Shortcuts

- `npm run typecheck:stack:react-fastify`
- `npm run build:web:react-fastify`
- `npm run start:web:react-fastify`
- `npm run start:bff:react-fastify`
