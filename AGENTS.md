# AGENTS.md — Intent-Driven Portal (IDP)

This is the operating-manual index for coding agents working in this repo.
Detailed rules live in topic files under [`.agents/docs/`](.agents/docs/);
shared rules referenced by multiple consumers live in
[`.agents/docs/shared/`](.agents/docs/shared/).

## How to use this index

1. Read [`.agents/docs/core-rules.md`](.agents/docs/core-rules.md) — Tier 1,
   always relevant.
2. Scan the index below and load only the topic docs your current task needs.
3. Skills (`.agents/skills/<name>/SKILL.md`) link out to shared docs rather
   than duplicate rules inline.

## Roadmap alignment

Treat [ROADMAP.md](ROADMAP.md) as the target-state capability map, not proof
a capability exists. Prefer the smallest end-to-end slice (contract, runnable
behavior, docs, verification) and separate implemented behavior from planned
direction in user-facing copy.

## Tier 1 — always apply

- [core-rules.md](.agents/docs/core-rules.md) — principles, repo boundary,
  what-not-to-do, validation/verification.

## Tier 2 — most tasks

- [multi-agent.md](.agents/docs/multi-agent.md) — concurrent collaboration,
  branch hygiene, real-time adaptation.
- [issue-workflow.md](.agents/docs/issue-workflow.md) — GitHub-Issue-driven
  workflow, triage model, draft-to-ready PR lifecycle.
- [ci-cd-make.md](.agents/docs/ci-cd-make.md) — moon/make hierarchy,
  workflow script and permissions policy.
- [build-commands.md](.agents/docs/build-commands.md) — install/lint/test/run
  commands, moon project IDs, stack and container targets.
- [git-standards.md](.agents/docs/git-standards.md) — branch protection,
  SemVer, hooks. Commit format and cadence live in shared docs.
- [security.md](.agents/docs/security.md) — secrets, SBOM, vulnerability
  scan policy.

## Tier 3 — load when relevant

- [documentation.md](.agents/docs/documentation.md) — doc requirements,
  audience paths, DoD.
- [code-style.md](.agents/docs/code-style.md) — general style, imports,
  formatting, types, naming, errors, logging.
- [file-conventions.md](.agents/docs/file-conventions.md) — directory
  layout, test-harness sync rule, diagram sync rule.
- [cross-platform.md](.agents/docs/cross-platform.md) — Windows/macOS/Linux
  developer UX, Bash-tool `cd` rule.
- [adr-guardrails.md](.agents/docs/adr-guardrails.md) — current ADR list,
  intake threshold, long-lived doc reference rule.

## Skills

Agent skills live in `.agents/skills/<name>/SKILL.md`. `.claude/skills/` is an
auto-generated copy used by Claude Code for native skill discovery — edit only
`.agents/skills/`; run `make sync-skills` to regenerate (the pre-commit hook
does this automatically when `.agents/skills/` files are staged). Run
`make setup-hooks` once after cloning to enable the hook.

## Shared rule blocks (referenced by docs and skills)

- [shared/github-api.md](.agents/docs/shared/github-api.md) — access
  priority, retry, branch visibility, CI-failure debugging.
- [shared/commit-format.md](.agents/docs/shared/commit-format.md) —
  Conventional Commits, `Closes #N` vs `Refs #N`.
- [shared/worktree.md](.agents/docs/shared/worktree.md) — canonical issue
  worktree paths and helper tasks.
- [shared/iterative-commits.md](.agents/docs/shared/iterative-commits.md) —
  small-commit cadence, working-memory discipline.

## Maintenance

- Keep every file in this agent system (AGENTS.md, `.agents/docs/**`,
  `.agents/skills/**`) as lean as possible. Agents load these files to
  build their context window; unnecessary length costs tokens on every run.
- Say the minimum that produces correct behavior. One precise bullet beats
  three verbose ones.
- When updating a rule, remove redundant or superseded text in the same
  commit — do not append; edit in place.
- Skills must not duplicate rules already in `.agents/docs/` — link instead.

## Editor entry points

- [CLAUDE.md](CLAUDE.md) — Claude Code entry; embeds top-5 always-on rules.
- [.github/copilot-instructions.md](.github/copilot-instructions.md) —
  GitHub Copilot entry; points here.
- No `.cursor/rules/` or `.cursorrules` in this repo.

Do not duplicate content between CLAUDE.md, copilot-instructions.md, and
this index. New rules belong in an `.agents/docs/` topic file.
