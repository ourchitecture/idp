---
status: proposed
date: 2026-03-31
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Gherkin as Layer 1 Intent Specification Format

## Context and Problem Statement

Stemix IDP uses a three-layer architecture: Layer 1 is the intent specification
(what the platform must do), Layer 2 is the contract test harness (proof that
an implementation satisfies the intent), and Layer 3 is the implementation.

Before this decision, Layer 1 existed only implicitly — as prose documentation
and as the TypeScript test harness itself. The harness served as both the
specification of intent and the mechanism that enforces it, making it
impossible to tell which was authoritative when they disagreed.

How should the project formally represent Layer 1 intent in a way that is
technology-agnostic, human-readable, reviewable by non-engineers, and
unambiguous enough to derive a Layer 2 harness from?

## Decision Drivers

- Layer 1 must be readable by product owners, designers, and QA engineers
  without requiring TypeScript knowledge
- Layer 1 must encode every technical constraint explicitly (exact HTTP status
  codes, exact field names, exact enum values, exact format constraints) so
  that nothing is left to implementation assumption
- When the Layer 1 spec and the Layer 2 harness disagree, Layer 1 wins — the
  harness is derived, the spec is ground truth
- The format must be diff-friendly and reviewable in pull requests
- The format must integrate naturally with the existing documentation site and
  version-control workflow
- Adding a new conformance profile must require creating a spec file first

## Considered Options

- Keep intent implicit in TypeScript harness comments and prose documentation
- Use OpenAPI or JSON Schema as the Layer 1 format
- Use Gherkin (`.feature` files) as the Layer 1 format

## Decision Outcome

**Chosen option:** Gherkin `.feature` files in `tests/features/`.

Gherkin is the Layer 1 ground truth for all contract intent. The TypeScript
harness in `tests/src/profiles/` is a Layer 2 artifact derived from the
`.feature` files. When they disagree, the `.feature` file wins.

### Consequences

**Good:**

- Gherkin is universally readable by non-engineers; scenarios map directly to
  acceptance criteria without requiring code comprehension
- Gherkin enforces explicit, testable language: "the JSON field 'status' is
  exactly 'ok' or exactly 'degraded'" leaves no ambiguity
- `.feature` files are first-class citizens in git and render well in GitHub
  pull request diffs
- The format supports a clear sync rule: any change to a `.feature` file
  obligates a matching change to the Layer 2 harness and docs, and vice versa
- Gherkin's Given/When/Then structure maps cleanly onto the HTTP
  request/response pattern used by all contract profiles

**Bad / risks:**

- Gherkin is not executed directly; the `.feature` files are human-readable
  specs, not runnable Cucumber tests. Implementers must maintain the discipline
  of keeping harness and spec in sync manually.
- The Given/When/Then mapping for some assertions (for example, ISO-8601
  format validation) requires verbose step definitions in the spec

**Mitigations:**

- The AGENTS.md test harness sync rule explicitly requires any change to
  `tests/features/*.feature` or `tests/src/profiles/*.ts` to be accompanied
  by a matching update to the other, in the same PR
- Profile documentation in `docs/content/testing/profiles/` provides a
  human-readable summary of each `.feature` file for quick reference

## Pros and Cons of the Options

### Keep intent implicit in TypeScript harness comments and prose docs

- Pro: No new format to maintain; the harness is already the artifact
- Con: Non-engineers cannot read TypeScript; intent is buried in code
- Con: No authoritative source to resolve disagreements between harness and docs

### OpenAPI / JSON Schema as Layer 1 format

- Pro: Machine-readable, tooling support, widely understood
- Con: OpenAPI describes API structure, not behavioral intent or test scenarios
- Con: Cannot naturally express runtime behavior (port contracts, env-var
  override chains, content-type assertions, timestamp format requirements)

### Gherkin as Layer 1 format

- Pro: Human-readable, scenario-driven, explicit constraints
- Pro: Maps directly to HTTP contract test patterns
- Pro: Diff-friendly plain text, native to git review workflows
- Con: Not directly executable without a step definition runner (Cucumber etc.)

## File Locations

- Layer 1 specs: `tests/features/*.feature`
- Layer 2 harness: `tests/src/profiles/*.ts`
- Profile docs: `docs/content/testing/profiles/*.md`

## ADR Intake Gate Evaluation

| Gate | Met? | Rationale |
| --- | --- | --- |
| Cross-cutting scope | Yes | Affects all profiles, all stacks, CI, docs, and agent workflow |
| Costly to reverse | Yes | Changing the spec format requires migrating all `.feature` files and updating agent rules |
| Contract surface | Yes | Defines the ground-truth format for the Layer 1 / Layer 2 boundary |
| Multi-quarter longevity | Yes | The three-layer architecture is foundational (ADR-0001) |
| Drift risk | Yes | Without a canonical format, spec/harness divergence is likely |

All five gates are true; two are "costly to reverse" and "contract surface".
ADR threshold is met.

## Related Decisions

- [ADR-0001](./intent-driven-architecture) — Three-layer intent/contract/implementation architecture
- [ADR-0003](./contract-harness-and-runtime-port-contract) — Contract harness design and runtime port contract
- [ADR-0005](./shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
