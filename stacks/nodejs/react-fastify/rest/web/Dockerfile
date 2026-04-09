# syntax=docker/dockerfile:1
# Multi-stage build for the Node.js React/Fastify web (SPA).
# Build context must be the repository root (package.json and vite config live there).
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

# ---------------------------------------------------------------------------
# Stage 1: builder — produce Vite production build
# ---------------------------------------------------------------------------
# node:24.14.1-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS builder

WORKDIR /app

# Install all dependencies from root workspace.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy web source files needed for the build.
COPY stacks/nodejs/react-fastify/rest/web/ ./stacks/nodejs/react-fastify/rest/web/

# Run Vite production build.
RUN npx vite build --config stacks/nodejs/react-fastify/rest/web/vite.config.ts

# ---------------------------------------------------------------------------
# Stage 2: runtime — nginx serving the static build with SPA routing + API proxy
# ---------------------------------------------------------------------------
# nginx:1.29-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM nginx:1.29-alpine@sha256:645eda1c2477aaa9b879f73909b9222c6f19798dd45be6706268d82a661c6e6d AS runtime

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
# ghcr.io/aquasecurity/trivy:0.56.2 — digest pinned 2026-04-09 (ADR-0008)
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:26245f364b6f5d223003dc344ec1eb5eb8439052bfecb31d79aeba0c74344b3a AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
CMD ["nginx", "-g", "daemon off;"]
