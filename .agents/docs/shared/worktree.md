# Issue Worktree Isolation (Shared)

Canonical rules for issue-scoped worktrees. Referenced by AGENTS.md and skills.

## When worktrees apply

- **Planning, triage, audits, read-only exploration**: stay in the main
  checkout. Do not create branches or worktrees.
- **Implementation and shipping for an approved issue**: run from the
  canonical repo-local worktree.

## Canonical paths

- Worktree path: `.agents/worktrees/issue-<number>-<slug>`
- Branch name: `issue/issue-<number>-<slug>`

All worktree paths must remain inside the repository root. No sibling- or
parent-directory worktrees.

## Helper tasks (use these, not raw `git worktree`)

| Action | Moon (canonical) | Make (shortcut) |
| --- | --- | --- |
| Resolve worktree path | `moon run repo:worktree-path` | `make worktree-path` |
| Create or reuse | `moon run repo:worktree-ensure` | `make worktree-ensure` |
| Clean up after merge | `moon run repo:worktree-cleanup` | `make worktree-cleanup` |
| Audit existing worktrees | `moon run repo:audit-worktrees` | `make audit-worktrees` |

## Reuse, conflict, cleanup rules

- **Reuse**: if a worktree already exists for the same issue, use it. Don't
  create a second one.
- **Conflict**: if you're already inside another issue's worktree, stop and
  surface the conflict — do not create a second active checkout from there.
- **Dirty state**: if the current checkout is dirty and you're not in the
  matching issue worktree, stop and resolve the dirty state first.
- **Cleanup**: only after merge is confirmed AND the worktree is clean.
  Dirty or ambiguous worktrees must be reported via `audit-worktrees`, not
  deleted blindly.
