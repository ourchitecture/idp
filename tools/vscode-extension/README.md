# Stemix IDP VS Code Extension

This is a VS Code extension for the Stemix Intent-Driven Portal (IDP). It provides integration between VS Code and the IDP system.

## Features

- **Hello IDP Command**: A simple command to test the extension is working (Command Palette: "Hello IDP")

## Local Development and Testing

### Prerequisites

- Node.js 20+ (managed via proto)
- VS Code 1.80.0 or later

### Setup

Install dependencies:

```bash
pnpm install
```

Or using moon:

```bash
moon run vscode-extension:install
```

### Build

Build the extension:

```bash
pnpm run build
```

Or using moon:

```bash
moon run vscode-extension:build
```

Or using make:

```bash
make build
```

### Testing the Extension

#### Option 1: Using VS Code's Extension Development Host

1. Open the `tools/vscode-extension/` directory in VS Code
2. Press `F5` or select "Run > Start Debugging"
3. This opens a new VS Code window (Extension Development Host) with the extension loaded
4. In the Extension Development Host, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
5. Type "Hello IDP" and select the command
6. You should see an information message: "Hello IDP! Welcome to the Stemix Intent-Driven Portal VS Code extension."

#### Option 2: Install Locally as VSIX

1. Build and package the extension:

   ```bash
   pnpm run package
   ```

2. Install the generated `.vsix` file:
   - Open VS Code
   - Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
   - Click the `...` menu (top-right of Extensions view)
   - Select "Install from VSIX..."
   - Choose the generated `stemix-idp-vscode-0.1.0.vsix` file

3. Reload VS Code if prompted

4. Test the command as described above

### Uninstalling

If you installed via VSIX:

1. Go to Extensions view
2. Find "Stemix IDP"
3. Click "Uninstall"

## Integration

This extension is integrated into the IDP monorepo build system:

- **Moon**: Tasks defined in `moon.yml`
- **Make**: Convenience targets in `Makefile`
- **CI**: Automatically validated when extension files change

## Build Commands

- `pnpm install` or `make install` - Install dependencies
- `pnpm run build` or `make build` - Build TypeScript
- `pnpm run typecheck` or `make check-test` - Run type checking
- `pnpm run watch` - Watch mode for development
- `pnpm run package` - Package as VSIX

## Future Enhancements

This is a skeleton extension. Future capabilities may include:

- IDP server connection and status monitoring
- Intent submission from VS Code
- MCP tool integration
- Portal navigation and insights
- Authentication flow integration

## License

MIT
