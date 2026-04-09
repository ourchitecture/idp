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
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Install dependencies from stack workspace.
COPY stacks/nodejs/react-fastify/rest/package.json stacks/nodejs/react-fastify/rest/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy web source files needed for the build.
COPY stacks/nodejs/react-fastify/rest/web/ ./web/

# Run Vite production build.
RUN npx vite build --config web/vite.config.ts

# ---------------------------------------------------------------------------
# Stage 2: runtime — nginx serving the static build with SPA routing + API proxy
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Install envsubst (provided by gettext) for runtime nginx config templating.
RUN apk add --no-cache gettext

# Remove default nginx config.
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config template (BFF_URL is substituted at container start).
COPY stacks/nodejs/react-fastify/rest/web/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy Vite build output.
COPY --from=builder /app/web/dist/ /usr/share/nginx/html/

# BFF_URL is required at runtime for /api/* proxy.
# Default points to host machine port 8000 for local docker run convenience.
ENV BFF_URL=http://localhost:8000

EXPOSE 3000

# nginx official image processes /etc/nginx/templates/*.template via envsubst
# automatically on startup, writing results to /etc/nginx/conf.d/.

# Security Scan stage
FROM ghcr.io/aquasecurity/trivy:0.56.2 AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
CMD ["nginx", "-g", "daemon off;"]
