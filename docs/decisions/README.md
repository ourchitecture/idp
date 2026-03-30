# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Stemix / IDP project.

## Format

All decision records use the [Markdown Any Decision Records (MADR)](https://adr.github.io/madr/) format. See [template.md](template.md) for the standard template.

## Naming Convention

Files follow the pattern `NNNN-title-with-dashes.md`:

- **NNNN**: Zero-padded 4-digit sequence number
- **title-with-dashes**: Lowercase, dash-separated descriptive title

## Process

1. Copy `template.md` to a new file with the next sequence number.
2. Fill in all sections. Set status to `proposed`.
3. Submit a PR referencing the relevant GitHub Issue.
4. After review and approval, update status to `accepted`.

## Decision Intake Framework

Be selective to avoid ADR sprawl. Record a decision as an ADR only when it is
long-lived, cross-cutting, and expensive to reverse.

Use these gates:

1. **Cross-cutting scope**: impacts multiple services, stacks, teams, or
   workflows.
2. **Reversal cost**: changing later requires broad migration, compatibility
   updates, or automation changes.
3. **Contract surface**: defines a boundary or contract (architecture,
   interfaces, runtime conventions, workflow/governance semantics, security
   baseline).
4. **Longevity**: expected to remain valid for multiple quarters.
5. **Drift risk**: likely to diverge if not codified in one canonical place.

Routing rule:

- Create an ADR when at least 3 gates are true and one is Gate 2 or Gate 3.
- Otherwise document in regular docs (`AGENTS.md`, service/stack READMEs,
  or feature docs).

Not ADR-worthy by default:

- Tool version pins and routine dependency bumps
- Lint rule tuning and formatting preferences
- Cosmetic metadata (label colors, naming examples)
- Local implementation details that do not create cross-team contracts

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-intent-driven-architecture.md) | Intent-Driven Architecture | proposed | 2026-03-30 |
| [0002](0002-stack-layout-and-make-contract.md) | Stack Layout and Make Contract | proposed | 2026-03-30 |
| [0003](0003-contract-harness-and-runtime-port-contract.md) | Contract Harness and Runtime Port Contract | proposed | 2026-03-30 |
| [0004](0004-implementation-portfolio-and-support-tiers.md) | Implementation Portfolio and Support Tiers | proposed | 2026-03-30 |
| [0005](0005-shared-capability-contract-and-conformance-profiles.md) | Shared Capability Contract and Conformance Profiles | proposed | 2026-03-30 |
| [0006](0006-cross-platform-local-runtime-ux-baseline.md) | Cross-Platform Local Runtime UX Baseline | proposed | 2026-03-30 |
