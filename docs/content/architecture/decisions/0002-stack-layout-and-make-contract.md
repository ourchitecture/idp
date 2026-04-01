---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Stack Layout and Make Contract

## Context and Problem Statement

How should implementation stacks be organized so contributors can add new
language/framework combinations without changing developer workflows?

The project expects multiple implementations over time (Go, Rust, Node.js, etc.)
and must keep local developer onboarding consistent across stacks.

## Decision Drivers

- Multi-implementation growth requires a predictable structure
- Developers should use the same commands across stacks
- Contract tests must run against any stack with minimal setup
- The decision should be stable and hard to accidentally diverge from

## Considered Options

- Flat stack directories with ad hoc naming
- Layered stack identity by language/framework/interface with Makefile contract
- One global orchestration script per language

## Decision Outcome

Chosen option: "Layered stack identity by language/framework/interface with
Makefile contract", because it balances flexibility with operational
consistency and makes future stack additions straightforward.

### Consequences

- Good, because stack identity is explicit and extensible:
  `stacks/<language>/<framework>/<interface>/`
- Good, because each stack exposes the same GNU Make targets:
  `install`, `build`, `clean`, `check-lint`, `check-test`, `check`, `test`,
  `test-contract`, `run-web`, `run-bff`
- Good, because root workflows (`make dev`, `make test`) can delegate to a
  default stack while preserving override support
- Bad, because stack maintainers must keep Makefile target behavior aligned
- Bad, because interface naming must stay disciplined (e.g., `rest`, `graphql`)

### Confirmation

- Code review checks that new stacks follow the directory schema
- CI or review checks that required Make targets exist per stack
- Contract tests run against at least one reference stack on every PR

## Pros and Cons of the Options

### Flat stack directories with ad hoc naming

- Good, because initially simple
- Bad, because scales poorly and creates naming ambiguity
- Bad, because makes automation and discovery harder

### Layered stack identity by language/framework/interface with Makefile contract

- Good, because captures key architectural dimensions in path structure
- Good, because makes command surface area predictable
- Neutral, because introduces a small upfront convention cost
- Bad, because requires governance on naming and target parity

### One global orchestration script per language

- Good, because could optimize per-language flows
- Bad, because duplicates behavior and fragments developer UX
- Bad, because raises maintenance cost as stacks grow

## More Information

- Related directories: `stacks/`, root `Makefile`
- Related decisions:
  - [0001](0001-intent-driven-architecture.md)
  - [0006](0006-cross-platform-local-runtime-ux-baseline.md)
