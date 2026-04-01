# Stemix

Stemix is an Intelligent Development System (IDS) with an Intent-Driven Portal (IDP); a modern, AI-native development system that connects the software development process and digital supply chain to an organization's product development lifecycle.

**Documentation site**: [stemix.dev](https://stemix.dev)

## What is IDP?

The Intent-Driven Portal is an evolution of the Internal Developer Portal concept. It shares the IDP acronym intentionally, but goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

**Core design principles:**

- **Secure by Default** -- Zero-trust, encrypted at rest and in transit, least privilege everywhere.
- **Container-First** -- All services designed for container deployment from day one.
- **AI-First** -- AI capabilities are core to the platform, not bolted on.
- **AI over MCP-First** -- Model Context Protocol as the standard AI integration layer.
- **Extensible** -- Plug-in/extension architecture with clear contracts and sandboxing.
- **Self-Service Hosting** -- Run the full stack privately with minimal operational burden.
- **Multi-Tenant SaaS Ready** -- Strong tenant isolation with options for dedicated physical infrastructure.

## Project Structure

```text
stacks/     Reference implementation stacks, organized by language/framework/interface
deploy/     Container definitions, Kubernetes manifests, Helm charts
plugins/    Plug-in SDK and example plug-ins
docs/       Docusaurus documentation site (docs/content/ is the source of truth)
tests/      Contract test harness (TypeScript) and Layer 1 Gherkin intent specs
tools/      Developer tooling, scripts, and MCP server definitions
```

**Key documentation:**

- [docs/content/testing/contract-harness.md](docs/content/testing/contract-harness.md) --
  Contract test harness guide (newcomers, implementers, and contributors)
- [docs/content/architecture/decisions/](docs/content/architecture/decisions/) -- Architecture Decision Records (ADR index)
- [docs/content/containers/](docs/content/containers/) -- Container images: building, running, and publishing

## Getting Started

> This project is in early development. Setup instructions will be added as the platform takes shape.

### Prerequisites

- Access to the [ourchitecture](https://github.com/ourchitecture) GitHub organization
- Go 1.25+
- Node.js 20+
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

Install and pin tooling with proto (recommended):

```bash
proto install
```

Run common checks with moon (or use the equivalent `make` targets below):

```bash
moon run repo:check-lint-md
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
