---
sidebar_position: 1
title: Container Overview
---

Stemix IDP publishes container images for every reference stack and the contract
test harness. Containers let you run the portal without installing language
toolchains or build tools on your machine.

## Why Containers?

- **Reproducible environments** -- identical runtime behavior across dev, CI,
  and production.
- **Zero local toolchain** -- no Go, Node.js, or build dependencies required to
  run the portal.
- **Composable** -- mix web, BFF, and test containers freely with Docker
  Compose or Kubernetes.

## Available Images

| Image | Description |
| --- | --- |
| `stemix-go-net-http-rest-web` | Go net/http web server |
| `stemix-go-net-http-rest-bff` | Go net/http BFF API server |
| `stemix-nodejs-react-fastify-rest-web` | React + nginx web server with BFF proxy |
| `stemix-nodejs-react-fastify-rest-bff` | Fastify BFF API server |
| `stemix-contract-tests` | Implementation-agnostic contract test runner |
| `stemix-mcp-server` | MCP adapter that exposes portal capabilities to AI agents |
| `stemix-mock-oauth` | Mock OAuth server used for contract and auth tests |

## Registry

All images are published to GitHub Container Registry:

```text
ghcr.io/ourchitecture/idp/stemix-<image-name>:<tag>
```

## Tags

| Tag | Meaning |
| --- | --- |
| `edge` | Latest build from `main` branch (may be unstable) |
| `0.1.0-alpha.1` | Exact version |
| `0.1` | Latest patch within that minor |
| `0` | Latest minor+patch within that major |
| `latest` | Highest stable (non-pre-release) version |

During the initial alpha phase, only `edge` and exact version tags are
produced. The `latest` tag is applied only once a stable (non-pre-release)
version is published.

## Local Builds

All container images can be built locally using Make targets. Docker (or a
compatible runtime such as Rancher Desktop with `dockerd (moby)` engine) must
be installed.

```bash
# Build all images
make build-containers

# Build a single stack
make -C stacks/go/net-http/rest build-containers
make -C stacks/nodejs/react-fastify/rest build-containers

# Build the contract test image
make -C tests build-container

# Build the MCP server image
make -C tools/mcp build-container

# Build the mock OAuth image
make -C tools/mock-oauth build-container
```

Local images use the `localhost/stemix-*` prefix.
