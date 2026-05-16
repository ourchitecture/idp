# Backstage Test Harness for Stemix IDP

This is a minimal Backstage instance used to develop and validate the bundled Stemix Backstage plugin against the Stemix Intent-Driven Portal (IDP).

## Purpose

This sub-project provides a skeleton Backstage application that:

- Serves as a test harness for IDP Backstage plug-ins
- Validates plug-in integration during development
- Enables local testing of Backstage-based workflows
- Follows the standard Stemix IDP tool project conventions

## Prerequisites

- Node.js 20+ (pinned via `.prototools` at root: currently Node 24.0.0)
- Corepack-enabled Yarn 4 for the Backstage workspace
- GNU Make (optional convenience wrapper)
- Moon task runner (optional but recommended for maintainers)

## Quick Start

### Install Dependencies

```bash
make install
# or
corepack enable
yarn install
```

### Build the Application

```bash
make build
# or
yarn run build:all
```

### Start Development Servers

```bash
make dev
# or
yarn run dev
```

This starts both the frontend (port 3000) and backend (port 7007) in development mode.

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:7007>

### Type Check

```bash
make check-test
# or
yarn run typecheck
```

### Validate the Stemix Bundle

```bash
make check-stemix
# or
yarn run check:stemix
```

### Run CI Checks

```bash
make check-ci
# or via moon
moon run backstage-tools:check-ci
```

## Configuration

The Backstage instance is configured via `app-config.yaml`:

- **Database**: In-memory SQLite (no persistence, resets on restart)
- **Auth**: Guest provider (no authentication required for local dev)
- **Catalog**: Empty by default
- **Integrations**: GitHub integration pre-configured (no credentials needed for skeleton)

## Project Structure

```text
tools/backstage/
├── packages/
│   ├── app/              # Frontend application
│   │   ├── src/
│   │   └── public/
│   ├── backend/          # Backend services
│       └── src/
│   └── stemix/           # Public plugin bundle package
├── plugins/
│   ├── backstage-stemix/         # Private inline frontend plugin
│   └── backstage-stemix-backend/ # Private inline backend plugin
├── app-config.yaml       # Backstage configuration
├── package.json          # Workspace root
├── moon.yml              # Moon task definitions
├── Makefile              # GNU Make wrapper
└── README.md             # This file
```

## Integration with IDP

This Backstage instance is wired into the IDP build system:

- **Moon project ID**: `backstage-tools`
- **Registered in**: `.moon/workspace.yml`
- **CI validation**: Triggered automatically when `tools/backstage/*` files change
- **Release automation**: `release-please` versions `tools/backstage`, syncs the public wrapper and internal package versions, and publishes `@ourchitecture/backstage-plugin-stemix` to GitHub Packages on `main`
- **Root `make all`**: Includes Backstage build and checks

## Available Make Targets

- `make help` - Show available targets
- `make all` - Run full verification (install, build, check)
- `make install` - Install dependencies
- `make build` - Build the application
- `make build-stemix` - Build the public Stemix bundle and internal plugin packages
- `make clean` - Remove build artifacts
- `make check-lint` - Run linting (placeholder)
- `make check-test` - Run type checks
- `make check-stemix` - Run Stemix bundle checks
- `make check-ci` - Run CI-safe validation
- `make check` - Run lint and tests
- `make test` - Alias for check-test
- `make dev` - Start development servers
- `make run` - Alias for dev

## Adding Plug-ins

When adding a Backstage plug-in for IDP integration:

1. Create paired plugin workspaces under `plugins/`
2. Add or update a public wrapper package under `packages/` when the plugin should ship as one install target
3. Reference the public package from `packages/app/package.json` and `packages/backend/package.json` using `workspace:*`
4. Register routes in `packages/app/src/App.tsx` and backend features in `packages/backend/src/index.ts`
5. Re-run `make install`, `make build-stemix`, and `make check-stemix`
6. Test locally with `make dev`

## Known Limitations

- **No persistence**: Uses in-memory SQLite; all data is lost on restart
- **No authentication**: Guest auth provider is enabled for local convenience
- **Minimal catalog**: No default entities or catalog sources configured
- **No TLS**: Local dev uses HTTP only

These limitations are intentional for the skeleton phase. Production-ready deployment configurations will be added as plug-in integration needs mature.

## Troubleshooting

### Build Fails with Node Version Error

Ensure you're using Node 20 or later:

```bash
node --version
```

If using proto:

```bash
proto install
proto use
```

### Yarn Not Found

This harness uses a standalone Yarn workspace inside `tools/backstage` while the rest of the monorepo stays on pnpm. The Backstage workspace declares `yarn@4.14.1` in its local `packageManager` field, so Corepack can provision the correct Yarn release for this subproject:

```bash
proto install
corepack enable
yarn --version
```

### Port Already in Use

If ports 3000 or 7007 are occupied, stop conflicting services or change ports in `app-config.yaml`.

## References

- [Backstage Official Documentation](https://backstage.io/docs/overview/what-is-backstage)
- [Backstage Getting Started](https://backstage.io/docs/getting-started/)
- [Stemix IDP Architecture](../../docs/content/architecture/)
- [ADR-0002: Stack Layout](../../docs/content/architecture/decisions/0002-stack-layout.md)
- [ADR-0007: Moon Orchestration](../../docs/content/architecture/decisions/0007-moon-orchestration.md)
