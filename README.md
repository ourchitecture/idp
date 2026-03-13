# Stemix

Stamix is an Intelligent Development System (IDS) with a Intelligent Development Portal (IDP); a modern, AI-native development system that connects the software development process and digital supply chain to an organization's product development lifecycle.

## What is IDP?

IDP is an evolution of the Internal Developer Portal concept. It shares the IDP acronym intentionally, but goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

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
- Node.js (see `.nvmrc` when available)
- Access to the `ourchitecture` GitHub organization

### Development

All development follows the issue-driven workflow defined in [AGENTS.md](AGENTS.md). Work is tracked via GitHub Issues and authorized through the `@idp-admin` and `@idp-maintain` teams.

## Contributing

Contributions are welcome from authorized team members. See [AGENTS.md](AGENTS.md) for development standards, verification flows, and the change promotion pipeline.

External contributions are accepted via issues and pull requests, subject to triage and approval by the maintainer team.

## License

This project is licensed under the [MIT License](LICENSE).
