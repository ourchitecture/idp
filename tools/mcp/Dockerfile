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
FROM node:${NODE_VERSION}-alpine@sha256:5bc53106902596d90fb497746b74ea40e0625c1c8327681d6bff3ee6ad42a22b AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean Node.js image with compiled output only
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine@sha256:5bc53106902596d90fb497746b74ea40e0625c1c8327681d6bff3ee6ad42a22b AS runtime

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
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:9aebdee5e85129a1bdd9977676baa6cf0579195fc4809570cc9dd55f6e92863c AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=dev
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.source="https://github.com/ourchitecture/idp"
LABEL org.opencontainers.image.url="https://github.com/ourchitecture/idp"
LABEL org.opencontainers.image.vendor="Ourchitecture"
LABEL org.opencontainers.image.licenses="MIT"
CMD ["node", "dist/server.js"]
