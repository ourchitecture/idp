# Commit Format (Shared)

Canonical rules for commit messages. Referenced by AGENTS.md and skills.

## Conventional Commits (required for agents)

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `security`, `revert`.

- AI agents **must** use Conventional Commits. Human contributors are
  encouraged but not required.
- Keep commits atomic — one logical change per commit.
- Branch naming: `<type>/<short-description>`.

## Issue references

Every commit must reference an issue in the footer:

- `Closes #N` — use when **all** acceptance criteria for issue N are met by
  this commit. The PR/merge will auto-close the issue.
- `Refs #N` — use when the commit relates to issue N but does not complete it.

Never downgrade `Closes` to `Refs` because of transient GitHub API
unavailability — the commit message reflects intent, not tool state. See
[github-api.md](github-api.md) for handling API outages.

## Breaking changes

Mark breaking changes with `!` after the type/scope and a `BREAKING CHANGE:`
footer:

```text
feat(api)!: drop legacy /v1 endpoints

BREAKING CHANGE: clients must migrate to /v2 before 2026-Q3.
Closes #123
```

## Co-authorship

Agent commits should include the agent identity in a `Co-Authored-By` footer
when supported by the agent runtime.
