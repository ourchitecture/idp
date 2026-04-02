# Stemix

Stemix is an Intelligent Development System (IDS) with an Intent-Driven Portal (IDP); a modern, AI-native development system that connects the software development process and digital supply chain to an organization's product development lifecycle.

**Documentation site**: [stemix.dev](https://stemix.dev)

## Roadmap and Current Capability Status

[ROADMAP.md](ROADMAP.md) is the target-state capability map for the platform.
It describes where Stemix IDP is headed, not a guarantee that every capability
already exists in the current repository.

Today, the repo primarily provides:

- contract-first health, readiness, UI, and MCP validation
- reference Go and Node.js stacks
- an API-first IDP status MVP for IDP-owned components
- an external status publisher that emits static JSON and HTML from the same
  live status contract

Planned capabilities such as plug-in-based external system status, identity,
policy, analytics, and broader governance remain roadmap items until they are
implemented and documented as current behavior.

## What is IDP?

The Intent-Driven Portal is an evolution of the Internal Developer Portal concept. It shares the IDP acronym intentionally, but goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

## Design Principles and Goals

These principles guide every architectural decision in Stemix. They represent
target-state commitments being progressively implemented — not all are fully
realized yet. See [stemix.dev](https://stemix.dev) for current implementation
status.

> **Status note:** This is early-stage open source software. Some principles
> below describe working capabilities today; others are design goals actively
> in progress. Community contributions are welcome at every level.

**Working today:**

- **Container-First** -- All services designed for container deployment from
  day one. Dockerfiles, distroless images, and GHCR publishing are in place.
- **Contract-First** -- Gherkin intent specs and a contract test harness enforce
  behavioral contracts across reference stacks.
- **Privacy and Secret Scanning** -- Automated scanning is wired into CI via
  gitleaks and semgrep.
- **AI over MCP-First** -- Model Context Protocol as the standard AI integration
  layer. MCP server infrastructure is in place with initial stub tools.

**Design goals (in progress):**

- **Secure by Default** -- Zero-trust, encrypted at rest and in transit, least
  privilege everywhere. _(Current reference stacks are HTTP-only with no
  production auth layer yet.)_
- **AI-First** -- AI capabilities are core to the platform, not bolted on.
  _(MCP server infrastructure exists; broader AI integration is in progress.)_
- **Extensible** -- Plug-in/extension architecture with clear contracts and
  sandboxing. _(Plug-in SDK is not yet implemented.)_
- **Self-Service Hosting** -- Run the full stack privately with minimal
  operational burden. _(Containers build and run locally; Kubernetes/Helm
  automation is not yet available.)_
- **Multi-Tenant SaaS Ready** -- Strong tenant isolation with options for
  dedicated physical infrastructure. _(Tenant model and data isolation are not
  yet implemented.)_

## Project Structure

```text
stacks/     Reference implementation stacks, organized by language/framework/interface
deploy/     Container definitions, Kubernetes manifests, Helm charts (planned)
plugins/    Plug-in SDK and example plug-ins (planned)
docs/       Docusaurus documentation site (docs/content/ is the source of truth)
tests/      Contract test harness (TypeScript) and Layer 1 Gherkin intent specs
tools/      Developer tooling, MCP adapters, and the static status publisher
```

**Key documentation:**

- [docs/content/testing/contract-harness.md](docs/content/testing/contract-harness.md) --
  Contract test harness guide (newcomers, implementers, and contributors)
- [docs/content/security.md](docs/content/security.md) -- Security and privacy scanning guide
- [ROADMAP.md](ROADMAP.md) -- Target-state capability roadmap and sequencing input
- [tools/status/README.md](tools/status/README.md) -- Static JSON and HTML status publisher for external hosting
- [docs/content/architecture/decisions/](docs/content/architecture/decisions/) -- Architecture Decision Records (ADR index)
- [docs/content/architecture/diagrams/](docs/content/architecture/diagrams/) -- C4 architecture diagrams (context, container, and component views)
- [docs/content/containers/](docs/content/containers/) -- Container images: building, running, and publishing
- [SOCIAL.md](SOCIAL.md) -- Social media guidance and content flow

## Getting Started

> This project is in early development. Setup instructions will be added as the platform takes shape.

### Prerequisites

- Access to the [ourchitecture](https://github.com/ourchitecture) GitHub organization
- proto `0.55.4` (recommended for pinned toolchain installs)
- Go `1.25.0` (managed by proto)
- Node.js `24.0.0` with npm bundled (managed by proto)
- Python `3.12.11` + `uv 0.9.11` (managed by proto for privacy scanning)
- Docker (optional -- only required for container builds; Rancher Desktop with
  `dockerd (moby)` engine is the recommended FOSS alternative)

### Quickstart

The fastest path to a running local stack:

```bash
# Install Node.js dependencies
npm install

# (Optional) Pin and install the full toolchain via proto
proto install

# Start the default stack (web + BFF)
make dev
```

That starts the Go web server and BFF, both bound to `127.0.0.1` by default.
Open the web UI at `http://127.0.0.1:<port>` once the servers report ready.

Run all checks before opening a PR:

```bash
make check
```

See all available `make` targets:

```bash
make help
```

### Tooling Policy

This project standardizes workflows around `moon` while keeping language tooling
flexible for contributors.

- `moon` is required for maintainer and CI orchestration.
- `proto` is recommended for consistent pinned toolchain setup, but contributors
  may use system-installed Go/Node directly.
- GNU Make targets are supported as convenient local shortcuts and CI
  compatibility wrappers; use them whenever `moon` is not installed.

For Python-based security tooling, this repository uses `uv` with isolated
ephemeral environments (`uv tool run`) instead of ad-hoc global pip installs.
When `proto` is installed, both `python` and `uv` versions are pinned via
`.prototools`. Moon integrates this via `unstable_python` and `unstable_uv`
toolchain IDs mapped through `.prototools [plugins.tools]`.

Install and pin tooling with proto (recommended):

```bash
proto install
```

Run common checks with moon (or use the equivalent `make` targets below):

```bash
moon run repo:check-lint-md
moon run repo:check-privacy
moon run go-net-http-rest:check-ci
moon run nodejs-react-fastify-rest:check-ci
```

### Development

All development follows the issue-driven workflow defined in [AGENTS.md](AGENTS.md). Work is tracked via GitHub Issues and authorized through the `@idp-admin` and `@idp-maintain` teams.

Agent workflow skills are available in `/.claude/skills/`:

- `/find-work` to discover the next authorized issue.
- `/plan-work issue_number=<N>` to prepare an implementation plan.
- `/ship-changes issue_number=<N>` to commit, open a PR, and merge.
- `/audit-work-integrity` to enforce strict branch/PR/issue linkage hygiene.

### Documentation Site

The Stemix documentation site lives at [stemix.dev](https://stemix.dev) and is built with [Docusaurus 3](https://docusaurus.io/). Source is in `docs/`.

VS Code includes first-class docs workflows in `.vscode/tasks.json` and `.vscode/launch.json`:

- Task: `Run: Docs Site (Docusaurus Dev)`
- Task: `Dev: Start Full System + Docs`
- Task: `Build: Docs Site`
- Task: `Check: Docs Site (lint + typecheck + diagrams)`
- Launch profile: `Launch: Docs Site (Browser)`
- Launch compound: `Debug: Full System + Docs`

For Go F5 debugging, debug prerequisites are installed through stack Make/moon
tasks (`build-debug-web` / `build-debug-bff`) rather than manual ad-hoc tool
installs.

Run the docs dev server locally:

```bash
# moon canonical
moon run docs-site:run-dev

# make convenience shortcut
make docs-site
```

Build the static site:

```bash
make -C docs build
# or: moon run docs-site:build
```

Run full docs validation (install, build, lint, typecheck):

```bash
make -C docs all
# or: moon run docs-site:all
```

Generate architecture diagram SVG assets from Mermaid C4 sources:

```bash
make -C docs generate-diagrams
# or: moon run docs-site:generate-diagrams
```

Validate the diagram generation pipeline:

```bash
make -C docs check-diagrams
# or: moon run docs-site:check-diagrams
```

### Implementation Portfolio

- Default and canonical reference stack: `stacks/go/net-http/rest`
- Additional React-focused reference stack:
  `stacks/nodejs/react-fastify/rest`

Start the default stack (convenience shortcut):

```bash
make dev
```

Or invoke individual servers directly with moon:

```bash
moon run go-net-http-rest:run-web
moon run go-net-http-rest:run-bff
```

Run conventional checks for the default stack:

```bash
# Convenience shortcut (runs lint, tests, and contract checks)
make check

# Or with moon
moon run go-net-http-rest:check-ci
```

Run Markdown lint checks:

```bash
# Convenience shortcut
make check-lint-md

# Or with moon
moon run repo:check-lint-md
```

Run privacy and secret scanning:

```bash
# Convenience shortcut
make check-privacy

# Or with moon
moon run repo:check-privacy
```

Run full verification across all detected stacks:

```bash
# Convenience shortcut (iterates all detected stacks automatically)
make all

# Or with moon (explicit per stack)
moon run go-net-http-rest:all
moon run nodejs-react-fastify-rest:all
```

Run stack-only tests (without full check suite):

```bash
make check-test
```

Local runtime defaults bind to loopback (`127.0.0.1`). Override hosts only when
you explicitly need LAN or container-network exposure:

- `OUR_IDP_WEB_HOST`
- `OUR_IDP_API_HOST`

Run contract tests against a running stack:

```bash
make test
```

Publish static status artifacts from the live BFF status API:

```bash
tsx tools/status/publish-status.ts
```

See [docs/content/testing/contract-harness.md](docs/content/testing/contract-harness.md) for a
full guide to the test harness, including how to run individual profiles, how
to test alternate stacks, and how to build a new compliant implementation.

Start the additional React stack directly:

```bash
make -C stacks/nodejs/react-fastify/rest run-web
make -C stacks/nodejs/react-fastify/rest run-bff
```

### Container Images

All reference stacks and the contract test harness have container images.
Container builds are opt-in and silently skipped when Docker is not installed.

Build all container images locally:

```bash
make build-containers
```

Build a single stack's containers:

```bash
make -C stacks/go/net-http/rest build-containers
make -C stacks/nodejs/react-fastify/rest build-containers
make -C tests build-container
```

Run containers locally:

```bash
# Go stack
docker run --rm -p 8300:8300 localhost/stemix-go-net-http-rest-bff:latest
docker run --rm -p 3300:3300 localhost/stemix-go-net-http-rest-web:latest

# Contract tests against a running stack
docker run --rm \
  -e IDP_WEB_URL=http://host.docker.internal:3300 \
  -e IDP_BFF_URL=http://host.docker.internal:8300 \
  localhost/stemix-contract-tests:latest
```

Published images are available at `ghcr.io/ourchitecture/idp/stemix-*`.
See [docs/content/containers/](docs/content/containers/) for the full guide.

## Contributing

Contributions are welcome from authorized team members. See [AGENTS.md](AGENTS.md) for development standards, verification flows, and the change promotion pipeline. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor guide.

External contributions are accepted via issues and pull requests, subject to triage and approval by the maintainer team.

## License

This project is licensed under the [MIT License](LICENSE).
