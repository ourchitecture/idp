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

ARG NODE_VERSION=24.14.1

FROM node:${NODE_VERSION}-alpine@sha256:5bc53106902596d90fb497746b74ea40e0625c1c8327681d6bff3ee6ad42a22b AS base

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
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:9aebdee5e85129a1bdd9977676baa6cf0579195fc4809570cc9dd55f6e92863c AS scanner
COPY --from=base / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM base
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
CMD ["npm", "run", "test:contract"]
