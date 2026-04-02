---
sidebar_position: 1
---

# Architecture Diagrams

These diagrams exist so anyone can understand how the IDP system fits together
before reading implementation details. They provide a shared visual model for
contributors, operators, and maintainers.

The repository uses the C4 model and Mermaid C4 syntax so the same source can be
read in GitHub Markdown and in Docusaurus.

## Diagram Set

- [Level 1: System Context](./level-1-system-context)
- [Level 2: Container View (Go stack)](./level-2-containers-go)
- [Level 2: Container View (Node.js stack)](./level-2-containers-nodejs)
- [Level 2: Container View (MCP Server)](./level-2-containers-mcp)
- [Level 3: Component View (BFF)](./level-3-component-bff)
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
