---
sidebar_position: 2
title: Running Containers
---

This guide covers how to run Stemix IDP container images locally.

## Prerequisites

- Docker (or compatible runtime such as Rancher Desktop with `dockerd (moby)`)
- Container images built locally (`make build-containers`) or pulled from
  the registry

## Go Stack

Start the BFF first, then the web server:

```bash
# BFF
docker run --rm -d --name idp-go-bff -p 8300:8300 \
  localhost/stemix-go-net-http-rest-bff:latest

# Web
docker run --rm -d --name idp-go-web -p 3300:3300 \
  localhost/stemix-go-net-http-rest-web:latest
```

Open `http://localhost:3300` in your browser.

## Node.js Stack

The Node.js web container uses nginx and requires the BFF URL to be injected
at startup via the `BFF_URL` environment variable:

```bash
# BFF
docker run --rm -d --name idp-node-bff -p 8400:8400 \
  localhost/stemix-nodejs-react-fastify-rest-bff:latest

# Web (with BFF proxy)
docker run --rm -d --name idp-node-web -p 3400:3400 \
  -e BFF_URL=http://host.docker.internal:8400 \
  localhost/stemix-nodejs-react-fastify-rest-web:latest
```

Open `http://localhost:3400` in your browser.

## Contract Tests

Run the contract test container against a running stack:

```bash
docker run --rm \
  -e IDP_WEB_URL=http://host.docker.internal:3300 \
  -e IDP_BFF_URL=http://host.docker.internal:8300 \
  -e IDP_STACK_PATH=stacks/go/net-http/rest \
  localhost/stemix-contract-tests:latest
```

## Host Networking Notes

- Containers bind to `0.0.0.0` by default (not `127.0.0.1`).
- Use `host.docker.internal` to reference services running on the Docker
  host from inside a container.
- On Linux, you may need `--add-host=host.docker.internal:host-gateway` or
  `--network=host` for host access.

## Stopping Containers

```bash
docker stop idp-go-web idp-go-bff
docker stop idp-node-web idp-node-bff
```
