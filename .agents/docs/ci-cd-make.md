# CI/CD and Make Reuse

## Call hierarchy (authoritative)

`make target` → `moon run project:task` → real tool (`go`, `pnpm`, `mvnw`,
`docker`, etc.). Moon tasks carry the real commands; Makefile recipes are
thin wrappers that delegate to moon when available and fall back to direct
commands for contributors without moon.

- **No `moon.yml` task may contain `command: ["make", "..."]`.** Moon is the
  canonical task runner; make wraps moon, not the other way around.
- `moon` is required for maintainer and CI orchestration.
- `proto` provides pinned, reproducible toolchain installs for
  maintainer/CI; contributors may use system toolchains.
- GNU Make targets are **optional convenience wrappers**. Make targets must
  stay in sync with their moon/script equivalents and must not diverge.

## Validation policy

- PR validation must be path-aware: run the minimum meaningful checks for the
  changed scope.
- Open-source/external PRs: prefer lower-cost validation; run expensive
  full-system checks only when shared or cross-cutting paths change.
- Any CI command developers should reproduce locally must be exposed via
  make targets and/or `scripts/ci/` scripts.
- Validation targets use a `check-` prefix (`check-lint-md`, `check-test`,
  `check-contract`). Use `check-lint-md` as the canonical markdown lint
  target name (not `lint-md`).
- The `pr-validation-result` aggregating job is a required status check on
  `main`.

## Workflow script policy (strict)

GitHub Actions `run:` steps must not contain significant scripting logic.
Any `run:` block with more than 3 lines of shell, or any reusable logic,
**must** be extracted to `scripts/ci/`. Permitted inline uses:

- A single delegating command (`moon run`, `make`, `bash scripts/ci/foo.sh`).
- Env var forwarding before calling a script.
- Writing to `$GITHUB_OUTPUT` / `$GITHUB_STEP_SUMMARY` with a single literal.
- A GitHub-Actions-only built-in with no local equivalent.

`scripts/ci/` scripts must be executable, take inputs via env vars, and run
correctly from a developer's terminal. Scripts writing to `$GITHUB_OUTPUT`
must accept the path via `OUTPUT_FILE` and default to `/dev/stdout` locally.

## Workflow permissions (strict)

Every workflow file **must** declare an explicit top-level `permissions:`
block. Apply least privilege. Use `permissions: {}` to revoke all if no API
access is needed. Workflows missing the block will be rejected in review.

## No bypassing the pinned toolchain

Never invoke tools via `npx <tool>` directly when a moon task or make target
exists. Use `moon run repo:check-lint-md` or `make check-lint-md` — never
`npx markdownlint-cli2`. Direct `npx` calls bypass the pinned toolchain.
