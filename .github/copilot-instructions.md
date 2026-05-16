# GitHub Copilot Custom Instructions

This repo's operating manual is indexed in [AGENTS.md](../AGENTS.md) at the
repository root. Treat that file (and the topic docs it links under
`.agents/docs/`) as authoritative. Do not duplicate rules here.

## Quick links

- [AGENTS.md](../AGENTS.md) — operating-manual index.
- [`.agents/docs/core-rules.md`](../.agents/docs/core-rules.md) — Tier 1
  rules that apply to every task.
- [`.agents/docs/shared/`](../.agents/docs/shared/) — canonical homes for
  GitHub API access, commit format, worktree isolation, iterative commits.

## Agent skills

Defined under `.agents/skills/<name>/SKILL.md`. Current skills:
`plan-work`, `ship-changes`, `find-work`, `audit-work-integrity`,
`triage-managed-work`, `triage-community-work`, `check-intent-coverage`,
`privacy-scan`, `research-name-availability`, `review-code`,
`review-issues`, `review-pull-requests`.

Each skill links out to the shared docs rather than restating shared rules.
