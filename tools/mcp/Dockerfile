# syntax=docker/dockerfile:1
# Multi-stage build for the Stemix IDP MCP server.
# Build context must be the tools/mcp directory.
#
# Build example (from tools/mcp/):
#   docker build -t localhost/stemix-mcp-server:dev .

# ---------------------------------------------------------------------------
# Stage 1: builder — compile TypeScript to JavaScript
# ---------------------------------------------------------------------------
# node:24.14.1-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean Node.js image with compiled output only
# ---------------------------------------------------------------------------
# node:24.14.1-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS runtime

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist/ ./dist/

# Default to Streamable HTTP mode when running in a container.
# Override with OUR_IDP_MCP_PORT="" to use stdio (not useful in containers).
ENV OUR_IDP_MCP_PORT=8080

# Connect to the BFF. Override at runtime via -e OUR_IDP_BFF_URL=...
ENV OUR_IDP_BFF_URL=http://localhost:8000

EXPOSE 8080

# Security Scan stage
# ghcr.io/aquasecurity/trivy:0.56.2 — digest pinned 2026-04-09 (ADR-0008)
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:26245f364b6f5d223003dc344ec1eb5eb8439052bfecb31d79aeba0c74344b3a AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
CMD ["node", "dist/server.js"]
