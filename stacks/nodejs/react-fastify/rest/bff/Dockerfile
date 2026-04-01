# syntax=docker/dockerfile:1
# Multi-stage build for the Node.js React/Fastify BFF.
# Build context must be the repository root (package.json and package-lock.json
# are at root due to the npm workspace layout).
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
FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /app

# Install production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder.
COPY --from=builder /app/stacks/nodejs/react-fastify/rest/bff/dist/ ./stacks/nodejs/react-fastify/rest/bff/dist/

# Override loopback default (ADR-0006) for container context.
ENV OUR_IDP_API_HOST=0.0.0.0

EXPOSE 8000

CMD ["node", "stacks/nodejs/react-fastify/rest/bff/dist/server.js"]
