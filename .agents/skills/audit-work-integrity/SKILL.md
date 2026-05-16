---
name: audit-work-integrity
version: 1.1.0
description: >
  Audits branch/PR/issue relationships. Flags orphan branches, PRs without
  linked issues, in-progress issues without active PRs, and duplicate active
  work paths.
author: "@idp-maintain"
domain: devops
tags: [github, workflow, audit, branch-hygiene, pull-request, issues]
depends_on: []
inputs:
  - name: base_branch
    type: string
    required: false
    default: main
    description: Base branch active PRs should target.
  - name: remote
    type: string
    required: false
    default: upstream
    description: Remote used when fetching branch details via git.
  - name: strict_branch_pr
    type: boolean
    required: false
    default: true
    description: If true, any non-exempt branch without an open PR is high-severity.
  - name: stale_days
    type: number
    required: false
    default: 14
    description: Used when strict_branch_pr=false; newer branches aren't flagged.
  - name: exempt_branches
    type: array
    required: false
    description: Exact branch names to ignore (beyond main/master/base_branch).
  - name: exempt_branch_prefixes
    type: array
    required: false
    description: Branch prefixes to ignore (e.g., release/, sandbox/).
  - name: include_closed
    type: boolean
    required: false
    default: false
    description: Include recently closed PRs/issues for context notes.
  - name: stale_agent_minutes
    type: number
    required: false
    default: 30
    description: >
      Minutes since last heartbeat update before a worktree's agent session is
      flagged as potentially hung or silently failed. Set to 0 to skip
      heartbeat checks.
  - name: issue_number
    type: number
    required: false
    description: Optional issue to post the audit report to.
outputs:
  - name: report
    type: object
    description: Summary, findings, recommended actions.
  - name: overall_status
    type: string
    description: pass | warn | fail.
  - name: score
    type: number
    description: Integrity score 0–100.
  - name: findings
    type: array
    description: Findings with severity and remediation.
---

# Audit Work Integrity

Strict by default: non-exempt branches without an open PR are flagged
immediately; open PRs must link an issue; `in-progress` issues must have an
active linked PR; canonical worktrees must not accumulate stale state.

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).
Worktree rules: [../../docs/shared/worktree.md](../../docs/shared/worktree.md).

## 1. Repo context and exemptions

Resolve owner/repo. Build exact-match exemptions: `main`, `master`,
`base_branch`, plus `exempt_branches` input. Prefix exemptions from
`exempt_branch_prefixes`. No other branch grace period applies when
`strict_branch_pr=true`.

## 1b. Scan autonomous-task worktrees (when `stale_agent_minutes` > 0)

For each path under `.agents/worktrees/`:

1. Check for `.agent-lock` — records the active session ID and start time.
2. Check for `.agent-heartbeat` — records the last completed step and its
   timestamp.
3. Classify:
   - **Active:** lock exists AND heartbeat is newer than `stale_agent_minutes`.
   - **Stale / possibly hung:** lock exists AND heartbeat is older than
     `stale_agent_minutes`. → Medium finding.
   - **Abandoned:** lock exists but NO heartbeat file, OR lock file is absent
     but the branch has uncommitted changes and no recent commit. → Medium finding.
   - **Clean / idle:** no lock file; worktree is either clean or pending
     developer review (`local_only=true` run). → Low finding only if the
     worktree branch has no PR and no recent commit within `stale_days`.

Report each stale or abandoned worktree with:
- Path, lock session ID and start time (if available)
- Last heartbeat step and timestamp (if available)
- Recommended action: investigate the session, manually release the lock
  (`rm <path>/.agent-lock`), then re-invoke `autonomous-task` with `skip_to`
  to resume, or abandon and run `make worktree-cleanup`.

## 2. Gather data (MCP-first)

MCP: `list_branches`, `list_pull_requests`, `list_issues`. Filter to
`open`; prefer PRs targeting `base_branch`. Run the canonical worktree
audit helper if available and merge findings.

CLI fallback:

```bash
gh api "repos/<owner>/<repo>/branches?per_page=100" --paginate
gh pr list --state open --base <base_branch> \
  --json number,title,body,headRefName,baseRefName,isDraft,url,createdAt,updatedAt,author
gh issue list --state open \
  --json number,title,body,labels,url,createdAt,updatedAt,author,assignees
```

If `include_closed=true`, also fetch recently closed PRs/issues.

## 3. Normalize and link

- **Branch→PR**: exact `headRefName` match.
- **PR→Issue**: prefer `closingIssuesReferences`; else parse title/body for
  `(?i)\b(closes|fixes|resolves|refs?)\s+#(\d+)\b`.
- **Issue→PR**: reverse index.
- **Branch→Issue hint**: regex `(?:^|[/-])(?:issue-)?(\d+)(?:[/-]|$)`.

## 4. Findings

**High:** orphan branch (non-exempt, no open PR); PR missing issue link;
`in-progress` issue without active linked PR.

**Medium:** duplicate PRs for one issue; multiple active branches per
issue; branch name hints an issue but no PR; duplicate worktrees per
issue; wrong checkout for an active issue; stale or abandoned autonomous
agent session (lock present, heartbeat older than `stale_agent_minutes`).

**Low:** ambiguous `#N` references in PR body without close/ref verbs;
closed-context mismatch (only when `include_closed=true`); local worktree
cleanup drift (clean worktree after remote branch gone, or path on disk
not registered with `git worktree`).

## 5. Score and status

Start at `100`. Penalties: high `-25` each (max `-75`); medium `-10`
(max `-30`); low `-3` (max `-15`). Clamp to `[0,100]`.

- `fail` if any high finding.
- `warn` if no high but any medium/low.
- `pass` if no findings.

## 6. Build the report

1. **Summary** — counts of branches/PRs/issues/worktrees, findings by
   severity, score and status.
2. **Findings** — `id`, severity, entity type/id, evidence, action.
3. **Recommended actions** — create PRs for orphans; add `Closes #N` /
   `Refs #N` links; reconcile duplicate PRs; clear stale `in-progress`;
   use canonical worktree helpers instead of ad hoc deletion.

Example commands:

```bash
gh pr create --base <base_branch> --head <branch> \
  --title "<type>(<scope>): <description>" --body "Closes #<issue_number>"
gh pr edit <pr_number> --body-file <updated_body_file>
gh issue edit <issue_number> --remove-label "in-progress"
```

## 7. Post to issue (optional)

If `issue_number` provided, post via MCP `add_issue_comment` or
`gh issue comment`.

## 8. Return

`report`, `overall_status`, `score`, `findings`. If no findings, explicitly
state that repository workflow integrity is currently clean.
