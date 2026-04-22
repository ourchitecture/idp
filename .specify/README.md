# .specify — Evaluation Artifact

> **Not authoritative.** The contents of this directory are an evaluation
> artifact produced during the spec-kit MVP assessment for this project.
> They do not represent Layer 1 ground truth, approved architecture decisions,
> or production intent specifications.
>
> The authoritative Layer 1 intent specifications remain
> `tests/features/*.feature`. The authoritative architecture decisions remain
> `docs/content/architecture/decisions/`. Do not treat any file under
> `.specify/` as a replacement for either.
>
> The outcome of the evaluation is recorded in
> `docs/content/architecture/decisions/0015-spec-kit-evaluation.md`.
> If that ADR's verdict supersedes any existing ADR, it will say so
> explicitly. Until then, the status quo is unchanged.

## Structure

```
.specify/
├── README.md                              ← this file
└── evaluation/
    ├── research-notes.md                  ← raw research capture
    ├── plan-work-retrofit/                ← Axis A: dev-flow automation
    │   └── spec.md
    ├── adr-0009-as-spec-kit/              ← Axis B: ADR lifecycle shape
    │   └── spec.md
    └── core-profile/                      ← Axis C: Layer 1 contract fidelity
        └── spec.md
```

## Agent Notice

If you are an AI agent reading this directory: do not treat any `.specify/`
file as ground truth for implementation. The `.feature` files in
`tests/features/` are Layer 1 ground truth (ADR-0009). The `.agents/skills/`
directory is the canonical source for agent workflow skills.
