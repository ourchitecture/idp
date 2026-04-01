# Contributing to Stemix IDP

Thank you for your interest in contributing to the Intent-Driven Portal (IDP).
This guide covers both non-technical and technical contribution paths.

## Non-Technical Contributions

- Report bugs or suggest features by opening a GitHub Issue.
- Improve documentation clarity or fix typos.
- Participate in discussions on open issues.

## Technical Contributions

### Prerequisites

- **Node.js** 18+ and **npm** (required for all stacks)
- **Go** 1.25+ (for the Go reference stack)
- **GNU Make** (optional convenience wrapper -- direct npm/moon commands work
  too)
- **Docker** (optional -- only needed for container builds)
  - Rancher Desktop with `dockerd (moby)` engine is the recommended FOSS
    alternative to Docker Desktop on Windows/macOS.

### Getting Started

```bash
git clone https://github.com/ourchitecture/idp.git
cd idp
npm install
```

### Running a Stack Locally

```bash
# Default Go stack
make dev

# Node.js React + Fastify stack
STACK=stacks/nodejs/react-fastify/rest make dev
```

### Running Tests

```bash
# Run contract tests against the default stack
make test

# Run stack-specific CI checks
make -C stacks/go/net-http/rest check-ci
make -C stacks/nodejs/react-fastify/rest check-ci
```

### Building Container Images

Container builds require Docker in PATH. They are opt-in and silently skipped
when Docker is not available.

```bash
# Build all container images
make build-containers

# Build a single stack's containers
make -C stacks/go/net-http/rest build-containers
make -C stacks/nodejs/react-fastify/rest build-containers

# Build the contract test container
make -C tests build-container
```

### Linting

```bash
# Markdown lint
make check-lint-md

# Workflow file lint
make check-lint-workflows
```

## Workflow

1. Start from a GitHub Issue -- no untracked work.
2. Create a feature branch: `<type>/<short-description>`.
3. Make atomic commits using Conventional Commits format.
4. Include issue references: `Refs #N` or `Closes #N`.
5. Open a pull request against `main`.
6. Ensure PR validation checks pass.

## Code Style

- Match existing patterns in the repo.
- Follow the style guidelines in `AGENTS.md`.
- Markdown must pass markdownlint.

## Documentation

Documentation updates must accompany code changes whenever behavior, setup,
operations, or interfaces change. See the documentation requirements in
`AGENTS.md` for full details.

## Security

- Never commit secrets, credentials, or environment-specific configs.
- Run `npm audit --audit-level=high` before submitting changes.
- Report security vulnerabilities privately via GitHub Security Advisories.
