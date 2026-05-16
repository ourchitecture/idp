# ADR Guardrails

To avoid documentation bloat, only record decisions in
`docs/content/architecture/decisions/` when they are expected to be
long-lived and expensive to reverse (architecture boundaries, contracts,
runtime conventions, security baselines).

## High-signal ADRs agents must respect

- `0001` layered intent/contract/implementation architecture.
- `0002` stack layout and required GNU Make target contract.
- `0003` implementation-agnostic TypeScript contract harness and runtime
  port contract.
- `0004` implementation portfolio and support tiers (Go default/reference,
  TypeScript and React-first support path, bootstrap transition rules).
- `0005` shared capability contract and profile-based conformance model.
- `0006` cross-platform local runtime UX baseline (loopback defaults,
  stable executable identity for compiled stacks).
- `0007` moon-required orchestration and proto-enhanced pinned toolchain
  policy.
- `0009` Gherkin as the Layer 1 intent specification format
  (`tests/features/*.feature` files are ground truth; the TypeScript
  harness in `tests/src/profiles/` is derived from them — when they
  disagree, the `.feature` file wins).
- `0011` IETF health endpoint contract (`/health` and `/readiness` paths,
  `application/health+json` media type, `pass`/`fail`/`warn` status values
  per `draft-inadarei-api-health-check-06`; applies to all hosted services).
- `0012` moon/proto Python-uv integration constraint (use `python` and
  `uv` moon toolchains mapped via `.prototools [plugins.tools]`; avoid
  unsupported direct `python`/`uv` moon toolchain IDs).

## Intake threshold for new ADRs

Add a new ADR only if **at least 3 of these 5 gates** are true:
cross-cutting scope, costly to reverse, contract surface, multi-quarter
longevity, drift risk. **At least one** of the true gates must be either
*costly to reverse* or *contract surface*. If the threshold isn't met,
document in regular docs instead.

## Long-lived documentation reference rule

ADRs and other long-lived docs (e.g., `docs/content/flow/`) must not
reference short-term artifacts: GitHub issues, PRs, milestones, project
cards, commit SHAs. If the content is valuable, integrate it directly.

Cross-references inside long-lived docs must point to other long-lived
canonical artifacts — file paths in this repo, other ADRs, or stable
external specifications.

Short-term project-management artifacts (issue comments, PR summaries,
release notes, changelog entries) may reference issues because they are
themselves short-term.
