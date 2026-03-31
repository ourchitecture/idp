---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Moon-Required Orchestration and Proto-Enhanced Toolchain Policy

## Context and Problem Statement

IDP now spans multiple stacks, contract harnesses, and GitHub automation paths.
Maintainers need a single, deterministic orchestration path across local and CI
execution, while contributors still need flexibility when using system-installed
language toolchains.

How should IDP standardize orchestration and toolchain setup so maintainer and
CI behavior is consistent without forcing a mandatory local version manager for
all contributors?

## Decision Drivers

- Maintainers need one canonical orchestration path across stacks and CI
- CI requires reproducible, pinned toolchain versions
- Contributors should remain unblocked when using system-installed Go/Node
- Existing GNU Make contracts must remain stable for compatibility
- Governance should minimize drift between local, CI, and docs workflows

## Considered Options

- Continue with GNU Make and ad hoc setup scripts as primary orchestration
- Adopt moon as required orchestration, with proto as optional enhancement only
- Adopt moon as required orchestration, with proto as maintainer/CI pinned
  toolchain standard and contributor-optional local usage

## Decision Outcome

Chosen option: "Adopt moon as required orchestration, with proto as maintainer/CI
pinned toolchain standard and contributor-optional local usage", because it
provides deterministic maintainer/CI execution while preserving contributor
flexibility.

### Policy

- **Moon is required** for maintainer and CI orchestration.
- **Proto is recommended and first-class** for pinned toolchain setup.
- Contributors may still run with system-installed language toolchains when they
  do not need pinned toolchain guarantees.
- GNU Make targets remain available as compatibility wrappers and local
  convenience entry points.

### Orchestration Contract

- CI workflows should use moon tasks for reusable repo validation behavior.
- CI workflows should use `moonrepo/setup-toolchain` with `auto-install: true`
  so proto-managed pinned tools are installed consistently.
- Repo-local moon configuration (`.moon/workspace.yml`,
  `.moon/toolchains.yml`, project `moon.yml` files) is the canonical task graph.
- Makefile targets should continue to expose stable `check-*`, `test-*`, and
  runtime entry points, delegating to moon where appropriate.

### Toolchain Contract

- `.prototools` is the single source for pinned maintainer/CI tool versions.
- Pinned versions include at least: `proto`, `moon`, `go`, and `node`.
- Detection policy should prefer `.prototools` in maintainer/CI flows, but not
  hard-fail contributors who rely on system tools.

### Consequences

- Good, because maintainer and CI orchestration semantics become consistent
- Good, because pinned tool versions reduce environment drift
- Good, because contributors can still use system-installed language toolchains
- Good, because existing Make interfaces remain available and familiar
- Bad, because moon task graph and Make wrappers must be kept in sync
- Bad, because CI workflows now depend on moon/proto bootstrap path

### Confirmation

- CI workflows call moon tasks for reusable validation and automation logic
- CI workflows install proto/moon toolchains through setup-toolchain action
- Root `.prototools` exists with pinned versions
- `.moon/workspace.yml` and `.moon/toolchains.yml` exist and load successfully
- Make targets remain functional and documented as compatibility wrappers

## Pros and Cons of the Options

### Continue with GNU Make and ad hoc setup scripts as primary orchestration

- Good, because no migration overhead
- Good, because familiar for current contributors
- Bad, because orchestration logic fragments across workflows and scripts
- Bad, because reproducibility and pinned toolchain consistency are weaker

### Adopt moon as required orchestration, with proto as optional enhancement only

- Good, because moon centralizes task graph and orchestration
- Good, because contributors retain full local setup flexibility
- Bad, because CI and maintainer tool versions can still drift without pinned
  policy

### Adopt moon as required orchestration, with proto as maintainer/CI pinned toolchain standard and contributor-optional local usage

- Good, because combines deterministic maintainer/CI setup with contributor
  flexibility
- Good, because aligns with cross-platform and governance requirements
- Neutral, because adds moon/proto configuration maintenance overhead
- Bad, because requires docs and workflows to stay tightly aligned with
  toolchain policy

## More Information

- Related decisions:
  - [0002](0002-stack-layout-and-make-contract.md)
  - [0003](0003-contract-harness-and-runtime-port-contract.md)
  - [0006](0006-cross-platform-local-runtime-ux-baseline.md)
- Related docs:
  - [AGENTS.md](../../AGENTS.md)
  - [README.md](../../README.md)
