# Issue-Driven Workflow

All agent work starts from a GitHub Issue. No untracked work.

## Rules

- Use any available GitHub API channel for issue/PR operations
  (see [shared/github-api.md](shared/github-api.md)).
- Only work on authorized issues from `@idp-admin` or `@idp-maintain`.
- External-author issues get `needs-triage` and a maintainer review request.
- Comment on the issue for key decisions, blockers, or scope changes.
- Link related PRs/issues/refs as issue comments so stakeholders can follow.
- When beginning implementation on an approved issue, add `in-progress`.
- Before implementing, create or reuse the canonical worktree via the
  worktree helpers (see [shared/worktree.md](shared/worktree.md)).
  Planning is non-mutating and may stay in main checkout.

## Draft-to-ready PR lifecycle

Two-phase validation using GitHub's draft PR status:

1. **Create PRs as drafts** (`gh pr create --draft` or MCP
   `create_pull_request` with `draft: true`). Draft PRs trigger only
   lightweight CI (change detection, markdown lint, commit message validation).
2. **Mark ready for review** (`gh pr ready` or MCP `update_pull_request`
   with `draft: false`) once local validation passes. This triggers the full
   pipeline (stack validation, container builds, integration tests).
3. Agents must mark PRs ready before requesting human review. Don't hand off
   in draft status.

Enforced by draft-aware `if` conditions in `pr-validate.yml` and
`container-build.yml`.

## Triage model

The Issue Triage workflow (`.github/workflows/issue-triage.yml` plus
`scripts/ci/issue-triage.sh`) is deliberately narrow so maintainer overrides
are not reverted:

- Fires only on `opened`, `reopened`, `edited` — never on `labeled`. Manual
  label changes by maintainers are authoritative.
- On `opened`/`reopened`: checks if author is in `@ourchitecture/idp-admin`
  or `@ourchitecture/idp-maintain`. Applies `ready` (team) or `needs-triage`
  (external). Membership read via `IDP_TRIAGE_TOKEN` (needs `read:org`); the
  default `GITHUB_TOKEN` cannot read team membership.
- On `edited`: refreshes only form-field labels (priority, domain, task type,
  agent eligibility). Never touches `ready` or `needs-triage`.
- Maintainers can move issues `needs-triage` → `ready` at any time; no
  workflow will undo that.
