---
status: accepted
date: 2026-04-01
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Moon Python/uv Toolchain Integration Constraint

## Context and Problem Statement

The repository now includes a privacy scanning workflow that depends on Python
and `uv` for Semgrep execution. We need a reproducible, moon-compatible
integration path that preserves deterministic tool versions in maintainer and CI
flows.

Initial attempts to add `python`/`uv` directly to `.moon/toolchains.yml` failed
because this moon version does not expose those IDs as built-in toolchains.
Attempts to force custom plugin locators in moon config also failed with plugin
interface mismatch (`register_toolchain` function not found).

How should the repository integrate Python and `uv` cleanly with moon while
avoiding brittle plugin mismatch behavior?

### Gate Assessment

- **Cross-cutting scope** — affects security scanning tasks, local developer
  setup, CI setup, and future Python-based automation.
- **Costly to reverse** — changing toolchain integration later would require
  script updates, docs updates, and workflow migration.
- **Contract surface** — defines internal tooling contract for moon/proto
  execution and command wiring.
- **Multi-quarter longevity** — toolchain bootstrapping model is expected to
  remain stable across multiple quarters.
- **Drift risk** — without a codified decision, contributors can reintroduce
  incompatible moon toolchain IDs or ad-hoc Python installs.

All five gates are true. Intake threshold is met.

## Decision Drivers

- Keep privacy scanning reproducible and pinned.
- Preserve `moon` task compatibility and `moon setup` reliability.
- Avoid undocumented global pip workflows.
- Keep local and CI behavior aligned.
- Minimize coupling to unstable plugin internals.

## Considered Options

- Add `python`/`uv` directly as moon built-ins in `.moon/toolchains.yml`.
- Configure moon with explicit custom plugin locators for Python/uv.
- Use moon unstable toolchains (`python`, `uv`) mapped to
  proto plugin locators in `.prototools`.
- Avoid moon toolchain integration and run only `proto run` from scripts.

## Decision Outcome

Chosen option: **Use moon unstable toolchains with proto plugin mappings**.

### Implementation Contract

- `.moon/toolchains.yml` configures:
  - `python` with `versionFromPrototools: "python"`
  - `uv` with `versionFromPrototools: "uv"`
- `.prototools` pins canonical versions:
  - `python = "3.12.11"`
  - `uv = "0.9.11"`
- `.prototools` registers proto plugin locators:
  - `python` -> `python_tool` wasm
  - `uv` -> `python_uv_tool` wasm
- `scripts/ci/check-privacy.sh` prefers `moon bin uv` when available,
  then falls back to `proto run uv`, then local `uv/semgrep` binaries.

### Why this is cleanest now

- Works with current moon (validated with `moon project repo`, `moon setup`, and
  `moon run repo:check-privacy`).
- Keeps Python version pinning centralized in `.prototools`.
- Keeps moon configuration declarative without hardcoding unsupported built-in
  IDs.
- Avoids direct dependency on potentially incompatible custom moon plugin ABI.

## Consequences

- Good, because moon and proto remain aligned with pinned versions.
- Good, because privacy scanning stays reproducible in local and CI contexts.
- Good, because the integration path is explicit and documented.
- Bad, because toolchain IDs include `unstable_*` naming, which signals evolving
  upstream support.
- Bad, because dual mapping (`python`/`uv` plus `unstable_*` plugin locators)
  adds small configuration overhead.

## Confirmation

- `moon project repo` validates and shows unstable Python/uv toolchains.
- `moon setup` completes without toolchain config errors.
- `moon run repo:check-privacy` passes end-to-end.
- Weekly scheduled privacy workflow executes `moon run repo:check-privacy`.

## More Information

- Related decisions:
  - [ADR-0007](./moon-required-proto-enhanced-toolchain-policy)
  - [ADR-0008](./dependency-and-tooling-pinning-policy)
- Related docs:
  - [Security Guide](../../security)
  - [Architecture Decision Index](/docs/architecture/decisions/)
