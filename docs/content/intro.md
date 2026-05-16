---
sidebar_position: 1
---

# Introduction

Stemix is an **Intelligent Development System (IDS)** with an Intent-Driven Portal (IDP) — a modern, AI-native development platform that connects the software development process and digital supply chain to an organization's product development lifecycle.

## What is the Intent-Driven Portal?

The Intent-Driven Portal is an evolution of the Internal Developer Portal concept. It shares the IDP acronym intentionally, but goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

## Core Design Principles

These principles guide every architectural decision in Stemix. They represent our
target-state commitments — some are fully implemented today, others are actively
being built. See the [Project Status](./project-status) page for current details.

:::info Early Alpha
Stemix is in early alpha. The container-first delivery, contract testing foundations,
and MCP server infrastructure are solid. Security hardening, multi-tenancy, and the
plug-in system are on the roadmap but not yet implemented.
:::

### Implemented Today

- **Container-First** — All services designed for container deployment from day one.
  Dockerfiles, distroless images, and GHCR publishing are in place.
- **AI over MCP-First** — MCP server infrastructure is in place with initial tools.
  Model Context Protocol is the standard AI integration layer.
- **Intent-Driven Architecture** — Layered Gherkin intent specs drive contract tests
  and implementation across language stacks.
- **Privacy and Secret Scanning** — Automated scanning runs in CI to protect the
  supply chain from leaked credentials and sensitive data.

### In Progress (Design Goals)

- **Secure by Default** — Zero-trust, encrypted at rest and in transit, least
  privilege everywhere. Current services are plain HTTP; TLS and RBAC are planned.
- **Extensible** — Plug-in/extension architecture with clear contracts and
  sandboxing. The plug-in system is not yet implemented.
- **Self-Service Hosting** — Run the full stack privately with minimal operational
  burden. Container builds work today; Kubernetes/Helm automation is on the roadmap.
- **Multi-Tenant SaaS Ready** — Strong tenant isolation with options for dedicated
  physical infrastructure. No tenant model or data isolation exists yet.

## Choose Your Path

- **IDP users and decision stakeholders (primary)**:
  - Start with [Architecture Diagrams](./architecture/diagrams/) and follow the user-first path.
  - Focus on Level 1 user context, Level 2 user capabilities, and Level 3 user workflows.
- **Flow insight MVP language (all roles)**:
  - Start with [Flow Insights](./flow/) to learn the canonical model and signals that stay provider-neutral.
- **IDP implementers and operators**:
  - Start with [Architecture Diagrams](./architecture/diagrams/) delivery and implementation path.
  - Continue with [Testing](./testing/) and [Container Images](./containers/).
- **IDP project maintainers**:
  - Start with [Architecture Decisions](./architecture/decisions/).
  - Use implementation and delivery diagrams for governance and release context.

## Getting Started

The fastest path to a running local stack:

```bash
# (Recommended) Pin and install the full toolchain via proto
proto install

# Install workspace dependencies and repo-local CLIs
pnpm install

# Start the default stack (web + BFF)
make dev
```

That starts the Go web server and BFF, both bound to `127.0.0.1` by default.

Run all checks before opening a PR:

```bash
make check
```

Run the repo-local Pi coding agent after `pnpm install`:

```bash
pnpm run pi -- --help
```

## Project Structure

```text
stacks/     Reference implementation stacks, organized by language/framework/interface
deploy/     Container definitions, Kubernetes manifests, Helm charts (planned)
plugins/    Plug-in SDK and example plug-ins (planned)
docs/       Docusaurus documentation site (docs/content/ is the source of truth)
tests/      Contract test harness (TypeScript) and Layer 1 Gherkin intent specs
tools/      Developer tooling, scripts, and MCP server definitions
```

## Toolchain Baseline

- Managed with `proto` + `.prototools` for reproducible local and CI tooling.
- Pinned runtimes include Go, Node.js, pnpm, Python, and `uv`.
- `pnpm install` installs workspace dependencies and repository-local developer
  CLIs such as `opencode` and `pi`; run Pi with `pnpm run pi -- <args>`.
- `tools/backstage` remains separate as a Yarn 4 workspace while Backstage-specific package
  manager requirements are handled in a future migration.
- Python-based security scanning uses `uv tool run` for isolated ephemeral
  environments instead of global pip installs.

## Further Reading

- [Architecture Decisions](./architecture/decisions/) -- ADR index
- [Architecture Diagrams](./architecture/diagrams/) -- C4 context, container, and component visuals
- [Container Images](./containers/) -- Building, running, and publishing containers
- [Contract Test Harness](./testing/contract-harness) -- How the implementation-agnostic test suite works
- [Operations](./operations/) -- Maintenance runbooks including cache cleanup
- [GitHub Repository](https://github.com/ourchitecture/idp)
