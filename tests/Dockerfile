# syntax=docker/dockerfile:1
# Contract test harness container.
# Points at any running IDP implementation to validate compliance.
# Build context must be the repository root.
#
# Build example (from repo root):
#   docker build -t localhost/stemix-contract-tests:dev -f tests/Dockerfile .
#
# Run example:
#   docker run --rm \
#     -e IDP_WEB_URL=http://host.docker.internal:3000 \
#     -e IDP_BFF_URL=http://host.docker.internal:8000 \
#     localhost/stemix-contract-tests:dev
#
# Run with explicit profiles:
#   docker run --rm \
#     -e IDP_WEB_URL=http://host.docker.internal:3000 \
#     -e IDP_BFF_URL=http://host.docker.internal:8000 \
#     -e IDP_CONTRACT_PROFILES=core,operational \
#     localhost/stemix-contract-tests:dev

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app

# Install dependencies from root workspace.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy contract test sources and Gherkin feature specs.
COPY tests/ ./tests/

# Required at runtime — no defaults intentional (fail fast if not provided).
ENV IDP_WEB_URL=""
ENV IDP_BFF_URL=""

# Optional: comma-separated profile list. Defaults to core,operational when unset.
ENV IDP_CONTRACT_PROFILES=""

# Security Scan stage
FROM ghcr.io/aquasecurity/trivy:0.56.2 AS scanner
COPY --from=base / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM base
CMD ["npm", "run", "test:contract"]
