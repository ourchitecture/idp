# syntax=docker/dockerfile:1
# Multi-stage build for the Node.js React/Fastify BFF.
# Build context must be the repository root (package.json and package-lock.json
# are at root due to the npm workspace layout).
#
# Build example (from repo root):
#   docker build -t localhost/stemix-nodejs-react-fastify-rest-bff:dev \
#     -f stacks/nodejs/react-fastify/rest/bff/Dockerfile .

# ---------------------------------------------------------------------------
# Stage 1: builder — compile TypeScript to JavaScript
# ---------------------------------------------------------------------------
# node:24.14.1-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS builder

WORKDIR /app

# Install all dependencies from root workspace first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy BFF source and its tsconfig.
COPY stacks/nodejs/react-fastify/rest/bff/ ./stacks/nodejs/react-fastify/rest/bff/

# Compile TypeScript. outDir is "dist" relative to the bff/ directory per tsconfig.
RUN npx tsc --project stacks/nodejs/react-fastify/rest/bff/tsconfig.json

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean Node.js image with compiled output only
# ---------------------------------------------------------------------------
# node:24.14.1-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS runtime

WORKDIR /app

# Install production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder.
COPY --from=builder /app/stacks/nodejs/react-fastify/rest/bff/dist/ ./stacks/nodejs/react-fastify/rest/bff/dist/

# Override loopback default (ADR-0006) for container context.
ENV OUR_IDP_API_HOST=0.0.0.0

EXPOSE 8000

# Security Scan stage
# ghcr.io/aquasecurity/trivy:0.56.2 — digest pinned 2026-04-09 (ADR-0008)
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:26245f364b6f5d223003dc344ec1eb5eb8439052bfecb31d79aeba0c74344b3a AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
CMD ["node", "stacks/nodejs/react-fastify/rest/bff/dist/server.js"]
