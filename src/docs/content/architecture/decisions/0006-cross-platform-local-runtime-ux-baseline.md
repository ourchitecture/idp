---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Cross-Platform Local Runtime UX Baseline

## Context and Problem Statement

Local runtime startup should be smooth across Windows, macOS, and Linux for the
default stack and all maintained reference stacks.

Current behavior can create avoidable interruptions on Windows, especially for
compiled stacks run through temporary executable paths (for example repeated
`go run`) and for servers bound to all interfaces by default. These patterns
increase firewall prompts and accidental local network exposure.

How should the project standardize local runtime behavior to minimize friction
without weakening security?

## Decision Drivers

- Preserve secure-by-default local networking posture
- Reduce repeated OS firewall and trust prompts on Windows
- Keep startup behavior consistent across stacks and platforms
- Avoid stack-specific developer workarounds
- Maintain explicit opt-in path for LAN/container/remote-device testing

## Considered Options

- Keep current stack-specific behavior and document caveats only
- Define a cross-stack local runtime UX baseline with loopback defaults and
  stable executable identity for compiled stacks
- Force container-only local startup for all stacks

## Decision Outcome

Chosen option: "Define a cross-stack local runtime UX baseline with loopback
defaults and stable executable identity for compiled stacks", because it
improves day-to-day developer experience while preserving secure defaults.

### Local Runtime Baseline

- Default local `run-web` and `run-bff` targets bind to loopback
  (`127.0.0.1`).
- Non-loopback exposure must be explicit and opt-in through documented
  environment overrides.
- Stack docs must include platform caveats and first-run behavior.

Environment override contract for local host binding:

- Web host override: `OUR_IDP_WEB_HOST`
- BFF host override: `OUR_IDP_API_HOST`

### Compiled Stack Executable Identity

- Compiled-language stacks (Go, Rust, etc.) should avoid default local workflows
  that repeatedly execute from ephemeral temp paths.
- Default local run targets should execute a stable repo-local binary path
  whenever practical (for example `.bin/stack-web`, `.bin/stack-bff`).
- This improves trust continuity on Windows and reduces repeated firewall
  prompts tied to changing executable identity.

### Security and Exposure Rules

- The baseline must not disable OS firewall controls.
- The project must not auto-add permissive firewall rules as part of default
  startup.
- Any LAN/container exposure guidance must require explicit operator action.

### Consequences

- Good, because local startup becomes more predictable across platforms
- Good, because Windows trust/firewall interruptions are reduced in common flows
- Good, because loopback defaults reduce accidental LAN exposure
- Bad, because stack maintainers must implement and document host override
  behavior consistently
- Bad, because stable binary workflows add minor build/run target complexity

### Confirmation

- Default stack and maintained reference stacks use loopback bind defaults for
  local run targets
- Compiled stacks use stable repo-local executable identity for default local
  run targets where practical
- Stack docs explicitly describe host override behavior and platform caveats
- Contract and governance docs reference this baseline for future stack work

## Pros and Cons of the Options

### Keep current stack-specific behavior and document caveats only

- Good, because no immediate implementation changes
- Bad, because repeated friction and drift continue across stacks
- Bad, because secure local networking posture remains inconsistent

### Define a cross-stack local runtime UX baseline with loopback defaults and stable executable identity for compiled stacks

- Good, because reduces interruption while preserving security
- Good, because creates one durable expectation for all stacks
- Neutral, because requires incremental updates in stack run targets
- Bad, because adds governance and review overhead

### Force container-only local startup for all stacks

- Good, because environment consistency is high
- Bad, because increases startup overhead and complexity for quick local edits
- Bad, because does not align with local-first developer ergonomics

## More Information

- Related decisions:
  - [0002](0002-stack-layout-and-make-contract.md)
  - [0003](0003-contract-harness-and-runtime-port-contract.md)
  - [0004](0004-implementation-portfolio-and-support-tiers.md)
  - [0005](0005-shared-capability-contract-and-conformance-profiles.md)
- Related docs:
  - [AGENTS.md](https://github.com/ourchitecture/idp/blob/main/AGENTS.md)
