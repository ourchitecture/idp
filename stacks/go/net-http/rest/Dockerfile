# syntax=docker/dockerfile:1
# Multi-stage build for the Go net/http REST stack.
# Use SERVICE build arg to select which binary to compile: web (default: bff).
#
# Build examples (from repo root):
#   docker build --build-arg SERVICE=web -t localhost/stemix-go-net-http-rest-web:dev -f stacks/go/net-http/rest/Dockerfile stacks/go/net-http/rest
#   docker build --build-arg SERVICE=bff -t localhost/stemix-go-net-http-rest-bff:dev -f stacks/go/net-http/rest/Dockerfile stacks/go/net-http/rest

ARG GO_VERSION=1.25

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
FROM golang:${GO_VERSION}-alpine AS builder

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
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

COPY --from=builder /app/service /app/service

# Override loopback default (ADR-0006) for container context.
# Native runs use 127.0.0.1; containers must bind to 0.0.0.0.
ENV OUR_IDP_API_HOST=0.0.0.0
ENV OUR_IDP_WEB_HOST=0.0.0.0

EXPOSE 8000
EXPOSE 3000

USER nonroot:nonroot

# Security Scan stage
FROM ghcr.io/aquasecurity/trivy:0.56.2 AS scanner
COPY --from=runtime / /
RUN trivy rootfs --exit-code 1 --severity HIGH,CRITICAL --no-progress /

FROM runtime
ENTRYPOINT ["/app/service"]
