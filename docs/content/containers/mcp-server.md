---
sidebar_position: 6
title: MCP Server
---

The MCP server container packages the Stemix IDP MCP adapter so AI agents can
interact with the portal without installing Node.js or knowing the BFF's HTTP
conventions. It is stack-independent and connects to any running BFF.

## Image

| Image | Default Port | Base Image |
| --- | --- | --- |
| `stemix-mcp-server` | 8080 | `node:24-alpine` |

## Build

```bash
make -C tools/mcp build-container
```

## Run

```bash
docker run --rm -p 8080:8080 \
  -e OUR_IDP_BFF_URL=http://host.docker.internal:8000 \
  ghcr.io/ourchitecture/idp/stemix-mcp-server:edge
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `OUR_IDP_BFF_URL` | `http://localhost:8000` | Base URL of the BFF to connect to |
| `OUR_IDP_MCP_PORT` | `8080` | HTTP port the MCP server listens on |
| `MCP_HTTP_HOST` | `0.0.0.0` | Bind address (use `127.0.0.1` for local-only) |

## Tools Exposed

| Tool | Description |
| --- | --- |
| `get_portal_summary` | Returns the shared IDP status summary contract for IDP-owned components |
| `check_health` | Returns BFF `/health` and `/readiness` responses |
| `list_flow_insights` | Lists flow insights with optional provider/service/repo/team/actor filters and role-aware summaries |
| `get_flow_insight` | Returns one flow insight by `insightId`, matching the HTTP detail contract |
| `list_my_blockers` | Returns blocker signals (`blocked_on_review`, `waiting_on_evidence`, `aging_implementation`) for a given actor |
| `list_service_risk_signals` | Returns aggregated risk signals for the specified service scope |

Example prompts and shapes for the flow tools live in [Flow Insights HTTP API](../flow/api#flow-insights-over-mcp).

## Dockerfile

Located at `tools/mcp/Dockerfile`. Multi-stage `node:24-alpine` image: builder
stage runs `tsc`, runtime stage copies compiled output and installs production
dependencies only.
