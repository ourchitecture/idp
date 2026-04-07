---
sidebar_position: 2
title: Cache Management
---

Stemix CI caches common toolchains to keep validation fast while still degrading safely when cache servers are slow or unavailable.

## What we cache

- **Tooling bootstrap**: `~/.proto`, moon caches.
- **Node.js**: `~/.npm` keyed by all repository `package-lock.json` files.
- **Go**: `~/go/pkg/mod`, `~/.cache/go-build` keyed by `.prototools` and the Go module files in `stacks/go/net-http/rest/`.
- **Python (uv/pip)**: `~/.cache/uv`, `~/.cache/pip` keyed by `.prototools` and `scripts/ci/check-privacy.sh`.
- **Maven**: `~/.m2/repository`, `~/.m2/wrapper` keyed by `tools/mock-oauth` Maven wrapper metadata.
- **Docker Buildx**: `gha` caches with unique scopes per image (`go-net-http-rest-web`, `go-net-http-rest-bff`, `nodejs-react-fastify-rest-web`, `nodejs-react-fastify-rest-bff`, `contract-tests`, `mcp-tools`, `mock-oauth`) with `ignore-error=true` and `timeout=10m`.

## What we do not cache

- Build artifacts and node_modules are rebuilt per run.
- Cache steps run with `continue-on-error: true` and `SEGMENT_DOWNLOAD_TIMEOUT_MINS=3` so cache outages fall back to cache misses instead of failing jobs.

## Manual cache cleanup

Use the **Cache Cleanup** workflow (`.github/workflows/cache-cleanup.yml`) when you need to remove stale GitHub Actions caches.

Inputs:

- `cache_id` or `cache_key` — delete a single cache.
- `delete_all` — delete every cache (requires `confirm_all: true`).
- `ref` — limit operations to a ref.
- `succeed_on_no_caches` — let `delete_all` exit 0 when nothing is found.

All deletions run through `scripts/ci/gh-cache-delete.sh`, which prints the exact `gh cache delete` command and lists caches before and after. When using `delete_all`, always set `confirm_all: true` to opt in explicitly to destructive cleanup.
