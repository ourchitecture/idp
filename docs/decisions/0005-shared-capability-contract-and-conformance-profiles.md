---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Shared Capability Contract and Conformance Profiles

## Context and Problem Statement

IDP supports multiple implementation stacks across languages and frameworks. The
platform needs a durable way to ensure shared behavior and quality expectations
across all stacks without forcing implementation internals to converge.

Current contract checks validate minimal behavior, but do not clearly separate
baseline requirements from higher-level operational and UI capability
expectations.

How should IDP define and enforce shared best-practice behavior across
implementations while preserving technology freedom?

## Decision Drivers

- Preserve implementation freedom across language and rendering choices
- Enforce shared externally observable behavior, not internals
- Scale contract testing as stack portfolio grows
- Keep tier expectations explicit and testable
- Avoid contract drift between stack docs, ADRs, and CI

## Considered Options

- Keep a single flat contract suite with ad hoc test growth
- Introduce profile-based conformance contracts with stack-declared capabilities
- Define one strict superset contract that all stacks must satisfy

## Decision Outcome

Chosen option: "Introduce profile-based conformance contracts with
stack-declared capabilities", because it allows consistent cross-stack behavior
verification while preserving implementation-specific architecture choices.

### Conformance Profiles

- **`core`**: baseline cross-stack behavior required by all implementation
  stacks
- **`operational`**: shared runtime and operational expectations required for
  supported stacks
- **`ui-profile`**: UI capability behavior checks for stacks that declare UI
  support

### Capability Declaration

Each stack `stack.json` declares supported contract profiles and capabilities.

Minimum fields for capability-aware contract execution:

- `contractProfiles`: array of enabled profile names
- `capabilities.ui.enabled`: whether UI capability exists
- `capabilities.ui.mode`: one of `spa`, `ssr`, `server-rendered` when UI is
  enabled

### UI Profile Scope

`ui-profile` validates externally observable UI behavior only.

- Applies across any frontend/backend stack shape (CSR, SSR, server-rendered)
- Must not assert framework internals (React/Vue/Next/etc.), router library,
  component structure, or build pipeline internals
- Focuses on contract outcomes (document shell availability, response types,
  route behavior expectations per declared UI mode)

### Tier Mapping

- Default/reference stack: must pass `core` + `operational`
- Additional Tier 1 UI-capable reference stack: must pass
  `core` + `operational` + `ui-profile`
- Future non-UI stacks: must pass `core` + `operational` unless governance
  explicitly defines a different profile set

### Consequences

- Good, because shared behavior expectations become explicit and enforceable
- Good, because stacks retain internal implementation freedom
- Good, because capability-specific checks avoid over-constraining non-UI stacks
- Bad, because profile governance introduces additional maintenance overhead
- Bad, because stack metadata discipline is now required for accurate test
  selection

### Confirmation

- Contract harness selects tests by requested profile and stack metadata
- `stack.json` includes `contractProfiles` and capability declarations for each
  maintained stack
- CI profile matrix aligns with support tier rules
- ADR and harness docs remain synchronized with profile definitions
- Stack-level `test-contract` targets pass stack identity (`IDP_STACK_PATH`) so
  metadata-driven profile selection remains deterministic

## Pros and Cons of the Options

### Keep a single flat contract suite with ad hoc test growth

- Good, because simple to start
- Bad, because hard to reason about scope and tiered expectations
- Bad, because growth leads to accidental coupling and drift

### Introduce profile-based conformance contracts with stack-declared capabilities

- Good, because separates baseline and capability-specific expectations
- Good, because preserves stack-level implementation flexibility
- Neutral, because requires metadata and profile governance
- Bad, because introduces additional contract model complexity

### Define one strict superset contract that all stacks must satisfy

- Good, because creates one universal gate
- Bad, because over-constrains stacks with different capability targets
- Bad, because encourages implementation contortions rather than clean design

## More Information

- Related decisions:
  - [0001](0001-intent-driven-architecture.md)
  - [0002](0002-stack-layout-and-make-contract.md)
  - [0003](0003-contract-harness-and-runtime-port-contract.md)
  - [0004](0004-implementation-portfolio-and-support-tiers.md)
- Related docs:
  - [tests/contract/README.md](../../tests/contract/README.md)
  - [src/stacks/README.md](../../src/stacks/README.md)
