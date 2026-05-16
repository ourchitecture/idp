# Documentation Requirements

Docs are updated alongside code for child projects, reference implementations,
and new functionality. Keep docs minimal but operationally complete.

## Baseline

- Every new/updated guide starts with a brief, non-technical statement of why
  the solution exists before technical details.
- Audience-specific and discoverable from a docs entry map (top-level
  `README.md` and/or `docs/` index).
- No runnable code paths left undocumented. Include minimum prerequisites and
  validated run steps.

## Required audience paths

- Brief overview and getting started (non-technical first, then technical
  quickstart).
- Expert shortcut links to deep technical resources (ADR index, contracts,
  architecture, runbooks).
- General user guide.
- Developer implementation guide.
- Operations guide.
- Security guide.
- Contributor guide (non-technical and technical paths).

## Minimum prerequisite and runtime docs

For each runnable stack, child project, or major component, document:

- Required tools and supported versions.
- Required access and setup assumptions.
- Environment variables, defaults, and where to set them (never commit
  secrets).
- Install, run, lint, and test commands.
- Default ports and override behavior.
- Platform-specific caveats (Windows, macOS, Linux differences).

## Additional required operational docs

- Configuration reference (inputs, defaults, examples).
- API/contract reference for externally consumed interfaces.
- Troubleshooting and known issues.
- Release lifecycle (changelog, upgrade notes, deprecation policy, support window).
- Ownership and support model (maintainers, escalation, issue labels).
- Testing and verification guide (what "done" means, how to validate).
- Glossary for cross-functional readers when domain terms are non-obvious.

## Definition of done

- Doc updates are in the same change as code whenever behavior, setup,
  operations, or interfaces change.
- Docs entry map links updated so new material is discoverable.
- Commands in docs are copy/paste ready and validated.
- Markdown lint passes for changed doc files.
- If no doc update is needed, capture explicit rationale in the PR or issue.
