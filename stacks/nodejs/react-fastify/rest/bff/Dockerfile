# syntax=docker/dockerfile:1
# Multi-stage build for the Node.js React/Fastify BFF.
# Build context must be the repository root.
#
# Build example (from repo root):
#   docker build -t localhost/stemix-nodejs-react-fastify-rest-bff:dev \
#     -f stacks/nodejs/react-fastify/rest/bff/Dockerfile .

ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
# Stage 1: builder — compile TypeScript to JavaScript
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Install dependencies from stack workspace.
COPY stacks/nodejs/react-fastify/rest/package.json stacks/nodejs/react-fastify/rest/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy BFF source and its tsconfig.
COPY stacks/nodejs/react-fastify/rest/bff/ ./bff/

# Compile TypeScript. outDir is "dist" relative to the bff/ directory per tsconfig.
RUN npx tsc --project bff/tsconfig.json

# ---------------------------------------------------------------------------
# Stage 2: runtime — lean Node.js image with compiled output only
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /app

# Install production dependencies only.
COPY stacks/nodejs/react-fastify/rest/package.json stacks/nodejs/react-fastify/rest/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder.
COPY --from=builder /app/bff/dist/ ./bff/dist/

# Override loopback default (ADR-0006) for container context.
ENV OUR_IDP_API_HOST=0.0.0.0

EXPOSE 8000

# Security Scan stage
FROM ghcr.io/aquasecurity/trivy:0.56.2 AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
CMD ["node", "bff/dist/server.js"]
