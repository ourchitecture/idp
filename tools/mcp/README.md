# Stemix IDP MCP Server

MCP (Model Context Protocol) adapter for the Stemix Intent-Driven Portal BFF. This tool exposes
IDP capabilities as MCP tools so that AI agents can interact with the portal without knowing its
HTTP REST conventions.

It is a thin interface adapter — all capability logic lives in the BFF. The MCP server translates
agent requests into BFF API calls and returns structured results.

## Why it exists

The IDP design principle "AI over MCP-First" means every portal capability should be reachable by
AI agents through a stable, discoverable protocol. This server is the MCP interface adapter layer.

## Prerequisites

- Node.js 20 or later
- A running IDP BFF (default: `http://localhost:8000`)

## Environment variables

| Variable        | Default                 | Description                                                                          |
|-----------------|-------------------------|--------------------------------------------------------------------------------------|
| `IDP_BFF_URL`   | `http://localhost:8000` | Base URL of the IDP BFF to connect to                                                |
| `MCP_HTTP_PORT` | _(unset)_               | When set, starts Streamable HTTP server on this port; otherwise starts in stdio mode |

## Install dependencies

```sh
npm install
```

## Build

```sh
npm run build
# or
make build
```

## Run locally

### stdio mode (for use with MCP clients that manage the process)

```sh
node dist/server.js
# or
make run
```

### HTTP mode (for container and remote use)

```sh
MCP_HTTP_PORT=8080 node dist/server.js
# or
make run-http
```

The server listens at `POST /mcp` on the configured port.

## Contract tests

Start the BFF (e.g., `make -C stacks/go/net-http/rest run-bff`), then:

```sh
# From this directory:
make check-contract

# Or manually from repo root:
MCP_HTTP_PORT=8580 IDP_BFF_URL=http://localhost:8000 node tools/mcp/dist/server.js &
IDP_MCP_URL=http://localhost:8580 IDP_STACK_PATH=tools/mcp npm run test:contract
```

## Container

```sh
# Build (from tools/mcp/):
make build-container

# Run (connect to a BFF on the host):
docker run --rm -p 8080:8080 \
  -e IDP_BFF_URL=http://host.docker.internal:8000 \
  localhost/stemix-mcp-server:latest
```

## Tools exposed

| Tool                 | Description                                                             |
|----------------------|-------------------------------------------------------------------------|
| `get_portal_summary` | Returns the shared IDP status summary contract for IDP-owned components |
| `check_health`       | Returns BFF `/health` and `/readiness` responses                        |

## Platform notes

- The server writes structured JSON logs to `stderr` only.
- In stdio mode, `stdout` is reserved for the MCP protocol; do not write anything else to it.
- Default local binding is `0.0.0.0` in HTTP mode (container-friendly). For local-only use, set
  `MCP_HTTP_HOST=127.0.0.1` if needed.
