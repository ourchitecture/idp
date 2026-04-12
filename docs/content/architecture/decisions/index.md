---
sidebar_position: 1
---

# Architecture Decision Records

This section contains Architecture Decision Records (ADRs) for the Stemix / IDP project.

> This content is also available in the [GitHub repository](https://github.com/ourchitecture/idp/tree/main/docs/content/architecture/decisions).

## Format

All decision records use the [Markdown Any Decision Records (MADR)](https://adr.github.io/madr/) format.

## Naming Convention

Files follow the pattern `NNNN-title-with-dashes.md`:

- **NNNN**: Zero-padded 4-digit sequence number
- **title-with-dashes**: Lowercase, dash-separated descriptive title

## Process

1. Copy the template to a new file with the next sequence number.
2. Fill in all sections. Set status to `proposed`.
3. Submit a PR referencing the relevant GitHub Issue.
4. After review and approval, update status to `accepted`.

## Decision Intake Framework

Record a decision as an ADR only when it is long-lived, cross-cutting, and expensive to reverse.

Use these gates:

1. **Cross-cutting scope**: impacts multiple services, stacks, teams, or workflows.
2. **Reversal cost**: changing later requires broad migration, compatibility updates, or automation changes.
3. **Contract surface**: defines a boundary or contract (architecture, interfaces, runtime conventions, workflow/governance semantics, security baseline).
4. **Longevity**: expected to remain valid for multiple quarters.
5. **Drift risk**: likely to diverge if not codified in one canonical place.

Routing rule: Create an ADR when at least 3 gates are true and one is Gate 2 or Gate 3.

## Audience views

- [IDP Platform Decisions](./platform-decisions) — user-facing contracts,
  platform behavior, and cross-stack conformance expectations.
- [Internal Engineering Decisions](./internal-engineering-decisions) — repository
  build/orchestration/tooling constraints for maintainers and contributors.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](./intent-driven-architecture) | Intent-Driven Architecture | proposed | 2026-03-30 |
| [0002](./stack-layout-and-make-contract) | Stack Layout and Make Contract | proposed | 2026-03-30 |
| [0003](./contract-harness-and-runtime-port-contract) | Contract Harness and Runtime Port Contract | proposed | 2026-03-30 |
| [0004](./implementation-portfolio-and-support-tiers) | Implementation Portfolio and Support Tiers | proposed | 2026-03-30 |
| [0005](./shared-capability-contract-and-conformance-profiles) | Shared Capability Contract and Conformance Profiles | proposed | 2026-03-30 |
| [0006](./cross-platform-local-runtime-ux-baseline) | Cross-Platform Local Runtime UX Baseline | proposed | 2026-03-30 |
| [0007](./moon-required-proto-enhanced-toolchain-policy) | Moon-Required Orchestration and Proto-Enhanced Toolchain Policy | proposed | 2026-03-30 |
| [0008](./dependency-and-tooling-pinning-policy) | Dependency and Tooling Pinning Policy | proposed | 2026-03-31 |
| [0009](./intent-specification-format) | Gherkin as Layer 1 Intent Specification Format | proposed | 2026-03-31 |
| [0010](./container-build-strategy) | Container Build Strategy | proposed | 2026-03-31 |
| [0011](./ietf-health-endpoint-contract) | IETF Health Endpoint Contract | proposed | 2026-04-01 |
| [0012](./moon-python-uv-toolchain-integration-constraint) | Moon Python/uv Toolchain Integration Constraint | accepted | 2026-04-01 |
| [0013](./oauth-plugin-architecture) | Optional OAuth Plug-In Architecture | proposed | 2026-04-07 |
| [0014](./mvp-flow-observation-technical-foundations) | MVP Flow Observation Technical Foundations | proposed | 2026-04-11 |
