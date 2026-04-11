# syntax=docker/dockerfile:1
# Multi-stage build for the Node.js React/Fastify BFF.
# Build context must be the repository root.
#
# Build example (from repo root):
#   docker build -t localhost/stemix-nodejs-react-fastify-rest-bff:dev \
#     -f stacks/nodejs/react-fastify/rest/bff/Dockerfile .

ARG NODE_VERSION=24.14.1

# ---------------------------------------------------------------------------
# Stage 1: builder — compile TypeScript to JavaScript
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine@sha256:5bc53106902596d90fb497746b74ea40e0625c1c8327681d6bff3ee6ad42a22b AS builder

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
FROM node:${NODE_VERSION}-alpine@sha256:5bc53106902596d90fb497746b74ea40e0625c1c8327681d6bff3ee6ad42a22b AS runtime

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
LABEL org.opencontainers.image.licenses="Apache-2.0"
CMD ["node", "bff/dist/server.js"]
