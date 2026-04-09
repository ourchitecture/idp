---
sidebar_position: 7
title: Versioning Strategy
---

# Versioning Strategy

Stemix IDP pins every external dependency at every layer of the stack. This
document explains the policy, the layers it covers, and the automation that
keeps pins current.

The authoritative policy is
[ADR-0008 — Dependency and Tooling Pinning Policy](architecture/decisions/dependency-and-tooling-pinning-policy).

## Why pin everything?

Unpinned or loosely-pinned dependencies cause reproducibility failures,
supply-chain risk, and hard-to-debug transient failures. Pinning every layer
ensures that:

- The same commit produces the same build across time and machines.
- Version upgrades are explicit, diff-visible pull requests.
- Supply-chain attacks via mutable tags or digests are blocked.

## Layers and policies

### Language runtimes and toolchain binaries

**Tooling:** [proto](https://moonrepo.dev/proto) + `.prototools`

All language runtimes (`node`, `go`, `moon`, `proto`, `python`, `uv`) are
pinned at an exact version in `.prototools`. This is the **single authoritative
source** for toolchain versions across local development, CI, and Docker builds.

| Tool | Version | LTS? |
|------|---------|------|
| Node.js | 24.14.1 | Yes (LTS "Jod") |
| Go | 1.25.0 | No |
| Python | 3.12.11 | Yes |
| moon | 2.1.3 | — |
| proto | 0.55.4 | — |
| uv | 0.9.11 | — |

When `proto` detects a newer version, Renovate opens a pull request to update
`.prototools`.

### Node.js / npm packages

**Tooling:** npm workspaces + `package-lock.json` + Dependabot

- Each sub-project declares its own `package.json` with exact or
  patch-bounded (`~`) versions for CLI tooling devDependencies.
- Use `npm ci` (not `npm install`) in CI and Dockerfiles to enforce the
  lockfile.
- Every project has a committed `package-lock.json`.

**Sub-project manifests covered by Dependabot:**

| Directory | Notes |
|-----------|-------|
| `/` (root) | CLI tools, stack shared deps |
| `/docs` | Docusaurus site |
| `/tools/mcp` | MCP server |
| `/tools/vscode-extension` | VS Code extension |
| `/stacks/nodejs/react-fastify/rest` | Node.js stack |
| `/tools/backstage` | Backstage (if present) |

### Go modules

**Tooling:** `go.mod` + `go.sum` + Dependabot

`go.mod` pins module versions exactly. `go.sum` is committed. Dependabot
opens pull requests for module updates.

### Maven / Java

**Tooling:** `pom.xml` + Dependabot

`tools/mock-oauth/pom.xml` pins all Maven dependencies. Dependabot covers the
`/tools/mock-oauth` directory.

### Container images

**Tooling:** `idp-versions.yml` + Renovate (Dockerfile datasource)

All `FROM` lines in every Dockerfile must specify both a human-readable tag
**and** a sha256 digest for reproducibility and supply-chain safety:

```dockerfile
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS builder
```

- `latest` tags are forbidden.
- The `idp-versions.yml` file at the repo root is the authoritative catalog of
  current container image versions and digests.
- Renovate updates both the tag and the digest together in a single PR per
  Dockerfile.
- Each Dockerfile update is a **separate pull request** to keep changes small
  and auditable.

**Image policies:**

| Image | Tag strategy | LTS preference |
|-------|-------------|----------------|
| `golang` | `X.Y-alpine` | Use current stable |
| `node` | `X.Y.Z-alpine` | Yes — use Node.js LTS |
| `nginx` | `X.Y-alpine` | Use stable branch |
| `eclipse-temurin` | `X-jdk-alpine` / `X-jre-alpine` | Yes — use LTS JDK |
| `distroless/static-debian12` | `nonroot` | Tracked by digest |
| `aquasecurity/trivy` | `X.Y.Z` | Latest stable |

### GitHub Actions

**Tooling:** Dependabot (github-actions ecosystem) + Renovate (optional)

Per ADR-0008, bare major-version tags (`@v3`) are **not acceptable**. Every
`uses:` reference must be pinned to either:

1. A commit SHA with an inline version comment (required for third-party
   actions not from `actions/*` or `moonrepo/*`):
   ```yaml
   - uses: docker/login-action@4907a6ddec9925e35a0a9e82d7399ccc52663121 # v4.1.0
   ```
2. A pinned minor-version tag (acceptable for well-governed publishers):
   ```yaml
   - uses: actions/checkout@v4.3.1
   ```

Dependabot (`github-actions` ecosystem) covers all workflows under
`.github/workflows/` and opens weekly pull requests when new minor versions
are available.

## Automation overview

| Layer | Update tool | PR scope |
|-------|-------------|----------|
| Language runtimes (`.prototools`) | Renovate | One PR per tool |
| npm packages | Dependabot | One PR per sub-project |
| Go modules | Dependabot | One PR per `go.mod` |
| Maven | Dependabot | One PR per `pom.xml` |
| Container images (Dockerfiles) | Renovate | One PR per Dockerfile |
| GitHub Actions | Dependabot | Grouped per workflow directory |

## Validation checklist

Use these checks to verify version-pin compliance after any change:

```bash
# Dockerfiles must have @sha256: on every FROM line
grep -r "^FROM " --include="Dockerfile" | grep -v "@sha256:" && echo "FAIL: missing digest" || echo "OK"

# Workflows must not use bare major-version tags
grep -rn "uses:" .github/workflows/ | grep -E "@v[0-9]+$" && echo "FAIL: bare major tag" || echo "OK"

# npm CI must be used, not npm install
grep -rn "npm install" .github/workflows/ && echo "WARN: prefer npm ci" || echo "OK"

# .prototools must have exact versions (no ranges)
grep -E "[><=^~]" .prototools && echo "FAIL: range in prototools" || echo "OK"
```

## Updating versions

- **Automated upgrades:** Dependabot and Renovate open pull requests
  automatically. Merge them to keep pins current.
- **Manual upgrades:** Update the relevant file and the corresponding entry in
  `idp-versions.yml`, then open a pull request.
- **Toolchain upgrades:** Update `.prototools` first (the authoritative source),
  then update any Dockerfile `FROM` lines that hardcode the same version.

See [Container Versioning and Releases](containers/versioning) for the
per-component semantic versioning and release cadence.
