# syntax=docker/dockerfile:1
# Multi-stage build for the Go net/http REST stack.
# Use SERVICE build arg to select which binary to compile: web (default: bff).
#
# Build examples (from repo root):
#   docker build --build-arg SERVICE=web -t localhost/stemix-go-net-http-rest-web:dev -f stacks/go/net-http/rest/Dockerfile stacks/go/net-http/rest
#   docker build --build-arg SERVICE=bff -t localhost/stemix-go-net-http-rest-bff:dev -f stacks/go/net-http/rest/Dockerfile stacks/go/net-http/rest

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
# golang:1.25-alpine — digest pinned 2026-04-09 (ADR-0008)
FROM golang:1.25-alpine@sha256:7a00384194cf2cb68924bbb918d675f1517357433c8541bac0ab2f929b9d5447 AS builder

WORKDIR /src

# Download dependencies first for better layer caching.
COPY go.mod ./
RUN go mod download

# Copy source and compile the selected service.
COPY . .
ARG SERVICE=bff
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /app/service ./${SERVICE}

# ---------------------------------------------------------------------------
# Stage 2: runtime (distroless static — no shell, minimal attack surface)
# ---------------------------------------------------------------------------
# gcr.io/distroless/static-debian12:nonroot — digest pinned 2026-04-09 (ADR-0008)
FROM gcr.io/distroless/static-debian12:nonroot@sha256:a9329520abc449e3b14d5bc3a6ffae065bdde0f02667fa10880c49b35c109fd1 AS runtime

COPY --from=builder /app/service /app/service

# Override loopback default (ADR-0006) for container context.
# Native runs use 127.0.0.1; containers must bind to 0.0.0.0.
ENV OUR_IDP_API_HOST=0.0.0.0
ENV OUR_IDP_WEB_HOST=0.0.0.0

EXPOSE 8000
EXPOSE 3000

USER nonroot:nonroot

# Security Scan stage
# ghcr.io/aquasecurity/trivy:0.56.2 — digest pinned 2026-04-09 (ADR-0008)
FROM ghcr.io/aquasecurity/trivy:0.56.2@sha256:26245f364b6f5d223003dc344ec1eb5eb8439052bfecb31d79aeba0c74344b3a AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
ENTRYPOINT ["/app/service"]
