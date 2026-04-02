---
sidebar_position: 8
---

# Level 2: Implementer Containers (MCP Server)

This view shows the MCP server and how AI agents interact with the portal
through it. The MCP server is a standalone adapter that works with any BFF
stack — Go or Node.js.

## Audience

- Primary: IDP implementers and operators.
- Secondary: maintainers defining AI-facing adapter boundaries.

## State

- Current: MCP adapter behavior available today.
- Target: broader user-facing AI workflows backed by stable MCP contracts.

```mermaid
C4Container
  title IDP Container View (MCP Server)

  Person(aiAgent, "AI Agent", "MCP-compatible client such as Claude or Copilot")

  System_Boundary(idp, "Intent-Driven Portal") {
    Container(mcpServer, "MCP Server", "Node.js + TypeScript", "Translates MCP tool calls into BFF REST requests")
    Container(bff, "BFF Server", "Go or Node.js", "Provides REST endpoints for health, readiness, and portal data")
  }

  Rel(aiAgent, mcpServer, "Calls MCP tools", "HTTP POST /mcp (JSON-RPC 2.0)")
  Rel(mcpServer, bff, "Fetches data", "HTTP/JSON")
```

## Notes

- User-first Level 2 view lives at [Level 2: User Capability Containers](./level-2-user-capabilities).
- The MCP server is located at `tools/mcp/` and is stack-independent.
- It exposes `get_portal_summary` and `check_health` as MCP tools.
- Default HTTP port is `8080`; stdio mode is also supported for local clients.
- The MCP server declares the `mcp-profile` conformance profile.
