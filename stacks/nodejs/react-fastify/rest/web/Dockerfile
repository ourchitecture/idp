# syntax=docker/dockerfile:1
# Multi-stage build for the Node.js React/Fastify web (SPA).
# Build context must be the repository root.
#
# The BFF URL is injected at container start via BFF_URL environment variable.
# nginx proxies /api/* to that URL. Defaults to http://localhost:8000.
#
# Build example (from repo root):
#   docker build -t localhost/stemix-nodejs-react-fastify-rest-web:dev \
#     -f stacks/nodejs/react-fastify/rest/web/Dockerfile .
#
# Run example:
#   docker run --rm -p 3000:3000 -e BFF_URL=http://host.docker.internal:8000 \
#     localhost/stemix-nodejs-react-fastify-rest-web:dev

ARG NODE_VERSION=24.14.1

# ---------------------------------------------------------------------------
# Stage 1: builder — produce Vite production build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine@sha256:5bc53106902596d90fb497746b74ea40e0625c1c8327681d6bff3ee6ad42a22b AS builder

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Install dependencies from stack workspace.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY stacks/nodejs/react-fastify/rest/package.json ./stacks/nodejs/react-fastify/rest/package.json
COPY docs/package.json ./docs/package.json
COPY tools/mcp/package.json ./tools/mcp/package.json
COPY tools/mock-providers/package.json ./tools/mock-providers/package.json
COPY tools/vscode-extension/package.json ./tools/vscode-extension/package.json
RUN pnpm install --frozen-lockfile --filter nodejs-react-fastify-rest...

# Copy web source files needed for the build.
COPY stacks/nodejs/react-fastify/rest/web/ ./stacks/nodejs/react-fastify/rest/web/

# Run Vite production build.
RUN pnpm -C stacks/nodejs/react-fastify/rest exec vite build --config web/vite.config.ts

# ---------------------------------------------------------------------------
# Stage 2: runtime — nginx serving the static build with SPA routing + API proxy
# ---------------------------------------------------------------------------
FROM nginx:alpine@sha256:c1263cc56873d66f381fd07149aa0dc7244dd7c941334cd18473c46509f08465 AS runtime

# Install envsubst (provided by gettext) for runtime nginx config templating.
RUN apk add --no-cache gettext

# Remove default nginx config.
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config template (BFF_URL is substituted at container start).
COPY stacks/nodejs/react-fastify/rest/web/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy Vite build output.
COPY --from=builder /app/stacks/nodejs/react-fastify/rest/web/dist/ /usr/share/nginx/html/

# BFF_URL is required at runtime for /api/* proxy.
# Default points to host machine port 8000 for local docker run convenience.
ENV BFF_URL=http://localhost:8000

EXPOSE 3000

# nginx official image processes /etc/nginx/templates/*.template via envsubst
# automatically on startup, writing results to /etc/nginx/conf.d/.

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
LABEL org.opencontainers.image.created-by="moon"
CMD ["nginx", "-g", "daemon off;"]
