---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Implementation Portfolio and Support Tiers

## Context and Problem Statement

The project is expected to support multiple implementations over time. Existing
material already sets Go as the architectural reference direction, while current
bootstrap tooling still points at a Node.js stack. At the same time, many teams
expect TypeScript and React-friendly implementation options.

How should the project define default, reference, and supported implementations
so Go remains the strategic default while TypeScript and React adoption paths
are first-class and explicit?

## Decision Drivers

- Preserve ADR 0001 direction: Go is the strategic Layer 3 reference language
- Support practical adoption for TypeScript-centric and React-centric teams
- Eliminate ambiguity in "reference implementation" wording across docs/tools
- Keep onboarding stable while additional stacks are being built
- Make maintenance burden explicit with support tiers

## Considered Options

- Keep one long-term stack as the only reference/default
- Support many stacks with equal priority and no explicit tiers
- Define a portfolio with explicit support tiers and transition rules

## Decision Outcome

Chosen option: "Define a portfolio with explicit support tiers and transition
rules", because it preserves strategic architectural direction while making
real-world language and framework adoption paths explicit.

### Portfolio Roles

- **Default implementation**: stack used by root workflows and onboarding docs
- **Reference implementation**: canonical implementation used to model patterns
- **Supported implementation**: maintained and expected to pass contract checks
- **Bootstrap implementation**: temporary stack that keeps workflows operable

### Initial Support Tiers

- **Tier 1 (strategic, required)**:
  - Go implementation is the default and canonical reference implementation
  - TypeScript-only implementation is first-class supported
  - TypeScript + React implementation is first-class supported as an additional
    reference implementation

### Contract Profile Expectations by Tier

- Default/reference implementation: `core` + `operational`
- Additional Tier 1 UI-capable reference implementation:
  `core` + `operational` + `ui-profile`
- Capability-specific profile behavior is defined in ADR 0005

### React Framework Guidance

The React-oriented supported implementation should use a mainstream, modern,
stable approach with broad ecosystem adoption. Next.js stable releases are
recommended when framework-level SSR or routing conventions are required, while
Vite + React Router is also valid for SPA-focused references. Avoid both
bleeding-edge-only choices and legacy scaffolds such as Create React App.

### Transition and Promotion Rules

- Root defaults must point to a Go stack
- Promotion criteria for the Go default/reference stack:
  - required Make targets from ADR 0002
  - contract harness compliance from ADR 0003
  - stack documentation and clear ownership
- Additional references and supported stacks must preserve parity on those
  criteria

### Consequences

- Good, because implementation roles become explicit and governable
- Good, because Go stays strategic while TypeScript and React are supported
- Good, because migration from bootstrap tooling can be staged safely
- Bad, because tier governance adds policy and review overhead
- Bad, because multiple supported stacks increase maintenance costs

### Confirmation

- Docs identify each stack role (`default`, `reference`, `supported`,
  `bootstrap`)
- Root defaults point to a Go stack
- Supported stacks demonstrate compliance through required Make targets and
  contract testing
- Planning and review workflows reference support tier when stack behavior
  changes
- Stack metadata (`stack.json`) declares contract profiles consistent with tier
  expectations

## Pros and Cons of the Options

### Keep one long-term stack as the only reference/default

- Good, because maintenance is simpler
- Bad, because ignores TypeScript/React adoption realities
- Bad, because encourages unofficial and inconsistent parallel stacks

### Support many stacks with equal priority and no explicit tiers

- Good, because offers maximum flexibility
- Neutral, because no prioritization policy is needed at first
- Bad, because ownership and CI expectations stay unclear
- Bad, because default/reference semantics remain ambiguous

### Define a portfolio with explicit support tiers and transition rules

- Good, because aligns strategy with ecosystem adoption needs
- Good, because provides a controlled migration path from bootstrap defaults
- Neutral, because introduces policy maintenance work
- Bad, because promotions and deprecations require governance decisions

## More Information

- Related decisions:
  - [0001](0001-intent-driven-architecture.md)
  - [0002](0002-stack-layout-and-make-contract.md)
  - [0003](0003-contract-harness-and-runtime-port-contract.md)
  - [0005](0005-shared-capability-contract-and-conformance-profiles.md)
- Related docs:
  - [AGENTS.md](https://github.com/ourchitecture/idp/blob/main/AGENTS.md)
  - [stacks/README.md](https://github.com/ourchitecture/idp/blob/main/stacks/README.md)
