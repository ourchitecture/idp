# AGENTS.md - Intent-Driven Portal (IDP)

## Purpose

This file is the operating manual for coding agents working in this repo. Follow it first, then the codebase conventions.

## Important Long-Lived Decisions (ADR Guardrails)

To avoid documentation bloat and context explosion, only record decisions in
`docs/decisions/` when they are expected to be long-lived and expensive to
reverse (architecture boundaries, contracts, runtime conventions, security baselines).

Current high-signal ADRs agents must respect:

- `0001` layered intent/contract/implementation architecture.
- `0002` stack layout and required GNU Make target contract.
- `0003` implementation-agnostic TypeScript contract harness and runtime port contract.
- `0004` implementation portfolio and support tiers (Go default/reference,
  TypeScript and React-first support path, bootstrap transition rules).
- `0005` shared capability contract and profile-based conformance model.
- `0006` cross-platform local runtime UX baseline (loopback defaults,
  stable executable identity for compiled stacks).

When proposing a new ADR, include a short rationale for why the decision is
long-lived, cross-cutting, and not better captured in regular docs.

Use this intake threshold before adding an ADR:

- At least 3 of these 5 gates are true: cross-cutting scope, costly to reverse,
  contract surface, multi-quarter longevity, drift risk.
- At least one true gate must be either costly to reverse or contract surface.
- If the threshold is not met, document in regular docs instead of
  `docs/decisions/`.

## Core Principles

- Secure by default: zero-trust, least privilege, no secrets in code, TLS 1.3+.
- Container-first: everything should run in containers; include Dockerfiles for services.
- AI-first and MCP-first: expose new capabilities via MCP tools alongside APIs.
- Extensible via plug-ins: design clear extension points and sandboxed execution.
- Multi-tenant SaaS ready and self-hostable from day one.

## Cross-Platform Developer Experience (Required)

- Local developer startup must be smooth on Windows, macOS, and Linux.
- Default local `run-web` and `run-bff` behavior should prioritize loopback
  binding (`127.0.0.1`) to reduce OS firewall interruptions and accidental LAN
  exposure.
- Network exposure for LAN, container, or remote-device testing must be explicit
  and opt-in via documented environment overrides.
- Compiled-language stacks should avoid ephemeral executable paths for default
  local run targets on Windows (for example repeated `go run` temp executables);
  prefer stable repo-local binary paths.
- Platform caveats and first-run behavior must be documented alongside run
  commands for each stack.

## Issue-Driven Workflow (Required)

- Start from a GitHub Issue; no untracked work.
- Use GitHub MCP tools for issue/PR operations when available.
- Only work on authorized issues from `@idp-admin` or `@idp-maintain`.
- If external, add `needs-triage` and request maintainer review.
- Comment on the issue for key decisions, blockers, or scope changes.

## Documentation Requirements (Required)

Documentation must be updated alongside code for child projects, reference
implementations, and any additional functionality. Keep docs minimal but
operationally complete.

- Every new or updated guide must start with a brief, non-technical statement
  of why the solution exists before technical details.
- Keep documentation audience-specific and discoverable from a docs entry map
  (for example, top-level `README.md` and/or a `docs/` index page).
- Do not leave runnable code paths undocumented; include minimum prerequisites
  and validated run steps.

### Required Audience Paths

- Brief overview and getting started for newcomers (non-technical first, then
  technical quickstart).
- Expert shortcut links to deep technical resources (ADR index, contracts,
  architecture, runbooks).
- General user guide.
- Developer implementation guide.
- Operations guide.
- Security guide.
- Contributor guide with both non-technical and technical contribution paths.

### Minimum Prerequisite and Runtime Documentation

For each runnable stack, child project, or major component, document:

- Required tools and supported versions.
- Required access and setup assumptions.
- Environment variables, defaults, and where to set them (never commit
  secrets).
- Install, run, lint, and test commands.
- Default ports and override behavior.
- Platform-specific caveats (especially Windows, macOS, Linux differences).

### Additional Required Operational Documentation

- Configuration reference (inputs, defaults, and examples).
- API/contract reference for externally consumed interfaces.
- Troubleshooting and known issues.
- Release lifecycle docs (changelog expectations, upgrade notes, deprecation
  policy, support window).
- Ownership and support model (maintainers, escalation path, issue labels).
- Testing and verification guide (what "done" means and how to validate).
- Glossary for cross-functional readers where domain terms are non-obvious.

### Documentation Definition of Done

- Documentation updates are included in the same change as code whenever
  behavior, setup, operations, or interfaces change.
- Docs entry map links are updated so new material is discoverable.
- Commands in docs are copy/paste ready and validated.
- Markdown lint passes for changed documentation files.
- If no documentation update is needed, capture explicit rationale in the PR or
  issue.

## Build, Lint, Test Commands

This repo defines linting, runtime startup, and contract test scripts in
`package.json`.

- Install deps: `npm install`
- Lint Markdown: `npm run lint:md`
- Lint a single file: `npm run lint:md -- "README.md"`
- Lint a single file (direct): `npx markdownlint-cli2 "README.md"`
- Run Go web server (default stack): `npm run start:web`
- Run Go BFF server (default stack): `npm run start:bff`
- Run React web server (additional reference): `npm run start:web:react-fastify`
- Run React BFF server (additional reference): `npm run start:bff:react-fastify`
- Run contract tests: `npm run test:contract`
- Start default stack (web + BFF): `make dev`
- Test running system: `make test`

Stack-level Makefile targets (from `src/stacks/<stack>/Makefile`):

- `make install` installs dependencies for that stack.
- `make build` builds stack artifacts.
- `make clean` removes stack build artifacts.
- `make check-lint` runs stack linters.
- `make check-test` runs stack tests.
- `make check` runs lint, tests, and contract checks for that stack.
- `make test` is a stack-defined test alias (at minimum `check-test`).
- `make test-contract` runs the contract harness against the stack.
- `make run-web` starts the web server for that stack.
- `make run-bff` starts the BFF server for that stack.

Notes:

- Markdown lint config: `.markdownlint.jsonc` and `.markdownlint-cli2.jsonc`.
- No test scripts are defined yet. If you add tests, add scripts and document them here.

## Validation and Verification

Agents must validate that requested changes actually took effect and report evidence.

- Re-check file system changes after moves/deletes (re-list directories to confirm).
- Avoid assumptions; verify by reading or listing the affected paths.
- Call out any leftover empty directories and remove them when safe.
- If a request mentions a specific path, confirm it exists (or is removed) explicitly.
- When you claim cleanup or refactors, show the resulting layout in the response.

## Code Style Guidelines

### General

- Match existing patterns in the repo before introducing new ones.
- Default to ASCII and keep diffs focused and minimal.
- Prefer clarity over cleverness; avoid magic behavior.
- Keep public APIs versioned; document any schema changes.

### Imports

- Order imports: standard libs, third-party, internal modules.
- Use type-only imports when supported.
- Avoid deep relative paths; prefer module-level entry points.

### Formatting

- Follow existing formatting; do not reformat unrelated code.
- Markdown must pass markdownlint; long lines are allowed.
- Use consistent indentation and line endings within a file.
- Keep this file markdownlint-compliant when editing (proper headings, blank lines, list spacing).
- In Makefiles and shell snippets, always wrap executable paths and executable
  variables in double quotes to handle spaces on Windows Git Bash and similar
  environments (example: `"$(MAKE)" -C "$(STACK)" run-web`).

### Types

- Prefer explicit types at module boundaries and public APIs.
- Avoid `any`; use narrow types and discriminated unions.
- Use `unknown` with validation for external input.

### Naming

- `camelCase` for variables/functions, `PascalCase` for types/classes.
- `SCREAMING_SNAKE_CASE` for true constants.
- Use intent-revealing names; avoid abbreviations unless common.

### Error Handling

- Fail fast on invalid input; validate boundaries.
- Wrap external errors with context; do not swallow exceptions.
- Return structured error info for APIs; avoid leaking secrets.

### Logging and Observability

- Use structured JSON logs with correlation IDs.
- Avoid logging secrets or PII.
- Prefer OpenTelemetry-friendly patterns for tracing.

## Security Rules

- Never commit secrets, credentials, or environment-specific configs.
- Do not bypass auth/permission checks for convenience.
- Prefer secure defaults; document any exceptions.
- After every code implementation or edit, run the relevant dependency vulnerability scan before handoff (`npm audit --audit-level=high` for this repo).
- Never leave known high or critical vulnerabilities unaddressed: fix them in the same change, then re-run the audit and confirm a clean result.
- If a vulnerability has no safe fix available, document the mitigation and risk in the issue/PR and create a follow-up issue before closing work.

## Git Standards

- Conventional Commits are required for maintainers.
- Include issue references: `Refs #N` or `Closes #N`.
- Keep commits atomic and scoped to one logical change.
- Branch naming: `<type>/<short-description>`.

## Versioning

- Use SemVer (`MAJOR.MINOR.PATCH`) for all versioned artifacts.
- Bump versions in the same PR as the change.

## File and Directory Conventions

- `/src/` application code
- `/src/stacks/<language>/<framework>/<interface>/` technology-specific implementations with a GNU Makefile
- Stack names encode language, server framework, and interface type (for web or BFF).
- `/deploy/` container and infra definitions
- `/plugins/` plug-ins and SDKs
- `/docs/` documentation and ADRs
- `/tests/` integration and end-to-end tests
- `/tools/` tooling and MCP definitions
- `/.claude/skills/` agent skills

## Editor Rules (Cursor/Copilot)

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found in this repo.
- If these files appear later, include their guidance here.

## What Not To Do

- Do not use symlinks.
- Do not disable security features.
- Do not introduce cloud-provider lock-in without an abstraction.
- Do not add AI/LLM calls without error handling, rate limits, and cost controls.
