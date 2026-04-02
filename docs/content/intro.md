---
sidebar_position: 1
---

# Introduction

Stemix is an **Intelligent Development System (IDS)** with an Intent-Driven Portal (IDP) — a modern, AI-native development platform that connects the software development process and digital supply chain to an organization's product development lifecycle.

## What is the Intent-Driven Portal?

The Intent-Driven Portal is an evolution of the Internal Developer Portal concept. It shares the IDP acronym intentionally, but goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

## Core Design Principles

- **Secure by Default** — Zero-trust, encrypted at rest and in transit, least privilege everywhere.
- **Container-First** — All services designed for container deployment from day one.
- **AI-First** — AI capabilities are core to the platform, not bolted on.
- **AI over MCP-First** — Model Context Protocol as the standard AI integration layer.
- **Extensible** — Plug-in/extension architecture with clear contracts and sandboxing.
- **Self-Service Hosting** — Run the full stack privately with minimal operational burden.
- **Multi-Tenant SaaS Ready** — Strong tenant isolation with options for dedicated physical infrastructure.

## Choose Your Path

- **IDP users and decision stakeholders (primary)**:
  - Start with [Architecture Diagrams](./architecture/diagrams/) and follow the user-first path.
  - Focus on Level 1 user context, Level 2 user capabilities, and Level 3 user workflows.
- **IDP implementers and operators**:
  - Start with [Architecture Diagrams](./architecture/diagrams/) delivery and implementation path.
  - Continue with [Testing](./testing/) and [Container Images](./containers/).
- **IDP project maintainers**:
  - Start with [Architecture Decisions](./architecture/decisions/).
  - Use implementation and delivery diagrams for governance and release context.

## Getting Started

The fastest path to a running local stack:

```bash
# Install Node.js dependencies
npm install

# (Recommended) Pin and install the full toolchain via proto
proto install

# Start the default stack (web + BFF)
make dev
```

That starts the Go web server and BFF, both bound to `127.0.0.1` by default.

Run all checks before opening a PR:

```bash
make check
```

## Project Structure

```text
stacks/     Reference implementation stacks, organized by language/framework/interface
deploy/     Container definitions, Kubernetes manifests, Helm charts
plugins/    Plug-in SDK and example plug-ins
docs/       Docusaurus documentation site (docs/content/ is the source of truth)
tests/      Contract test harness (TypeScript) and Layer 1 Gherkin intent specs
tools/      Developer tooling, scripts, and MCP server definitions
```

## Toolchain Baseline

- Managed with `proto` + `.prototools` for reproducible local and CI tooling.
- Pinned runtimes include Go, Node.js/npm, Python, and `uv`.
- Python-based security scanning uses `uv tool run` for isolated ephemeral
  environments instead of global pip installs.

## Further Reading

- [Architecture Decisions](./architecture/decisions/) -- ADR index
- [Architecture Diagrams](./architecture/diagrams/) -- C4 context, container, and component visuals
- [Container Images](./containers/) -- Building, running, and publishing containers
- [Contract Test Harness](./testing/contract-harness) -- How the implementation-agnostic test suite works
- [GitHub Repository](https://github.com/ourchitecture/idp)
