# syntax=docker/dockerfile:1
# Multi-stage build for the Stemix IDP MCP server.
# Build context must be the tools/mcp directory.
#
# Build example (from tools/mcp/):
#   docker build -t localhost/stemix-mcp-server:dev .

ARG NODE_VERSION=24.14.1

# ---------------------------------------------------------------------------
# Stage 1: builder — compile TypeScript to JavaScript
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean Node.js image with compiled output only
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

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
FROM ghcr.io/aquasecurity/trivy:0.56.2 AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
CMD ["node", "dist/server.js"]
