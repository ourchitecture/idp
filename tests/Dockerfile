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
#     -e OUR_IDP_WEB_URL=http://host.docker.internal:3000 \
#     -e OUR_IDP_BFF_URL=http://host.docker.internal:8000 \
#     localhost/stemix-contract-tests:dev
#
# Run with explicit profiles:
#   docker run --rm \
#     -e OUR_IDP_WEB_URL=http://host.docker.internal:3000 \
#     -e OUR_IDP_BFF_URL=http://host.docker.internal:8000 \
#     -e OUR_IDP_CONTRACT_PROFILES=core,operational \
#     localhost/stemix-contract-tests:dev

# node:24.14.1-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS base

WORKDIR /app

# Install dependencies from root workspace.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy contract test sources and Gherkin feature specs.
COPY tests/ ./tests/

# Required at runtime — no defaults intentional (fail fast if not provided).
ENV OUR_IDP_WEB_URL=""
ENV OUR_IDP_BFF_URL=""

# Optional: comma-separated profile list. Defaults to core,operational when unset.
ENV OUR_IDP_CONTRACT_PROFILES=""

# Security Scan stage
# ghcr.io/aquasecurity/trivy:0.56.2 — digest pinned 2026-04-09 (ADR-0008)
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:26245f364b6f5d223003dc344ec1eb5eb8439052bfecb31d79aeba0c74344b3a AS scanner
COPY --from=base / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM base
CMD ["npm", "run", "test:contract"]
