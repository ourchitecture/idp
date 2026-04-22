---
sidebar_position: 1
status: proposed
date: 2026-04-22
---

# spec-kit MVP Evaluation

This evaluation assesses [`github/spec-kit`](https://github.com/github/spec-kit)
as a potential tool for the IDP project across three independent axes. Each
axis has its own question, MVP artifact, scorecard, and recommendation. The
combined verdict feeds ADR-0015.

**Ground truth is unchanged throughout this evaluation.** The
`tests/features/*.feature` files remain the authoritative Layer 1 intent
specifications (ADR-0009). The `.agents/skills/` directory remains the
canonical source for agent workflow skills. No production files were modified
as part of this evaluation.

## What Is spec-kit?

spec-kit is an open-source toolkit (MIT license, v0.7.4 as of April 2026)
that implements **Spec-Driven Development (SDD)**. It provides a structured
workflow for authoring software specifications that drive AI-agent
implementation loops.

### Artifact layout

```
.specify/
├── memory/constitution.md     # project governing principles
├── specs/NNN-feature/
│   ├── spec.md                # functional requirements / user stories
│   ├── plan.md                # technical implementation strategy
│   ├── tasks.md               # ordered task breakdown
│   └── contracts/             # optional API specs, data models
├── templates/                 # core SDD templates
├── extensions/                # community extensions
└── presets/                   # team customizations
```

### Workflow

| Step | Command | Output |
| --- | --- | --- |
| Establish principles | `/speckit.constitution` | `memory/constitution.md` |
| Define requirements | `/speckit.specify` | `specs/NNN/spec.md` |
| Create tech strategy | `/speckit.plan` | `specs/NNN/plan.md` |
| Generate task list | `/speckit.tasks` | `specs/NNN/tasks.md` |
| Consistency check | `/speckit.analyze` | inline report |
| Execute tasks | `/speckit.implement` | code changes |

### Runtime prerequisites

| Requirement | Version |
| --- | --- |
| Python | 3.11+ |
| uv | latest |
| Git | any recent |
| AI coding agent | one of 30+ integrations |

**Toolchain conflict**: spec-kit requires `uv tool install` as a global
install. This repo pins Python via `proto` / `unstable_python` and `unstable_uv`
per ADR-0007 and ADR-0012. A proto plugin or container wrapper would be needed
for reproducible CI installation.

### Maintenance signal

- Latest release: v0.7.4 (April 21, 2026)
- 133 releases, 826 commits, ~90k stars, 7.7k forks
- 502 open issues (rapid growth, active but backlogged)
- Language: 92% Python, 4.3% Shell, 3.7% PowerShell

---

## Axis A — Dev-Flow Automation

**Question**: Would adopting spec-kit's `/specify → /plan → /tasks → /implement`
flow optimize the current `/find-work → /plan-work → /ship-changes` workflow
meaningfully over time?

**MVP artifact**: `.specify/evaluation/plan-work-retrofit/spec.md` — the
`plan-work` skill re-expressed as a spec-kit `spec.md`.

### Axis A Scorecard

| Dimension | Current (IDP skills) | spec-kit | Delta |
| --- | --- | --- | --- |
| Repo-policy fidelity (worktrees, labels, commit language) | Native — SKILL.md encodes exact rules | Must be layered via `constitution.md` template; no enforcement | Regression |
| Per-skill onboarding cost | One SKILL.md per skill; self-contained | Must author `spec.md` + `plan.md` + `tasks.md` per feature AND maintain `constitution.md` | Higher |
| External-agent compatibility | Skills are GitHub-Issues-native; any agent reading the issue finds the plan | Plans live in `.specify/`; agents that read GitHub Issues would not find spec-kit artifacts | Regression |
| Template-churn risk | SKILL.md is static prose; updated only when the workflow changes | spec-kit templates track upstream releases; 133 releases in project history | Higher risk |
| GitHub ecosystem alignment | Label state machine, `Closes #N` closure, draft-PR lifecycle are first-class | No native GitHub Issues integration; worktree, label, and PR rules must be manually encoded | Regression |
| Reversibility | Skills are plain Markdown; no external dependency to remove | Removing spec-kit requires migrating `.specify/` artifacts back to skills | Harder to reverse |

### Axis A: Key Finding

The structural overlap between spec-kit's six-command chain and the IDP
three-skill chain is real, but the IDP skills carry repo-policy context that
spec-kit does not. Adopting spec-kit for dev-flow would either require a
non-trivial `constitution.md` that encodes the full AGENTS.md policy, or would
produce agents that follow the spec-kit workflow while silently violating the
IDP repo's label state machine, worktree rules, and commit closure language.

The plan artifact location is a hard incompatibility: `plan-work` posts plans
as GitHub Issue comments (the canonical review artifact for maintainers and
agents); spec-kit stores plans in `.specify/specs/NNN/plan.md`. These serve
different audiences and cannot be used interchangeably without a bridge layer.

### Axis A Recommendation: `Defer-Pending-Prereq`

The template stability prerequisite (spec-kit would need a stable 1.x release
with a committed `constitution.md` encoding pattern for repo-policy fidelity)
is not met at v0.7.x. Revisit if spec-kit ships a stable GitHub Issues
integration and a reproducible proto/uv install path.

---

## Axis B — Decision Capture / ADRs

**Question**: Would spec-kit's artifact model capture architectural decisions
as well as or better than the current
`docs/content/architecture/decisions/` (MADR-style, numbered,
`Proposed/Accepted/Superseded` states)?

**MVP artifact**: `.specify/evaluation/adr-0009-as-spec-kit/spec.md` —
ADR-0009 reconstructed in spec-kit's native `spec.md` format.

### Axis B Scorecard

| Dimension | Current (MADR ADRs) | spec-kit | Delta |
| --- | --- | --- | --- |
| `Proposed → Accepted → Superseded` lifecycle | Native YAML frontmatter `status` field | Not natively supported; must be added as custom prose | Loss |
| Supersede-chain traceability | `Related Decisions` cross-references in ADR body | No native cross-reference mechanism | Loss |
| Long-lived docs reference rule | Enforced by AGENTS.md; no issue/PR numbers in ADR bodies | Not enforced; spec-kit templates do not distinguish short-term from long-lived artifacts | Loss |
| Intake-threshold gate metadata | Explicit 3-of-5 gate table in each ADR | No equivalent; must be added as custom section | Loss |
| Decision-makers / consulted / informed | YAML frontmatter fields | Not supported | Loss |
| Retrospective framing | ADRs record what was decided and why; alternatives rejected | `spec.md` is prospective (what to build); forcing retrospective content loses the framing | Loss |
| Machine-readable status index | `index.md` table queryable by agents | No canonical index; agents would need to glob `.specify/specs/` | Loss |
| Markdownlint compatibility | ADR Markdown passes `check-lint-md` | spec-kit Markdown should pass; no observed incompatibility | Neutral |
| Diff-friendliness | ADR diffs show decision changes clearly | spec-kit diffs would similarly show changes | Neutral |

### Axis B: Key Finding

spec-kit `spec.md` can carry the *content* of a decision (context, problem,
alternatives, consequences) but loses all *governance properties* that make
ADRs useful as long-lived architectural records: lifecycle transitions,
supersede-chain traceability, intake-threshold gating, and machine-readable
status. Reconstructing those properties inside spec-kit would require custom
extensions that effectively recreate the MADR format in a less familiar
structure.

The current MADR format is already minimal. Its structure maps directly to
reviewer needs and agent query patterns. There is no observable productivity
gain from replacing it.

### Axis B Recommendation: `Reject`

spec-kit does not improve on the current MADR ADR format for architectural
decision capture. The reconstruction (Axis B artifact) demonstrates content
portability but governance regression. Retain the current
`docs/content/architecture/decisions/` format.

---

## Axis C — Intent-Driven Contracts on Top of Gherkin

**Question**: Can spec-kit artifacts serve as Layer 1 ground truth in place
of `.feature` files, given that ADR-0009 requires executable scenarios
mappable to Layer 2 TypeScript assertions?

**MVP artifact**: `.specify/evaluation/core-profile/spec.md` — the `core`
conformance profile re-expressed as a spec-kit `spec.md` (5 scenarios: GET /
and GET /health on the web server; GET /, GET /health, GET /readiness on the
BFF server).

### Side-by-Side Comparison

```gherkin
# tests/features/core.feature (excerpt — Layer 1 ground truth)
Scenario: Web server health endpoint returns the expected shape
  When the client sends GET /health to the web server
  Then the response status code is in the 2xx range
  And the response Content-Type header contains "application/health+json"
  And the response body is a valid JSON object
  And the JSON object contains a field named "status"
  And the JSON object contains a field named "serviceId"
  And the JSON object contains a field named "description"
```

```markdown
<!-- .specify/evaluation/core-profile/spec.md (Axis C artifact) -->
### FR-02: Web server health endpoint

- Endpoint: GET /health on the web server
- HTTP response status in the range 200–299
- Content-Type header contains application/health+json
- Response body is a valid JSON object
- JSON object contains a field named status
- JSON object contains a field named serviceId
- JSON object contains a field named description
```

### Axis C Scorecard

| Dimension | Current (Gherkin) | spec-kit `spec.md` | Delta |
| --- | --- | --- | --- |
| Executable-scenario fidelity | Given/When/Then steps map 1:1 to Layer 2 TypeScript assertions | Prose FRs; no step-definition mapping; Layer 2 re-derivation requires custom generator | Loss |
| "Feature file wins" tiebreaker | Explicit in ADR-0009; enforced by AGENTS.md sync rule | No equivalent; spec-kit has no tiebreaker mechanism | Loss |
| Cross-stack implementation neutrality | `.feature` files are technology-agnostic; any stack can implement | `spec.md` is also technology-agnostic; neutral | Neutral |
| Profile-gating / capability flags | Gherkin tags and `Background` with env-var URL injection | Can document env vars as prose; cannot express conditional Background execution semantics | Loss |
| Exact-value constraint enforcement | Step definitions enforce exact strings (`pass`, `fail`, `warn`) | Can state values in prose; cannot enforce them without a custom parser | Loss |
| Diff-friendliness | `.feature` file diffs clearly show scenario changes | `spec.md` diffs also show FR changes | Neutral |
| Non-engineer readability | Gherkin Given/When/Then is widely recognized | Prose FRs are also readable; minor readability advantage for spec-kit for non-BDD audiences | Slight gain |
| Cost to migrate remaining 6 profiles | N/A (current) | `core` (5 scenarios, 46 lines) took one hour; `flow-insights` (16 scenarios, 168 lines, cross-stack CI) would take 3–5× longer and require manual cross-reference to Layer 2 assertions | High migration cost |

### Scale-Out Estimate

Migrating all seven profiles from Gherkin to spec-kit:

| Profile | Scenarios | Lines | Relative difficulty |
| --- | --- | --- | --- |
| `core` | 5 | 46 | Baseline (this MVP) |
| `operational` | ~6 | ~55 | Low |
| `status-profile` | ~8 | ~70 | Medium (exact enum values) |
| `mcp-profile` | ~10 | ~90 | Medium |
| `auth-profile` | ~8 | ~75 | Medium |
| `flow-insights` | 16 | 168 | High (cross-stack CI, semantic-equivalence job) |
| `ui-profile` | ~7 | ~60 | Medium |

Estimated total migration effort: 20–40 hours of authoring plus an unknown
amount of Layer 2 harness adaptation, since the spec-kit `spec.md` does not
provide the 1:1 step mappings that `core.ts` relies on today.

### Axis C: Key Finding

spec-kit `spec.md` can represent the field-name and content-type constraints
of the `core` profile in a readable narrative form. However, it is a
categorically different artifact from Gherkin: it is a prose specification,
not an executable scenario script. The Layer 2 TypeScript harness
(`tests/src/profiles/core.ts`) would require a custom code generator — not
provided by spec-kit — to be re-derived from a `spec.md` source.

The "feature file wins" tiebreaker (ADR-0009) has no analog in spec-kit.
Without a formal tiebreaker mechanism, spec/harness divergence would be
detected only through manual review, not through tooling.

An `Adopt-Hybrid` model is theoretically possible: use spec-kit `spec.md` as
a narrative planning layer and retain Gherkin `.feature` files as the
executable Layer 1. However, this would add a third layer with its own sync
obligation, increasing maintenance cost without a clear benefit over the
current two-layer model.

### Axis C Recommendation: `Reject`

spec-kit cannot replace Gherkin `.feature` files as Layer 1 ground truth
without a custom code generator bridging `spec.md` to Layer 2 assertions and
a new tiebreaker mechanism. The category mismatch (narrative prose vs.
executable scenarios) is fundamental, not incidental. Retain Gherkin as the
Layer 1 format (ADR-0009 unchanged).

---

## Consolidated Three-Verdict Summary

| Axis | Question | Verdict | Rationale |
| --- | --- | --- | --- |
| A — Dev-flow | Would spec-kit optimize `/find-work → /plan-work → /ship-changes`? | `Defer-Pending-Prereq` | Template stability and GitHub Issues integration unmet at v0.7.x |
| B — ADRs | Would spec-kit improve architectural decision capture? | `Reject` | Governance regression on lifecycle, supersede-chain, and intake-threshold properties |
| C — Layer 1 | Can spec-kit replace Gherkin as Layer 1 ground truth? | `Reject` | Category mismatch: prose FRs are not executable scenarios; no Layer 2 re-derivation path |

## Cross-Axis Consistency Check

The three verdicts are consistent:

- Axes B and C both reject spec-kit for roles that require **enforcement
  properties** (tiebreaker semantics, lifecycle state transitions, executable
  step-to-assertion mapping). spec-kit is an authoring tool, not an enforcement
  mechanism.
- Axis A defers rather than rejects, acknowledging that spec-kit's dev-flow
  chain has structural overlap with the IDP skill chain, but that the
  repo-policy prerequisites are not met.
- No axis recommends adoption as a drop-in replacement. Any future
  `Adopt-Hybrid` path for Axis A would require a stable `constitution.md`
  template that encodes AGENTS.md policy — a separate, scoped effort.

## Follow-Up Recommendations

If Axis A is revisited (spec-kit v1.x with stable GitHub integration):

- Scope: evaluate whether spec-kit `constitution.md` can fully encode
  the IDP repo's label taxonomy, worktree rules, and commit closure language.
- Do not start without confirming a proto/uv reproducible install path
  (ADR-0007 and ADR-0012 compatibility).

For Axes B and C, no follow-up is recommended. The current formats are
working, well-understood, and do not have identified gaps that spec-kit
would fill.
