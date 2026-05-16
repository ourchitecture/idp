---
status: proposed
date: 2026-04-22
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# spec-kit Three-Axis Evaluation

## Context and Problem Statement

spec-kit (`github/spec-kit`) is a Spec-Driven Development (SDD) toolkit that
provides a structured workflow for authoring software specifications that drive
AI-agent implementation loops. Its artifact model (`.specify/specs/NNN/`) and
command surface (`/speckit.constitution → /speckit.specify → /speckit.plan →
/speckit.tasks → /speckit.implement`) overlap structurally with three
established patterns in this repository:

1. The `/find-work → /plan-work → /ship-changes` agent skill chain
   (`.agents/skills/`).
2. The architectural decision record format
   (`docs/content/architecture/decisions/`, MADR variant).
3. The Gherkin-based Layer 1 intent specification format
   (`tests/features/*.feature`, established in ADR-0009).

An MVP evaluation was conducted to determine whether spec-kit should be
adopted for any or all of these roles, partially adopted in a hybrid model,
deferred pending prerequisites, or rejected.

This ADR records three independent sub-decisions — one per axis — that can
land with different verdicts.

## Decision Drivers

- Agent skills must carry explicit repo-policy context (label taxonomy,
  worktree rules, commit closure language, draft-PR lifecycle). Any replacement
  or complement must preserve this enforcement.
- Architectural decision records must support a `Proposed → Accepted →
  Superseded` lifecycle, supersede-chain traceability, intake-threshold gate
  metadata, and machine-readable status for agent queries.
- Layer 1 intent specifications must produce executable scenarios that map
  1:1 to Layer 2 TypeScript assertions, with an authoritative tiebreaker when
  spec and harness disagree.
- All tooling must be installable reproducibly via the repo's `proto` /
  `python` / `uv` toolchain (ADR-0007, ADR-0012) or via a
  documented container/proto-plugin path.

## MVP Evaluation Artifacts

The full evaluation is documented in
`docs/content/architecture/evaluations/spec-kit-mvp.md`. Three prototype
artifacts under `.specify/evaluation/` support the analysis:

| Artifact | Axis | Description |
| --- | --- | --- |
| `.specify/evaluation/plan-work-retrofit/spec.md` | A | `plan-work` skill in spec-kit `spec.md` format |
| `.specify/evaluation/adr-0009-as-spec-kit/spec.md` | B | ADR-0009 reconstructed in spec-kit `spec.md` format |
| `.specify/evaluation/core-profile/spec.md` | C | `core` conformance profile in spec-kit `spec.md` format |

---

## Sub-Decision A: Dev-Flow Automation

### Question

Would adopting spec-kit's workflow optimize the current
`/find-work → /plan-work → /ship-changes` agent skill chain?

### Considered Options

- **Adopt** — replace the IDP skill chain with spec-kit commands
- **Adopt-Hybrid** — use spec-kit templates as a layer on top of the IDP
  skills, encoding repo policy via `constitution.md`
- **Defer-Pending-Prereq** — wait for spec-kit to ship a stable 1.x release
  with a GitHub Issues integration and a reproducible proto/uv install path
- **Reject** — retain the IDP skill chain unchanged

### Decision Outcome

**Chosen option: `Defer-Pending-Prereq`**

spec-kit's six-command workflow chain has structural overlap with the IDP
three-skill chain, and an `Adopt-Hybrid` path (encoding AGENTS.md policy in
`constitution.md`) is conceptually plausible. However, two prerequisites are
unmet at v0.7.x:

1. **Template stability.** spec-kit has had 133 releases. Template-breaking
   changes in a future release would require re-encoding all IDP repo policy.
   A stable 1.x release or an explicit long-term-support commitment is a
   prerequisite for investment in `constitution.md` authoring.

2. **Reproducible install.** spec-kit requires `uv tool install` as a global
   install. The IDP repo pins Python and uv via `proto` (ADR-0007, ADR-0012).
   A proto plugin, container image, or official moon integration is required
   before spec-kit can be used in CI or by contributors without a manual setup
   step.

**Prerequisite gate**: Revisit this sub-decision when spec-kit publishes a
stable 1.x release with explicit GitHub Issues integration and a documented
proto-compatible or container install path.

### Sub-Decision A Consequences

**If deferred (chosen):**

- IDP agent skills continue unchanged.
- The `.specify/evaluation/plan-work-retrofit/spec.md` artifact provides a
  concrete starting point if the prerequisite gate is met.
- No migration cost now; the option is preserved.

**If Adopt-Hybrid were chosen later:**

- `constitution.md` would need to encode: label taxonomy, worktree rules,
  canonical branch naming, commit closure language, draft-PR lifecycle, and
  ADR guardrails.
- Plan artifacts would need a bridge layer so maintainers could find plans
  on GitHub Issues (current pattern) rather than in `.specify/specs/`.
- All `.agents/skills/` SKILL.md files would need to be reviewed for overlap
  with spec-kit commands and either superseded or explicitly declared parallel.

**Rollback plan (if Adopt-Hybrid is later adopted and then reverted):**

Restore the original `.agents/skills/` SKILL.md files from git history.
Remove `.specify/specs/` plan artifacts and confirm maintainers are using
GitHub Issue comments as the canonical plan location. No runtime changes or
CI changes are expected from an Adopt-Hybrid outcome for Axis A.

---

## Sub-Decision B: Architectural Decision Capture

### Question

Would spec-kit's artifact model capture architectural decisions as well as or
better than the current MADR-style ADR format?

### Considered Options

- **Adopt** — replace `docs/content/architecture/decisions/` with
  `.specify/specs/` using spec-kit `spec.md` format
- **Adopt-Hybrid** — use spec-kit `/specify` as the path to authoring an ADR,
  while retaining the final ADR format in the current directory
- **Reject** — retain the current MADR ADR format

### Decision Outcome

**Chosen option: `Reject`**

spec-kit `spec.md` can carry the content of a decision (context, alternatives,
consequences) but loses all governance properties that make ADRs useful as
long-lived records:

- No `Proposed → Accepted → Superseded` lifecycle field
- No supersede-chain cross-reference mechanism
- No intake-threshold gate metadata (the 3-of-5 gates required by AGENTS.md)
- No decision-makers / consulted / informed YAML frontmatter
- No machine-readable status index for agent queries
- Prospective framing (what to build) vs. ADRs' retrospective framing
  (what was decided and why)

The current MADR format is already minimal and maps directly to reviewer and
agent query needs. No productivity gap has been identified that spec-kit would
fill. Reconstructing the lost properties inside spec-kit would require custom
extensions that effectively recreate the MADR format in a less familiar
structure.

**This sub-decision does not supersede ADR-0009 or any other existing ADR.**
Existing ADRs remain authoritative in their current format.

### Sub-Decision B Consequences

**If rejected (chosen):**

- `docs/content/architecture/decisions/` continues unchanged.
- The `.specify/evaluation/adr-0009-as-spec-kit/spec.md` artifact is retained
  as an audit trail of the evaluation.
- No migration cost.

**Rollback plan**: Not applicable; nothing was changed.

---

## Sub-Decision C: Intent-Driven Contracts (Layer 1 Replacement)

### Question

Can spec-kit artifacts serve as Layer 1 ground truth in place of
`tests/features/*.feature` files, given that ADR-0009 requires executable
scenarios mappable to Layer 2 TypeScript assertions?

### Considered Options

- **Adopt** — replace `.feature` files with spec-kit `spec.md` as Layer 1
- **Adopt-Hybrid** — use spec-kit `spec.md` as a narrative planning layer
  while retaining Gherkin `.feature` files as executable Layer 1
- **Reject** — retain Gherkin as Layer 1 (ADR-0009 unchanged)

### Decision Outcome

**Chosen option: `Reject`**

spec-kit `spec.md` is a prose specification format. Gherkin `.feature` files
are executable scenario scripts. These are categorically different:

1. **No step-to-assertion mapping.** Gherkin Given/When/Then steps map 1:1
   to Layer 2 TypeScript assertions in `tests/src/profiles/*.ts`. spec-kit
   `spec.md` FRs have no such mapping; a custom code generator — not provided
   by spec-kit — would be required to re-derive Layer 2 from a `spec.md` source.

2. **No "feature file wins" tiebreaker.** ADR-0009 designates `.feature` files
   as authoritative when spec and harness disagree. spec-kit provides no
   equivalent tiebreaker; divergence would be detectable only through manual
   review.

3. **No profile-gating semantics.** Gherkin `Background` sections with env-var
   URL injection drive the cross-stack conformance model. spec-kit `spec.md`
   can document env vars as prose but cannot express conditional Background
   execution semantics.

4. **Exact-value enforcement.** Gherkin step definitions enforce exact strings
   (e.g., `pass`, `fail`, `warn` per ADR-0011). spec-kit `spec.md` can state
   these values but cannot enforce them without a custom parser.

An `Adopt-Hybrid` model (spec-kit as narrative planning + Gherkin as executable
Layer 1) would add a third layer to the current two-layer model
(Layer 1 `.feature` → Layer 2 `.ts`) without a clear benefit, and would
create a new sync obligation between spec-kit `spec.md` files and `.feature`
files.

**Migration cost estimate**: Migrating all seven profiles from Gherkin to
spec-kit — even if the technical barriers were resolved — would require
20–40 hours of authoring plus an unknown quantity of Layer 2 harness
adaptation. The `flow-insights` profile (16 scenarios, 168 lines, cross-stack
semantic-equivalence CI job) would be the hardest migration case.

**This sub-decision explicitly does not supersede ADR-0009.** Gherkin remains
the Layer 1 format.

### Sub-Decision C Consequences

**If rejected (chosen):**

- `tests/features/*.feature` files continue as Layer 1 ground truth.
- ADR-0009 remains in effect unchanged.
- The `.specify/evaluation/core-profile/spec.md` artifact is retained as an
  audit trail.
- No migration cost.

**Rollback plan**: Not applicable; nothing was changed.

---

## ADR Intake Gate Evaluation (Why Long-Lived)

This ADR records an evaluation whose verdict constrains three separate
long-lived artifact categories in the repository. The decision not to adopt
spec-kit — especially for Axis C — is as load-bearing as any adoption
decision, because it prevents drift toward a parallel spec format that would
silently erode ADR-0009.

| Gate | Met? | Rationale |
| --- | --- | --- |
| Cross-cutting scope | Yes | Affects agent skills, ADR format, and Layer 1 specs — three separate layers |
| Costly to reverse | Yes | Axis C adoption would require re-deriving all Layer 2 harnesses; Axis B adoption would require migrating all existing ADRs |
| Contract surface | Yes | Axis C directly concerns the Layer 1/Layer 2 contract boundary |
| Multi-quarter longevity | Yes | spec-kit adoption decisions are architectural commitments spanning multiple quarters |
| Drift risk | Yes | Without a recorded rejection, future agents may independently attempt spec-kit adoption across these axes |

All five gates are true; two are "costly to reverse" and "contract surface".
ADR threshold is met.

## Related Decisions

- [ADR-0001](./intent-driven-architecture) — Three-layer intent/contract/implementation architecture
- [ADR-0007](./moon-required-proto-enhanced-toolchain-policy) — Moon-required orchestration and proto toolchain policy
- [ADR-0009](./intent-specification-format) — Gherkin as Layer 1 intent specification format (not superseded)
- [ADR-0012](./moon-python-uv-toolchain-integration-constraint) — Moon Python/uv toolchain integration constraint
