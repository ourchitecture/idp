# AGENTS.md - Intent-Driven Portal (IDP)

## Purpose

This file is the operating manual for coding agents working in this repo. Follow it first, then the codebase conventions.

## Important Long-Lived Decisions (ADR Guardrails)

To avoid documentation bloat and context explosion, only record decisions in
`docs/content/architecture/decisions/` when they are expected to be long-lived and expensive to
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
- `0007` moon-required orchestration and proto-enhanced pinned toolchain policy.
- `0009` Gherkin as the Layer 1 intent specification format (`tests/features/*.feature`
  files are ground truth; the TypeScript harness in `tests/src/profiles/` is derived
  from them — when they disagree, the `.feature` file wins).

When proposing a new ADR, include a short rationale for why the decision is
long-lived, cross-cutting, and not better captured in regular docs.

Use this intake threshold before adding an ADR:

- At least 3 of these 5 gates are true: cross-cutting scope, costly to reverse,
  contract surface, multi-quarter longevity, drift risk.
- At least one true gate must be either costly to reverse or contract surface.
- If the threshold is not met, document in regular docs instead of
  `docs/content/architecture/decisions/`.

## Multi-Agent Collaboration (Priority Context)

Multiple agents may work in this repo concurrently. Each agent operates independently but must assume others are making changes in parallel.

### Cooperative defaults

- Assume other agents are acting in good faith and following these same rules.
- Prefer cooperative, additive changes over defensive guards against other agents' work.
- Trust that concurrent agents are scoped to their own issues/branches; avoid re-validating their output unless you have direct evidence of breakage.
- Minimize re-work: if a file or artifact already satisfies a requirement, do not re-generate or overwrite it.

### Iterative and minimal changes

- Make the smallest change that satisfies the current task. Do not refactor or reorganize unrelated code.
- Prefer appending or patching over rewriting. Wholesale rewrites increase merge conflicts and wasted effort.
- Commit atomically and frequently so concurrent agents can rebase cleanly.

### Real-time adaptation

- Before editing any file, re-read it to capture the latest state; do not rely on a cached version from earlier in the session.
- After completing a change, verify the final state on disk before reporting done.
- If a conflict or unexpected state is detected, stop and comment on the issue rather than guessing a resolution.

### Protecting unique work

- Scope branches tightly to the issue at hand. Avoid touching files outside the issue scope.
- If a required shared file (for example `package.json`, a Makefile, or a workflow) must change, note the change in the issue comment so other agents can rebase.
- Do not silently revert or overwrite another agent's recent commit. Surface conflicts explicitly.

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

## CI/CD and Make Reuse (Required)

- `moon` is required for maintainer and CI orchestration flows.
- `proto` should be used to provide pinned, reproducible maintainer/CI toolchain
  installs, but contributors may use system-installed language toolchains.
- GNU Make targets are **optional convenience wrappers** for common local
  workflows. Contributors are not required to use them; direct `moon`, `npm`,
  or language-toolchain commands are equally valid. Make targets must stay in
  sync with their `moon`/script equivalents and must not duplicate logic that
  diverges from the canonical command.

- PR validation must be path-aware and run the minimum meaningful checks for the
  changed scope.
- For open-source/external pull requests, prefer careful, lower-cost validation
  by default; run expensive full-system checks only when shared or
  cross-cutting paths change.
- Any CI/CD command that developers should be able to reproduce locally must be
  exposed through GNU Make targets and/or repo scripts (for example
  `scripts/ci/`).
- GitHub workflows should call those Make targets/scripts rather than embedding
  one-off inline shell logic when the logic is reusable.
- Validation and test commands in Makefiles should use `check-` prefixed
  targets (for example `check-lint-md`, `check-test`, `check-contract`).
- Use `check-lint-md` as the canonical Markdown lint target name (not
  `lint-md`).
- Keep GNU Make targets as compatibility wrappers so local workflows remain
  accessible even when moon is the canonical CI/maintainer orchestrator.

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

This repo defines reusable GNU Make targets as **optional convenience wrappers**
for common local workflows, alongside canonical `moon` and `npm` commands.
Contributors may use any of the following interchangeably; `make` targets are
not required but are always kept in sync with their `moon`/script equivalents.

- Install deps: `npm install`
- Install pinned toolchain (recommended): `proto install`
- Show moon project graph and tasks: `moon project <project-id>`
- Lint Markdown (make shortcut): `make check-lint-md`
- Lint Markdown (moon canonical): `moon run repo:check-lint-md`
- Lint workflow files (make shortcut): `make check-lint-workflows`
- Compute PR change-based validation plan:
  `BASE_SHA=<sha> HEAD_SHA=<sha> make check-pr-changes`
- Run Go web server (npm): `npm run start:web`
- Run Go web server (make shortcut): `make run-web`
- Run Go BFF server (npm): `npm run start:bff`
- Run Go BFF server (make shortcut): `make run-bff`
- Run React web server (npm): `npm run start:web:react-fastify`
- Run React BFF server (npm): `npm run start:bff:react-fastify`
- Run contract tests (npm): `npm run test:contract`
- Start default stack web + BFF (make shortcut): `make dev`
- Test running system (make shortcut): `make test`
- Run full build/test verification for all detected stacks (make shortcut): `make all`
- Run CI-safe affected-aware checks for all stacks (make shortcut): `make ci`
- Run CI-safe checks via moon directly (moon canonical): `moon ci go-net-http-rest:check-ci nodejs-react-fastify-rest:check-ci docs-site:check-ci`
- Install npm deps explicitly (moon canonical): `moon run repo:install`
- Run docs site dev server (moon canonical): `moon run docs-site:run-dev`
- Build docs site (make shortcut): `make -C docs build`
- Run full docs site validation (make shortcut): `make docs-site`

Moon project IDs currently used:

- `repo`
- `go-net-http-rest`
- `nodejs-react-fastify-rest`
- `contract-tests`
- `docs-site`

Stack-level Makefile targets (from `stacks/<stack>/Makefile`).
All are **optional convenience wrappers**; equivalent `moon` task invocations
are equally valid.

- `make all` runs install, build, lint, tests, and contract checks for that stack.
- `make install` installs dependencies for that stack.
- `make build` builds stack artifacts.
- `make clean` removes stack build artifacts.
- `make check-lint` runs stack linters.
- `make check-test` runs stack tests.
- `make check-contract` runs stack contract checks.
- `make check-ci` runs CI-safe validation checks for the stack.
- `make check` runs lint, tests, and contract checks for that stack.
- `make test` is a stack-defined test alias (at minimum `check-test`).
- `make test-contract` is a stack-defined alias for `check-contract`.
- `make run-web` starts the web server for that stack.
- `make run-bff` starts the BFF server for that stack.
- `make build-container-web` builds the web container image (requires docker).
- `make build-container-bff` builds the BFF container image (requires docker).
- `make build-containers` builds all container images for that stack (requires docker).

Container targets (root Makefile):

- Build all containers for all stacks: `make build-containers`
- `make all` silently skips container builds when docker is not in PATH.

Container targets (tests/Makefile):

- `make -C tests build-container` builds the contract test container image.
- `make -C tests run-container` runs the contract test container.

Notes:

- Markdown lint config: `.markdownlint.jsonc` and `.markdownlint-cli2.jsonc`.
- No test scripts are defined yet. If you add tests, add scripts and document them here.
- Docker is **not** managed by proto; do not add docker to `.prototools`.
  Docker (or a compatible runtime like Rancher Desktop with dockerd/moby) must
  be installed separately by the developer. Container build targets are opt-in
  and fail loudly if docker is absent.

## Repository Boundary (Required)

Agents must never navigate, read, write, or execute commands outside the
repository root. This rule applies regardless of where the repository is cloned.

- The repository root is the directory that contains this `AGENTS.md` file and
  the `.git/` directory. Determine it with `git rev-parse --show-toplevel` when
  needed; never hard-code an absolute path.
- Do not traverse to parent directories (for example `../`, `../../`) of the
  repository root. Tools such as file search, glob, read, and bash must be
  constrained to paths at or below the repository root.
- Do not read, copy, or reference config files from the host machine or from
  sibling repositories (for example a `.markdownlint.jsonc` in a parent
  directory). Use only the config files that exist inside this repository.
- If a tool or command unexpectedly resolves a path outside the repository root,
  treat it as an error, stop, and report it rather than proceeding.

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

- `/stacks/<language>/<framework>/<interface>/` technology-specific implementations with a GNU Makefile
- Stack names encode language, server framework, and interface type (for web or BFF).
- `/deploy/` container and infra definitions
- `/plugins/` plug-ins and SDKs
- `/docs/` Docusaurus documentation site; `docs/content/` is the single source of truth for all docs
- `/docs/content/architecture/decisions/` Architecture Decision Records (ADRs)
- `/tests/` contract test harness (TypeScript) and Layer 1 Gherkin intent specs
- `/tests/features/` Layer 1 Gherkin `.feature` files — ground truth for all contract intent
- `/tests/src/profiles/` Layer 2 TypeScript test implementations derived from `.feature` files
- `/tools/` tooling and MCP definitions
- `/.claude/skills/` agent skills

### Test Harness Sync Rule

Any change to `tests/features/*.feature` files or `tests/src/profiles/*.ts` files **obligates**
an update to `docs/content/testing/` in the same change:

- Adding or changing a scenario in a `.feature` file → update the corresponding profile doc in
  `docs/content/testing/profiles/`.
- Adding or changing a test in `tests/src/profiles/*.ts` → verify it matches the `.feature` spec;
  if a `.feature` file must be updated, update both together.
- Adding a new profile → create both the `.feature` file and the matching
  `docs/content/testing/profiles/<profile>.md` page in the same change.

## Editor Rules (Cursor/Copilot)

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found in this repo.
- If these files appear later, include their guidance here.

## What Not To Do

- Do not navigate, read, write, or execute commands outside the repository root.
- Do not use symlinks.
- Do not disable security features.
- Do not introduce cloud-provider lock-in without an abstraction.
- Do not add AI/LLM calls without error handling, rate limits, and cost controls.
