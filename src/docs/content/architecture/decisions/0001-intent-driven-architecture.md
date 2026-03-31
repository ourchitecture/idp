---
status: proposed
date: 2026-03-30
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Intent-Driven Architecture with Layered Separation

## Context and Problem Statement

How should the IDP platform be architected so that all behavior is defined by
declarative intent specifications and validated by an intent-compliant test
suite, while allowing multiple implementations in different languages and
frameworks?

The platform must balance flexibility with simplicity. Unique technologies offer
unique advantages; the architecture must allow implementations to leverage those
strengths without becoming a "least common denominator" solution. At the same
time, flexible architecture tends toward complexity. The design must narrowly
focus on clean, simple solutions to prevent implementation complexity from adding
friction to maintenance and extensibility.

The architecture must also support a wide spectrum of hosting options: local
developer startup, end-to-end SaaS, multi-cloud PaaS for self-hosting,
containerized self-hosting, and do-it-yourself hosting — with local developer
experience as the first priority.

## Decision Drivers

- Intent specifications must be the single source of truth for platform behavior
- The intent layer must be technology-agnostic so implementations can be derived
  in any programming language or framework
- Implementations should leverage unique technology strengths rather than
  targeting the lowest common denominator
- Architecture must be clean and simple to minimize maintenance and extensibility
  friction
- Modern standards for modularity, loose coupling, and componentization must be
  used wherever stable standards exist
- The hosting spectrum (local dev, SaaS, multi-cloud PaaS, containerized
  self-hosting, DIY) must be supported without architectural lock-in
- Local developer experience is the first-class hosting priority
- Aligns with project principles: secure by default, container-first, AI-first,
  MCP-first, extensible, self-service hosting, multi-tenant SaaS ready

## Considered Options

- Monolithic intent-spec with pluggable implementations
- Layered architecture with intent, contract, and implementation separation
- Microkernel with plug-in-only architecture

## Decision Outcome

Chosen option: "Layered architecture with intent, contract, and implementation
separation", because it provides a clear separation of concerns that keeps the
intent layer technology-agnostic while allowing implementations to fully leverage
their target technology. The three layers — intent specifications, contract
tests, and implementation modules — can each evolve and version independently,
and the contract test layer provides a built-in compliance gate that any
implementation must satisfy.

Go is selected as the reference implementation language for Layer 3, with local
developer experience as the first hosting mode to optimize for.

### The Three Layers

**Layer 1 — Intent Specifications**: Declarative, language-agnostic
specifications that define *what* the platform does. These are the source of
truth for all behavior. The specific format for intent specifications (e.g.,
BDD/Gherkin, OpenAPI + JSON Schema, custom declarative YAML, or a combination)
is deferred to a follow-up ADR.

**Layer 2 — Contract Tests**: A technology-agnostic test suite that validates
whether an implementation complies with the intent specifications. Contract tests
define the boundary between "what" and "how" — any implementation that passes
all contract tests is considered compliant. Tests are runnable against any
implementation through a standard interface.

**Layer 3 — Implementation Modules**: Concrete implementations in specific
languages and frameworks. Each implementation is a self-contained module that
fulfills the intent specifications and must pass all contract tests. Go is the
first reference implementation. Additional implementations (TypeScript, Rust,
etc.) can follow independently.

### Consequences

- Good, because intent specifications remain the authoritative definition of
  platform behavior independent of any implementation
- Good, because contract tests provide an automated, objective compliance gate
  for any implementation
- Good, because new implementations can be added in any language without
  modifying the intent or contract layers
- Good, because each layer can version independently, enabling parallel
  development and evolution
- Good, because the separation naturally supports the hosting spectrum — the
  intent and contract layers are portable, while implementations can be
  optimized per deployment target
- Good, because implementations can fully leverage their language and framework
  strengths without cross-implementation constraints
- Bad, because maintaining three layers requires discipline around boundaries;
  leaking implementation details into the intent layer erodes the architecture
- Bad, because the contract test interface must be expressive enough to validate
  diverse implementations without becoming a bottleneck or an abstraction that
  is itself implementation-specific
- Neutral, because the intent specification format is not yet decided; this is
  intentional to allow proper evaluation in a dedicated follow-up ADR

### Confirmation

- Every new feature or behavior change must include updates across all three
  layers: intent specification, contract test, and at least the reference
  implementation
- CI pipelines validate that the reference implementation passes all contract
  tests on every PR
- Code review checklists include a check for layer boundary violations (e.g.,
  Go-specific concerns appearing in intent specs)
- When additional implementations are added, they must independently pass the
  full contract test suite before being considered compliant

## Pros and Cons of the Options

### Monolithic intent-spec with pluggable implementations

A single specification repository with implementations as separate but directly
coupled modules. Implementations read intent specs and provide the corresponding
behavior.

- Good, because the simplest initial structure with minimal abstraction
- Good, because a single repository keeps everything discoverable
- Neutral, because implementations are still separate modules
- Bad, because without an explicit contract test layer, compliance validation
  becomes ad hoc — each implementation invents its own testing approach
- Bad, because the tight coupling between spec and implementation makes it
  harder for different teams or languages to evolve independently
- Bad, because the monolithic structure tends to accumulate implicit assumptions
  that favor the first implementation's language and runtime

### Layered architecture with intent, contract, and implementation separation

Three explicit layers: intent specifications (language-agnostic), contract tests
(compliance validation), and implementation modules (language-specific). Each
layer is independently versioned with clear boundaries.

- Good, because the explicit contract test layer provides an objective
  compliance gate that works for any implementation
- Good, because layer independence enables parallel development and independent
  versioning
- Good, because the architecture naturally maps to the hosting spectrum: intent
  and contract layers are portable, implementations are optimized per target
- Good, because new implementations can be added without modifying existing
  layers
- Neutral, because the three-layer structure requires more initial scaffolding
  than a monolithic approach
- Bad, because maintaining clean layer boundaries requires ongoing discipline
- Bad, because the contract test interface design is critical and non-trivial;
  a poorly designed interface becomes a bottleneck

### Microkernel with plug-in-only architecture

A minimal core kernel with all capabilities (including those that would be
"core" in other architectures) implemented as plug-ins. Maximum extensibility
by design.

- Good, because maximum flexibility and extensibility from day one
- Good, because enforces loose coupling by making everything a plug-in
- Good, because naturally supports the platform's extensibility principle
- Bad, because high upfront complexity — the kernel, plug-in lifecycle, sandbox,
  and API contract must all be designed before any feature work begins
- Bad, because "everything is a plug-in" often leads to over-abstraction and
  indirection that makes the system harder to understand and debug
- Bad, because the plug-in API becomes the critical path for all development,
  creating a bottleneck if its design needs revision
- Bad, because the complexity of the plug-in infrastructure works against the
  goal of simple, clean architecture that minimizes maintenance friction

## More Information

### Follow-Up Decisions

The following decisions are explicitly deferred to dedicated follow-up ADRs:

- **Intent specification format**: The specific format or combination of formats
  (BDD/Gherkin, OpenAPI + JSON Schema, custom declarative, hybrid) for Layer 1
  intent specifications. This requires evaluation of each format's trade-offs
  in the context of this layered architecture.
- **Go module structure**: The Go workspace layout, module boundaries, and how
  intent specs map to Go packages and interfaces in the Layer 3 reference
  implementation.
- **Hosting abstraction**: The abstraction boundaries and configuration strategy
  (e.g., 12-factor, feature flags, compose profiles) that enable the hosting
  spectrum without architectural lock-in.
- **Contract test interface**: The standard interface through which contract
  tests execute against any implementation, including protocol, transport, and
  assertion mechanisms.

### Contract Test Harness (Initial)

An initial TypeScript-based contract test harness lives under `tests/contract/`.
It is implementation-agnostic and targets the standard HTTP interfaces exposed
by any portal implementation. Implementations provide base URLs via environment
variables (`IDP_WEB_URL`, `IDP_BFF_URL`) so the harness can validate compliance
without importing implementation code.

Implementation stacks live under `src/stacks/<language>/<framework>/<interface>/`
and must expose identical behavior. Each stack includes a GNU Makefile with
conventional targets so developers can start a stack and run the contract tests
in a consistent way.

### Relationship to Project Principles

This decision aligns with the project's core principles from AGENTS.md:

- **Container-first**: Implementation modules are containerized independently,
  and contract tests run against containerized implementations
- **AI-first / MCP-first**: Intent specifications can define MCP tool interfaces
  alongside traditional APIs; the layered architecture keeps AI integration
  patterns in the intent layer rather than buried in implementations
- **Extensible via plug-ins**: The layered separation provides a foundation for
  the plug-in architecture; plug-ins can be validated against intent-derived
  contract tests
- **Self-service hosting / Multi-tenant SaaS ready**: The separation of intent
  from implementation enables targeting different hosting configurations without
  changing the specification of what the platform does

### References

- [MADR – Markdown Any Decision Records](https://adr.github.io/madr/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [AGENTS.md](https://github.com/ourchitecture/idp/blob/main/AGENTS.md) — Project principles and development standards
