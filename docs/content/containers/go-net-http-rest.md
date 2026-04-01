---
sidebar_position: 3
title: Go net/http REST
---

# Go net/http REST Containers

The Go reference stack produces two container images from a single
multi-stage Dockerfile using a `SERVICE` build argument.

## Images

| Image | Default Port | Base Image |
|---|---|---|
| `stemix-go-net-http-rest-web` | 3300 | `gcr.io/distroless/static-debian12:nonroot` |
| `stemix-go-net-http-rest-bff` | 8300 | `gcr.io/distroless/static-debian12:nonroot` |

## Build

```bash
# Both images
make -C stacks/go/net-http/rest build-containers

# Individual
make -C stacks/go/net-http/rest build-container-web
make -C stacks/go/net-http/rest build-container-bff
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OUR_IDP_WEB_HOST` | `0.0.0.0` | Web server bind address |
| `OUR_IDP_API_HOST` | `0.0.0.0` | BFF server bind address |
| `OUR_IDP_PORT` | `3300` | Web server port |
| `OUR_IDP_API_PORT` | `8300` | BFF server port |

## Security

- Runtime image uses distroless with `nonroot` user (UID 65534).
- No shell, package manager, or writable filesystem in the final image.
- Statically linked Go binary with CGO disabled.

## Dockerfile

Located at `stacks/go/net-http/rest/Dockerfile`. Uses `golang:1.25-alpine`
builder stage and `gcr.io/distroless/static-debian12:nonroot` runtime.
