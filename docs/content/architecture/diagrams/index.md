---
sidebar_position: 1
---

# Architecture Diagrams

These diagrams exist so anyone can understand how the IDP system fits together
before reading implementation details. They provide a shared visual model for
users, implementers, operators, and maintainers.

The repository uses the C4 model and Mermaid C4 syntax so the same source can be
read in GitHub Markdown and in Docusaurus.

## User-First Path

- [Level 1: User System Context (Current)](./level-1-system-context)
- [Level 1: User System Context (Target)](./level-1-system-context-target)
- [Level 2: User Capability Containers (Current and Target)](./level-2-user-capabilities)
- [Level 3: User Workflow Components (Current and Target)](./level-3-user-workflows)

## Delivery and Implementation Path

- [Level 1: Delivery Context (Current and Target)](./level-1-delivery-context)
- [Level 2: Implementer Containers (Go net/http stack)](./level-2-containers-go)
- [Level 2: Implementer Containers (Node.js React + Fastify stack)](./level-2-containers-nodejs)
- [Level 2: Implementer Containers (MCP Server)](./level-2-containers-mcp)
- [Level 3: Component View (Node.js BFF)](./level-3-component-bff)

## Supporting References

- [Architecture Decisions](../decisions/)

## Maintenance Workflow

Diagram source files live in `docs/content/architecture/diagrams/`.

Generate static SVG assets for external consumers:

```bash
make -C docs generate-diagrams
```

Validate the generation pipeline:

```bash
make -C docs check-diagrams
```
