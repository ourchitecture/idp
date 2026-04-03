# ADR-0010: Container Build Strategy and Image Naming

**Status:** Accepted

**Date:** 2026-03-31

## Context

The IDP project is container-first by design principle. This ADR establishes the
authoritative decisions for how containers are built, named, versioned, and
published so that all stacks and the contract test harness are consistently
containerized and independently releasable.

### Gate assessment (intake threshold per AGENTS.md)

- **Cross-cutting scope** — all stacks and the test harness are affected.
- **Costly to reverse** — container image names published to a registry are
  effectively permanent; renaming requires a coordinated deprecation and re-pull
  by all consumers.
- **Contract surface** — published image names and environment variable
  interfaces are externally consumed contracts.
- **Multi-quarter longevity** — container names and the versioning scheme are
  expected to be stable across the lifetime of the project.
- **Drift risk** — without a recorded decision, independent contributors may
  introduce inconsistent naming, tag formats, or build patterns across stacks.

All five gates are true. Two are hard gates (costly to reverse, contract
surface). The intake threshold is met.

## Decision

### 1. Image naming convention

Images follow the pattern `stemix-<stack-id>-<service>`, where `<stack-id>`
encodes the language, framework, and interface of the stack and `<service>` is
`web` or `bff`. The contract test container is `stemix-contract-tests`.

Current images:

| Image name | Stack |
| --- | --- |
| `stemix-go-net-http-rest-web` | Go net/http REST — web tier |
| `stemix-go-net-http-rest-bff` | Go net/http REST — BFF tier |
| `stemix-nodejs-react-fastify-rest-web` | Node.js React/Fastify REST — web tier |
| `stemix-nodejs-react-fastify-rest-bff` | Node.js React/Fastify REST — BFF tier |
| `stemix-contract-tests` | Implementation-agnostic contract test harness |

### 2. Registry prefix model

| Context | Registry prefix | Example |
| --- | --- | --- |
| Local developer builds | `localhost/` | `localhost/stemix-go-net-http-rest-web:dev` |
| CI intermediate builds | `localhost/` | `localhost/stemix-go-net-http-rest-web:ci` |
| Published releases | `ghcr.io/ourchitecture/idp/` | `ghcr.io/ourchitecture/idp/stemix-go-net-http-rest-web:0.1.0-alpha.1` |

All published images include the repository path (`/ourchitecture/idp/`) so they
are linked to the repository in GitHub Packages and not floating at the
organization level.

### 3. Dockerfile patterns

#### Go stacks — multi-stage with distroless final image

```text
Stage 1 (builder): golang:<version>-alpine
  - go mod download
  - go build -o /app/service ./<web|bff>

Stage 2 (runtime): gcr.io/distroless/static-debian12:nonroot
  - COPY --from=builder /app/service /app/service
  - ENV OUR_IDP_API_HOST=0.0.0.0 (or OUR_IDP_WEB_HOST=0.0.0.0)
  - USER nonroot:nonroot
  - ENTRYPOINT ["/app/service"]
```

A single `Dockerfile` at the stack root uses a `SERVICE` build arg (`web` or
`bff`) to select which binary to compile. This avoids duplicating the identical
builder stage.

#### Node.js BFF — multi-stage TypeScript compile then slim Node runtime

```text
Stage 1 (builder): node:<version>-alpine
  - npm ci (from repo root context)
  - tsc --project bff/tsconfig.json

Stage 2 (runtime): node:<version>-alpine
  - COPY --from=builder dist/ dist/
  - ENV OUR_IDP_API_HOST=0.0.0.0
  - CMD ["node", "dist/server.js"]
```

#### Node.js web — multi-stage Vite build then nginx production server

```text
Stage 1 (builder): node:<version>-alpine
  - npm ci (from repo root context)
  - vite build

Stage 2 (runtime): nginx:alpine
  - COPY dist/ /usr/share/nginx/html/
  - Custom nginx.conf: SPA fallback routing + proxy_pass /api/* to BFF
  - envsubst for runtime BFF_URL injection
  - EXPOSE 3000
```

The nginx container proxies `/api/*` to the BFF whose URL is provided at
container start via `BFF_URL` environment variable. This is required because
`api-client.ts` uses relative paths by default (`/api/...`) which the browser
resolves against the web server origin.

#### Contract tests — single-stage Node runtime

```text
Stage 1: node:<version>-alpine
  - npm ci
  - COPY tests/src tests/features
  - ENV IDP_WEB_URL (required at runtime)
  - ENV IDP_BFF_URL (required at runtime)
  - CMD ["npm", "run", "test:contract"]
```

### 4. Container HEALTHCHECK instructions

All service Dockerfiles should include a `HEALTHCHECK` instruction targeting the
`/health` endpoint defined in ADR-0011. This enables Docker, Compose, and
orchestrators to monitor container health without external configuration.

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "--quiet", "--tries=1", "--spider", "http://localhost:<port>/health"]
```

Where `<port>` is the service default (`3000` for web, `8000` for BFF). The
`wget` command is preferred over `curl` because distroless and Alpine-based
images may not include `curl` but `wget` is available in Alpine and can be added
as a static binary in distroless stages. For distroless images that lack a shell
and `wget`, a compiled health-check binary or `/bin/true`-based probe may be
used as a fallback (document the trade-off in the Dockerfile).

The nginx-based Node.js web container uses `curl` or `wget` from the Alpine
layer available in the nginx image.

### 5. Container host binding

Native runs default to `127.0.0.1` (loopback) per ADR-0006 to avoid OS
firewall prompts on Windows and macOS during local development. Inside a
container, the server must bind to `0.0.0.0` to be reachable from outside the
container namespace. Dockerfiles set `OUR_IDP_WEB_HOST=0.0.0.0` and
`OUR_IDP_API_HOST=0.0.0.0` as `ENV` defaults, overriding the loopback default
without touching source code.

### 6. Docker is opt-in; not managed by proto

Docker (Docker Desktop, Rancher Desktop, or Docker Engine) is a system-level
tool and is not managed by `proto`. It is **optional** for local development.

`make all` silently skips container builds if `docker` is not found on `PATH`.
Dedicated `make build-container-*` targets fail with a clear error message if
`docker` is absent, making the opt-in explicit.

On Windows 11, Rancher Desktop with the `dockerd (moby)` engine setting provides
a fully compatible `docker` CLI. Using the `containerd (nerdctl)` engine setting
may result in compatibility differences.

### 7. Version tag matrix

Per-component independent SemVer (see ADR-0004 and the release-please
configuration) produces the following tag matrix per image:

| Tag | Example | When created |
| --- | --- | --- |
| Full semver | `0.1.0-alpha.1` | Every release (pre-release and stable) |
| `edge` | `edge` | Every push to `main` (latest unreleased build) |
| `major.minor` | `0.1` | Stable (non-pre-release) releases only |
| `major` | `0` | Stable (non-pre-release) releases only |
| `latest` | `latest` | Highest stable `major.minor` only; never set during pre-release |

The `latest` tag is maintained by a dedicated workflow that runs after each
successful container publish. It is never updated when the new version is a
pre-release, ensuring `latest` always points to a stable release.

### 8. Cleanup policy

A daily scheduled workflow deletes container versions below configurable floor
thresholds. Floor thresholds are defined as environment variables inline in the
`container-cleanup.yml` workflow file. The policy:

- Stable versions below the floor `major.minor` are deleted.
- Pre-release versions with a sequence number below the floor are deleted.
- Untagged (orphaned layer) versions are pruned to the most recent N.
- The `latest` and `edge` tags are never deleted.

### 9. Vulnerability scanning

All images are subject to automated vulnerability scanning:

- **Local:** Developers are encouraged to use `trivy image <image-name>` to scan local builds.
- **CI:** GitHub Actions use `aquasecurity/trivy-action` to scan images during the PR validation phase. High and Critical vulnerabilities in the application layer must be addressed before merging.
- **Registry:** A scheduled workflow scans published images on `ghcr.io` daily. Results are uploaded to the GitHub Security Tab.

The use of distroless and Alpine base images is a primary mitigation strategy to reduce the attack surface and minimize the number of detectable vulnerabilities in the OS layer.

## Consequences

- All published container names contain the repository path
  `ghcr.io/ourchitecture/idp/` and are visible as packages linked to the
  `ourchitecture/idp` repository in GitHub.
- Renaming an image name requires a deprecation notice and coordinated migration
  because existing consumers will have pinned the old name.
- The `latest` tag is absent during the pre-release alpha phase, which is
  intentional and documented.
- Contributors without Docker installed can run the full native `make all` flow
  without errors; container tasks are silently skipped.
- The Go stack uses a single `Dockerfile` with a `SERVICE` build arg, which
  deviates slightly from the "one Dockerfile per service" convention but is
  justified by the shared Go module root.
