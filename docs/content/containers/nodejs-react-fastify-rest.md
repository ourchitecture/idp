---
sidebar_position: 4
title: Node.js React + Fastify REST
---

# Node.js React + Fastify REST Containers

The Node.js stack uses separate Dockerfiles for each component due to
different runtime requirements.

## Images

| Image | Default Port | Base Image |
|---|---|---|
| `stemix-nodejs-react-fastify-rest-web` | 3400 | `nginx:alpine` |
| `stemix-nodejs-react-fastify-rest-bff` | 8400 | `node:24-alpine` |

## Build

```bash
# Both images
make -C stacks/nodejs/react-fastify/rest build-containers

# Individual
make -C stacks/nodejs/react-fastify/rest build-container-web
make -C stacks/nodejs/react-fastify/rest build-container-bff
```

## Web Container (nginx)

The web container serves the Vite-built React SPA via nginx and proxies
`/api/*` requests to the BFF backend.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BFF_URL` | Yes | BFF backend URL (example: `http://host.docker.internal:8400`) |

The `BFF_URL` variable is injected at container startup using the nginx
official image's built-in `envsubst` template processing. No custom
entrypoint script is needed.

### Architecture

```text
Browser --> nginx:3400 --> /api/* proxy_pass --> BFF_URL
                       --> /*     static SPA files
```

## BFF Container (Fastify)

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OUR_IDP_API_HOST` | `0.0.0.0` | Bind address |
| `OUR_IDP_API_PORT` | `8400` | Listen port |

## Dockerfiles

- Web: `stacks/nodejs/react-fastify/rest/web/Dockerfile`
- BFF: `stacks/nodejs/react-fastify/rest/bff/Dockerfile`

Both Dockerfiles require the **repo root** as build context because
`package.json` and `package-lock.json` live at root.
