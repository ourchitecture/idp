# AGENTS.md - Intelligent Development Portal (IDP)

## Project Overview

This project is an **Intelligent Development Portal (IDP)** -- a modern, AI-native evolution of the Internal Developer Portal concept. While it shares the IDP acronym intentionally, this project goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

The IDP connects the development process and the digital/software supply chain to an organization's broader product development lifecycle, providing strategic alignment between engineering execution and business outcomes.

## Core Principles

All contributions -- human or AI -- must align with these principles, listed in priority order:

1. **Secure by Default**: Security is not an add-on. Every feature, endpoint, dependency, and configuration must be secure out of the box. Follow zero-trust principles. Never store secrets in code. Encrypt data at rest and in transit. Apply the principle of least privilege everywhere.

2. **Container-First**: All services, tools, and environments must be designed to run in containers as the primary deployment target. Local development should use containers. CI/CD pipelines produce container images. Infrastructure assumes container orchestration (e.g., Kubernetes).

3. **AI-First**: AI capabilities are core to the platform, not bolted on. Features should leverage AI to reduce toil, improve developer experience, and automate repetitive tasks. Design APIs and data models with AI consumption and generation in mind.

4. **AI over MCP-First**: Prefer the Model Context Protocol (MCP) as the standard integration layer for AI capabilities. MCP servers and tools should be the primary mechanism for AI agents to interact with the platform. Design services to be MCP-compatible before considering alternative integration patterns.

5. **Extensible via Plug-ins**: The platform must support a plug-in/extension architecture. Core functionality should be minimal and opinionated, while allowing customization and extension without forking. Design clear extension points, APIs, and contracts.

6. **Self-Service Hosting**: Provide clear, tested guidance and tooling for private/on-premise hosting. Organizations must be able to run the full IDP stack independently with minimal operational burden.

7. **Multi-Tenant SaaS Ready**: Architecture must support eventual public SaaS hosting with strong tenant isolation, including options for dedicated and segregated physical infrastructure for customers with strict data sovereignty or compliance requirements.

## Architecture Guidelines

### Data Security and Isolation

- All data storage must support encryption at rest using industry-standard algorithms.
- All data transmission must use TLS 1.3 or higher.
- Multi-tenant data must be logically isolated by default, with options for physically segregated storage and compute for premium/compliance tiers.
- Personally identifiable information (PII) and secrets require additional access controls and audit logging.
- Design for data residency requirements from the start (region-aware storage and processing).

### Container and Infrastructure

- Every service must include a `Dockerfile` (or equivalent container build definition).
- Use multi-stage builds to minimize image size and attack surface.
- Base images should be pinned to specific versions and scanned for vulnerabilities.
- Services must be stateless where possible; state belongs in managed data stores.
- Health check, readiness, and liveness endpoints are required for all services.
- Configuration must be externalized via environment variables or mounted config files, never hardcoded.

### API and Integration Design

- Prefer REST or gRPC for service-to-service communication.
- All public APIs must be versioned from day one.
- MCP tool definitions should accompany any new capability that AI agents may invoke.
- OpenAPI/Swagger specs are required for all HTTP APIs.
- Rate limiting, authentication, and authorization must be enforced at the API gateway level.

### AI and MCP Integration

- New platform capabilities should expose MCP tool definitions alongside traditional APIs.
- AI agent workflows should be composable and observable (logging, tracing, audit trails).
- Prompt templates and AI configurations should be version-controlled and testable.
- LLM provider integrations must be abstracted behind a common interface to avoid vendor lock-in.
- Prefer Anthropic Claude models as the default LLM where applicable, but always behind an abstraction layer.

### Plug-in / Extension Architecture

- Plug-ins must be sandboxed and run with minimal permissions by default.
- Define clear lifecycle hooks: install, activate, deactivate, uninstall.
- Plug-in APIs should be versioned independently of the core platform.
- Plug-ins must not be able to bypass security controls or tenant isolation.

## Development Standards

### Code Quality

- Write clean, readable, well-tested code. Prefer clarity over cleverness.
- All code must pass linting and formatting checks before commit.
- Tests are required for new functionality: unit tests at minimum, integration tests for service boundaries.
- Code reviews (human or AI-assisted) are mandatory before merging to main branches.

### Dependency Management

- Pin all dependency versions. Use lock files.
- Regularly audit dependencies for known vulnerabilities.
- Prefer well-maintained, widely-adopted libraries. Minimize dependency count.
- No dependency should be added without understanding its license implications.

### Documentation

- Public APIs must have inline documentation and generated reference docs.
- Architecture decisions should be recorded as Architecture Decision Records (ADRs).
- Runbooks for operational tasks (deployment, scaling, incident response) should accompany infrastructure changes.

### Git and Version Control

- Use conventional commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`, `security:`).
- Branch names should follow: `<type>/<short-description>` (e.g., `feat/mcp-tool-registry`).
- Keep commits atomic and focused. One logical change per commit.
- Never commit secrets, credentials, or environment-specific configuration.

## Agent-Specific Instructions

### When Working on This Project

- Always check for and respect existing patterns before introducing new ones.
- If a decision involves a trade-off between security and convenience, choose security.
- When adding a new service or capability, also define its MCP tool interface.
- Containerize early. If you are creating a new service, include the Dockerfile in the same PR.
- Think about multi-tenancy implications for any data model or storage change.
- Consider the self-hosted deployment path: avoid hard dependencies on specific cloud providers.

### File and Directory Conventions

- `/src/` - Application source code, organized by service or module.
- `/deploy/` - Container definitions, Kubernetes manifests, Helm charts.
- `/plugins/` - Plug-in SDK and example plug-ins.
- `/docs/` - Project documentation, ADRs, and guides.
- `/tests/` - Integration and end-to-end tests (unit tests live alongside source).
- `/tools/` - Developer tooling, scripts, and MCP server definitions.

### Technology Preferences

- Favor TypeScript/JavaScript for web services and tooling where appropriate.
- Use proven container orchestration (Kubernetes) for production deployments.
- PostgreSQL as the default relational database; consider tenant-aware connection pooling.
- Redis or equivalent for caching and ephemeral state.
- Use structured logging (JSON) with correlation IDs across all services.
- OpenTelemetry for distributed tracing and metrics.

### What Not to Do

- Do not disable security features to make development easier.
- Do not introduce cloud-provider-specific lock-in without an abstraction layer.
- Do not bypass the plug-in sandbox or tenant isolation for any reason.
- Do not add AI/LLM calls without proper error handling, rate limiting, and cost awareness.
- Do not store secrets in code, environment files committed to version control, or container images.
