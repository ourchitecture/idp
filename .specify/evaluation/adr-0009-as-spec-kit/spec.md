# Spec: Gherkin as Layer 1 Intent Specification Format

> **Evaluation artifact — Axis B.** This file reconstructs ADR-0009
> (`docs/content/architecture/decisions/0009-intent-specification-format.md`)
> using spec-kit's native `spec.md` format. The authoritative decision
> record remains the original ADR file. This reconstruction exists solely
> to assess whether spec-kit's artifact model captures architectural
> decisions as well as the current adr-tools format.

## Overview

The IDP platform uses a three-layer architecture. Layer 1 is the intent
specification, Layer 2 is the contract test harness, and Layer 3 is
the implementation. This specification records the decision to use
Gherkin `.feature` files as the Layer 1 format.

## Context

Before this decision, Layer 1 existed only implicitly — as prose
documentation and as the TypeScript test harness itself. The harness
served as both the specification of intent and the mechanism that
enforces it, making it impossible to determine which was authoritative
when they disagreed.

**Problem statement**: How should the project formally represent Layer 1
intent in a way that is technology-agnostic, human-readable, reviewable
by non-engineers, and unambiguous enough to derive a Layer 2 harness from?

## Functional Requirements

### FR-01: Technology-agnostic intent representation

Layer 1 must encode intent without reference to any specific
implementation technology, language, or framework.

### FR-02: Non-engineer readability

Layer 1 must be readable by product owners, designers, and QA engineers
without requiring TypeScript knowledge.

### FR-03: Explicit constraint encoding

Layer 1 must encode every technical constraint explicitly (exact HTTP
status codes, exact field names, exact enum values, exact format
constraints) so that nothing is left to implementation assumption.

### FR-04: Authoritative tiebreaker

When the Layer 1 spec and the Layer 2 harness disagree, Layer 1 must
be the authoritative source. The harness is derived; the spec is ground
truth.

### FR-05: Diff-friendly format

Layer 1 must be diff-friendly and reviewable in pull requests.

### FR-06: Spec-first profile creation

Adding a new conformance profile must require creating a spec file first.

## Decision

**Chosen format:** Gherkin `.feature` files in `tests/features/`.

Gherkin is the Layer 1 ground truth for all contract intent. The
TypeScript harness in `tests/src/profiles/` is a Layer 2 artifact derived
from the `.feature` files. When they disagree, the `.feature` file wins.

## Alternatives Considered

| Option | Reason rejected |
| --- | --- |
| Keep intent implicit in TypeScript harness | Non-engineers cannot read TypeScript; no authoritative source for disagreements |
| OpenAPI / JSON Schema | Describes API structure, not behavioral intent or test scenarios; cannot express runtime behavior |
| Gherkin `.feature` files | **Selected** — human-readable, scenario-driven, explicit constraints, diff-friendly |

## Consequences

**Positive:** Universally readable by non-engineers; explicit testable
language; first-class git citizens; clear sync rule; clean
Given/When/Then to HTTP request/response mapping.

**Negative / risks:** Not directly executable without a step definition
runner. Given/When/Then mapping for some assertions (ISO-8601 format
validation) requires verbose step definitions.

**Mitigations:** AGENTS.md sync rule requires any change to
`tests/features/*.feature` to be accompanied by a matching harness
update. Profile documentation in `docs/content/testing/profiles/`
provides human-readable summaries.

## File Locations

- Layer 1 specs: `tests/features/*.feature`
- Layer 2 harness: `tests/src/profiles/*.ts`
- Profile docs: `docs/content/testing/profiles/*.md`

---

## Evaluation Notes (Axis B)

### What survives the reconstruction

- **Context and problem statement** — spec-kit's `spec.md` `Overview`
  and `Context` sections can capture the decision background at
  similar fidelity.
- **Alternatives considered** — representable as a table, as shown
  above.
- **Functional requirements** — the decision drivers map reasonably
  to FRs, though the framing is forward-looking ("what the system
  must do") rather than retrospective ("why we chose this path").
- **Consequences** — representable as prose sections.

### What is lost or degraded

1. **Lifecycle state (`Proposed → Accepted → Superseded`).** spec-kit
   `spec.md` has no equivalent status field. There is no mechanism in
   spec-kit to transition a spec from Proposed to Accepted, or to
   mark it as Superseded with a pointer to the superseding decision.

2. **Supersede-chain traceability.** ADRs in this repo carry
   `Related Decisions` cross-references that agents and maintainers
   use to trace the history of a decision boundary. spec-kit has no
   native cross-reference mechanism.

3. **Long-lived docs reference rule.** The IDP repo's AGENTS.md
   requires long-lived docs to cite only in-repo file paths or stable
   external specs — never issue or PR numbers. spec-kit does not
   enforce this rule; its templates do not distinguish short-term from
   long-lived artifacts.

4. **Intake-threshold gate metadata.** ADRs carry an explicit
   `ADR Intake Gate Evaluation` table (the 3-of-5 gates). spec-kit
   provides no equivalent gating mechanism.

5. **Decision-makers / consulted / informed metadata.** ADRs carry
   YAML frontmatter with structured RACI-like metadata. spec-kit
   `spec.md` has no equivalent header fields.

6. **Retrospective vs. prospective framing.** A spec-kit `spec.md` is
   prospective — it describes what a system *should* do before it is
   built. An ADR is retrospective — it records what was decided and
   why, including alternatives that were rejected. The two artifacts
   serve different audiences and different moments in a decision's
   lifecycle. Forcing an ADR into `spec.md` shape loses the
   retrospective character.

7. **Machine-readable status for agent queries.** The ADR index
   (`docs/content/architecture/decisions/index.md`) provides a
   machine-readable table of all ADRs, their statuses, and dates.
   spec-kit's `.specify/specs/` directory has no canonical index
   structure that agents could query for "all accepted decisions."

### Conclusion for Axis B

spec-kit `spec.md` can carry the *content* of a decision but loses the
*lifecycle*, *governance*, and *traceability* properties that make ADRs
useful as long-lived architectural records. The current adr-tools format
(MADR variant) is already lean; its structure maps directly to reviewer
needs and agent query patterns. Replacing it with spec-kit would require
custom extensions (status fields, intake gates, cross-reference tables)
that recreate the ADR structure in a less well-known format.
