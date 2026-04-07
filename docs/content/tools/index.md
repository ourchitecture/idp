# Tools and Integrations

The IDP project includes various tools and integrations to support development workflows and external system connectivity.

## Available Tools

### Model Context Protocol (MCP) Server

The MCP adapter server exposes IDP capabilities to AI assistants and agents following the Model Context Protocol standard.

**Location**: `tools/mcp/`

**Documentation**: [MCP Server](./mcp-server.md)

### VS Code Extension

A VS Code extension providing IDE integration for the Stemix Intent-Driven Portal. This is an early-stage integration target to bring IDP capabilities directly into the developer's editor.

**Location**: `tools/vscode-extension/`

**Status**: Skeleton implementation (v0.1.0)

**Current Features**:

- "Hello IDP" command in VS Code command palette

**Documentation**: [VS Code Extension](./vscode-extension.md)

**Local Testing**: See `tools/vscode-extension/README.md` for instructions on running and testing the extension locally.

## Future Integration Targets

The IDP roadmap includes integration with additional developer tools and platforms to provide consistent capability exposure across different interaction modes. See [ROADMAP.md](https://github.com/ourchitecture/idp/blob/main/ROADMAP.md) for the full capability direction.
