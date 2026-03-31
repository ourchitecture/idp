# Stemix

Stemix is an Intelligent Development System (IDS) with an Intent-Driven Portal (IDP); a modern, AI-native development system that connects the software development process and digital supply chain to an organization's product development lifecycle.

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
src/        Application source code, organized by service or module
deploy/     Container definitions, Kubernetes manifests, Helm charts
plugins/    Plug-in SDK and example plug-ins
docs/       Project documentation, ADRs, and guides
tests/      Integration and end-to-end tests
tools/      Developer tooling, scripts, and MCP server definitions
```

## Getting Started

> This project is in early development. Setup instructions will be added as the platform takes shape.

### Prerequisites

- Docker and Docker Compose
- Go 1.25+
- Node.js 20+

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

### Implementation Portfolio

- Default and canonical reference stack: `src/stacks/go/net-http/rest`
- Additional React-focused reference stack:
  `src/stacks/nodejs/react-fastify/rest`

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

Start the additional React stack directly:

```bash
make -C src/stacks/nodejs/react-fastify/rest run-web
make -C src/stacks/nodejs/react-fastify/rest run-bff
```

## Contributing

Contributions are welcome from authorized team members. See [AGENTS.md](AGENTS.md) for development standards, verification flows, and the change promotion pipeline.

External contributions are accepted via issues and pull requests, subject to triage and approval by the maintainer team.

## License

This project is licensed under the [MIT License](LICENSE).
