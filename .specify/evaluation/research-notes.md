# spec-kit Research Notes

> Evaluation artifact — not authoritative. See `.specify/README.md`.
> These notes were captured during the spec-kit MVP evaluation for IDP.

## What Is spec-kit?

spec-kit (GitHub: `github/spec-kit`) is an open-source toolkit that implements
**Spec-Driven Development (SDD)**. It provides a structured workflow for
authoring software specifications that drive AI-agent implementation loops.
The core claim is that specifications authored in spec-kit's format become
executable artifacts that agents can act on directly, rather than static
guidance documents.

## Version and Maintenance Signal

- Latest release: v0.7.4 (April 21, 2026)
- Total releases: 133
- Commits: 826
- Open issues: 502
- Stars: ~90k; Forks: ~7.7k
- Language: 92% Python, 4.3% Shell, 3.7% PowerShell
- **Verdict**: Actively maintained; high community adoption. Maintenance
  signal is strong, though 502 open issues suggests rapid growth outpacing
  triage capacity.

## License

MIT. No restriction on commercial or internal use. Permissive for embedding
outputs/templates in this repository.

## Runtime Prerequisites

| Prerequisite | Version |
| --- | --- |
| Python | 3.11+ |
| uv | latest |
| Git | any recent |
| AI coding agent | one of 30+ supported integrations |

**Conflict note**: This repo pins Python via `proto` / `unstable_python` +
`unstable_uv` (ADR-0007, ADR-0012). spec-kit requires `uv tool install`
from the git source, which is a global install outside the repo toolchain
pin. A proto plugin or container wrapper would be needed for reproducible
install in CI.

## Artifact Layout

```text
.specify/
├── memory/
│   └── constitution.md       # project governing principles
├── specs/
│   └── NNN-feature/
│       ├── spec.md            # functional requirements / user stories
│       ├── plan.md            # technical implementation strategy
│       ├── tasks.md           # ordered, actionable task breakdown
│       └── contracts/         # optional: API specs, data models
├── templates/                 # core SDD templates (cloned from spec-kit)
├── extensions/                # installed community extensions
├── presets/                   # team customization templates
└── scripts/                   # automation helpers
```

## Workflow / Command Surface

| Step | Command | Output |
| --- | --- | --- |
| Establish principles | `/speckit.constitution` | `memory/constitution.md` |
| Define requirements | `/speckit.specify` | `specs/NNN-feature/spec.md` |
| Create tech strategy | `/speckit.plan` | `specs/NNN-feature/plan.md` |
| Generate task list | `/speckit.tasks` | `specs/NNN-feature/tasks.md` |
| Consistency check | `/speckit.analyze` (optional) | inline report |
| Execute tasks | `/speckit.implement` | code changes |
| Clarify requirements | `/speckit.clarify` | updated spec.md |
| Quality checklist | `/speckit.checklist` | pass/fail report |

Commands are delivered as slash commands to an AI coding agent (Copilot,
Gemini CLI, Claude, etc.). spec-kit is not a standalone runtime; it depends
entirely on the agent to interpret and execute the commands.

## AI Agent Integration Model

spec-kit integrates with 30+ AI coding agents. The workflow depends on an
agent interpreting the slash commands and reading/writing files under
`.specify/`. There is no standalone CLI that executes spec-kit steps
independently of an AI agent.

## Key Observations for IDP Evaluation

### On Axis A (Dev-flow automation)

- spec-kit provides `spec.md → plan.md → tasks.md → implement` as a
  structured artifact chain. The IDP repo has a similar chain:
  `find-work → plan-work → ship-changes` via GitHub Issues.
- spec-kit's artifacts live in `.specify/specs/NNN-feature/`, while IDP's
  plan artifacts live as GitHub Issue comments.
- spec-kit does not natively integrate with GitHub Issues, labels, or the
  canonical worktree/branch model the IDP repo uses. Custom `constitution.md`
  and template overrides could encode these policies, but that is non-trivial
  maintenance burden.
- spec-kit's `/specify` and `/plan` steps produce static Markdown files; IDP's
  `plan-work` skill produces a live GitHub Issue comment that is the
  authoritative review artifact, supports maintainer overrides, and drives
  label state transitions. These are conceptually different outputs.

### On Axis B (Decision capture / ADRs)

- spec-kit does not have a native ADR concept. Its closest analog is a `spec.md`
  (requirements) or `plan.md` (technical strategy), neither of which has
  the `Proposed → Accepted → Superseded` lifecycle model that the IDP ADR
  format uses.
- spec-kit's `contracts/` subdirectory could hold ADR-like decision records,
  but spec-kit provides no tooling to enforce ADR numbering, status transitions,
  cross-reference traceability, or intake-threshold gates.

### On Axis C (Intent-driven contracts / Layer 1 replacement)

- spec-kit's `spec.md` is a Markdown narrative of functional requirements and
  user stories. It does not produce executable scenarios with Given/When/Then
  step semantics.
- Gherkin `.feature` files encode exact HTTP status codes, field names, enum
  values, and content-type assertions in a form that maps 1:1 to Layer 2
  TypeScript assertions. spec-kit `spec.md` files are narrative and are not
  mapped to test step definitions.
- There is no spec-kit concept of "feature file wins" — a tiebreaker rule
  that makes one artifact authoritative over another when they diverge.
- spec-kit's `/implement` step generates code, not test assertions. Producing
  a Layer 2 harness from a spec-kit spec.md would require a custom generator
  not provided by spec-kit.
