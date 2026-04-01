---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Contract Harness and Runtime Port Contract

## Context and Problem Statement

How should compliance tests execute across heterogeneous implementations while
maintaining a stable runtime contract for local development and hosting?

The harness must remain independent from implementation internals and should
guide developers when systems are not running.

## Decision Drivers

- Contract tests must be implementation-agnostic
- Local developer experience should be simple and consistent
- Runtime defaults must be predictable but host-overridable
- Decisions should support future interfaces without stack coupling

## Considered Options

- Per-language test harnesses
- Single TypeScript harness over HTTP service boundaries
- Harness coupled directly to in-repo implementation modules

## Decision Outcome

Chosen option: "Single TypeScript harness over HTTP service boundaries",
because it keeps the contract layer independent and easy to run from any stack.

### Consequences

- Good, because `tests/contract/` validates behavior via network endpoints only
- Good, because prechecks fail fast with startup guidance (`make dev` or
  stack-specific `make run-web` and `make run-bff`)
- Good, because default runtime ports are standardized:
  - Web: `3000`, override order: `OUR_IDP_PORT` then `PORT`
  - BFF: `8000`, override: `OUR_IDP_API_PORT`
- Good, because local runtime host defaults are standardized for developer UX:
  - Web host default: `127.0.0.1`, override: `OUR_IDP_WEB_HOST`
  - BFF host default: `127.0.0.1`, override: `OUR_IDP_API_HOST`
- Good, because contract execution supports profile-based conformance suites
  selected via environment (`IDP_CONTRACT_PROFILE`, `IDP_CONTRACT_PROFILES`) and
  stack metadata (`IDP_STACK_PATH` -> `stack.json`)
- Bad, because contract scope must be curated to avoid testing implementation
  details
- Bad, because non-HTTP protocols (e.g., gRPC) require explicit interface-level
  harness extensions

### Confirmation

- Contract tests execute against the default stack via `make test`
- New stacks demonstrate compliance using `make test-contract`
- Reviews verify that tests do not import implementation code
- Profile selection and stack metadata remain aligned with support-tier
  expectations in ADR 0004 and capability profile definitions in ADR 0005
- Stack-level `test-contract` targets pass `IDP_STACK_PATH` so profile
  selection can use stack metadata consistently

## Pros and Cons of the Options

### Per-language test harnesses

- Good, because can use native language tooling
- Bad, because duplicates contract logic and risks divergence

### Single TypeScript harness over HTTP service boundaries

- Good, because one portable compliance suite for all stacks
- Good, because enforces clean intent/contract/implementation boundaries
- Neutral, because introduces Node.js as contract-runner dependency
- Bad, because additional adapters are needed for non-HTTP interfaces

### Harness coupled directly to in-repo implementation modules

- Good, because easy to bootstrap for one stack
- Bad, because violates layered architecture and blocks heterogeneity

## More Information

- Related directories: `tests/contract/`, root `Makefile`
- Related decisions:
  - [0001](0001-intent-driven-architecture.md)
  - [0006](0006-cross-platform-local-runtime-ux-baseline.md)
