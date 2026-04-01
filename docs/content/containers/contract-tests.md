---
sidebar_position: 5
title: Contract Tests
---

The contract test container packages the TypeScript test harness so it can
run against any stack without requiring Node.js on the host.

## Image

| Image | Base Image |
| --- | --- |
| `stemix-contract-tests` | `node:24-alpine` |

## Build

```bash
make -C tests build-container
```

## Run

```bash
docker run --rm \
  -e IDP_WEB_URL=http://host.docker.internal:3300 \
  -e IDP_BFF_URL=http://host.docker.internal:8300 \
  -e IDP_STACK_PATH=stacks/go/net-http/rest \
  localhost/stemix-contract-tests:latest
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `IDP_WEB_URL` | `http://localhost:3000` | Web server URL to test |
| `IDP_BFF_URL` | `http://localhost:8000` | BFF server URL to test |
| `IDP_STACK_PATH` | (none) | Stack path for profile/capability loading |
| `IDP_CONTRACT_PROFILES` | (auto) | Comma-separated profile list override |

## Dockerfile

Located at `tests/Dockerfile`. Single-stage `node:24-alpine` image that
copies the full test harness and dependencies.
