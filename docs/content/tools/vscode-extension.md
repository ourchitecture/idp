# VS Code Extension

The Stemix IDP VS Code extension provides IDE integration for the Intent-Driven Portal, bringing IDP capabilities directly into VS Code.

## Status

This is a skeleton implementation (v0.1.0) that establishes the foundation for future VS Code integration. The extension is fully integrated into the IDP monorepo build system and CI workflows.

## Current Features

### Hello IDP Command

A simple command that demonstrates the extension is working correctly.

**Usage**:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Hello IDP"
3. Select the command
4. You'll see an information message confirming the extension is active

## Local Development

### Prerequisites

- Node.js 20+ (managed via proto)
- VS Code 1.80.0 or later

### Installation

Install dependencies:

```bash
cd tools/vscode-extension
pnpm install
```

Or using moon:

```bash
moon run vscode-extension:install
```

### Building

Build the extension:

```bash
cd tools/vscode-extension
pnpm run build
```

Or using moon:

```bash
moon run vscode-extension:build
```

Or using make:

```bash
cd tools/vscode-extension
make build
```

### Testing Locally

#### Option 1: VS Code Extension Development Host

1. Open the `tools/vscode-extension/` directory in VS Code
2. Press `F5` or select "Run > Start Debugging"
3. A new VS Code window opens (Extension Development Host) with the extension loaded
4. In the Extension Development Host, open the Command Palette
5. Type "Hello IDP" and select the command
6. Verify the information message appears

#### Option 2: Install as VSIX

1. Package the extension:

   ```bash
   pnpm run package
   ```

2. Install the generated `.vsix` file:
   - Open VS Code
   - Go to Extensions view
   - Click the `...` menu (top-right)
   - Select "Install from VSIX..."
   - Choose `stemix-idp-vscode-0.1.0.vsix`

3. Reload VS Code if prompted

4. Test the "Hello IDP" command

### Uninstalling

If installed via VSIX:

1. Go to Extensions view
2. Find "Stemix IDP"
3. Click "Uninstall"

## Integration with IDP Monorepo

The extension is fully integrated into the IDP build system:

- **Moon**: Project ID `vscode-extension` with tasks in `moon.yml`
- **Make**: Convenience targets in `Makefile`
- **CI**: Automatically validated when extension files change via path-based PR validation

### Build Commands

- `pnpm install` or `make install` - Install dependencies
- `pnpm run build` or `make build` - Build TypeScript
- `pnpm run typecheck` or `make check-test` - Run type checking
- `pnpm run watch` - Watch mode for development
- `pnpm run package` or `make package` - Package as VSIX

### Moon Tasks

- `moon run vscode-extension:all` - Full build and validation
- `moon run vscode-extension:install` - Install dependencies
- `moon run vscode-extension:build` - Build extension
- `moon run vscode-extension:check-ci` - CI validation checks
- `moon run vscode-extension:package` - Package as VSIX

## Roadmap

This skeleton establishes the foundation for future capabilities:

- IDP server connection and status monitoring
- Intent submission from VS Code
- MCP tool integration for AI-assisted workflows
- Portal navigation and insights
- Authentication flow integration
- Workflow and task management

See [ROADMAP.md](https://github.com/ourchitecture/idp/blob/main/ROADMAP.md) Section 9 (Capability Exposure and Interaction Models) for the full vision of IDE integrations as part of the consistent capability model across all interaction channels.

## Architecture

The extension follows VS Code extension best practices:

- TypeScript-based implementation
- Activates on command invocation
- Clean activation/deactivation lifecycle
- Follows repository conventions for moon/make integration
- Minimal dependencies (VS Code API + TypeScript)

## Contributing

To add new functionality to the extension:

1. Follow the repository's issue-driven workflow
2. Update `src/extension.ts` with new commands or features
3. Register commands in `package.json` under `contributes.commands`
4. Add corresponding activation events in `activationEvents`
5. Update this documentation and the extension README
6. Test locally using the Extension Development Host
7. Ensure all build and validation checks pass

## License

MIT
