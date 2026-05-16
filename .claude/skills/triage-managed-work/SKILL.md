---
name: triage-managed-work
version: 1.1.0
description: >
  Triages branches, PRs, and issues authored by maintainers or agents.
  Flags each item with a reason and recommended next step. Complements
  audit-work-integrity by focusing on actionable triage.
author: "@idp-maintain"
domain: devops
tags: [github, triage, branches, pull-request, issues, workflow, maintainer]
depends_on: []
inputs:
  - name: base_branch
    type: string
    required: false
    default: main
    description: Base branch active PRs should target.
  - name: stale_days
    type: number
    required: false
    default: 7
    description: Days without activity before an item is stale.
  - name: maintainer_teams
    type: array
    required: false
    description: Team slugs treated as maintainers. Default `@idp-admin`, `@idp-maintain`.
  - name: exempt_branches
    type: array
    required: false
    description: Exact branch names to skip (in addition to main/master).
  - name: exempt_branch_prefixes
    type: array
    required: false
    description: Branch prefixes to skip (e.g., release/, sandbox/).
  - name: issue_number
    type: number
    required: false
    description: Optional issue to post the report to.
outputs:
  - name: report
    type: object
    description: Triage report with categorized items, reasons, next steps.
  - name: attention_count
    type: number
    description: Total items flagged.
  - name: items
    type: array
    description: Per-item entity_type, entity_id, author, ages, reasons, severity, action.
---

# Triage Managed Work

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).
Commit format references: [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md).

## 1. Identify maintainer/agent authors

Build a set of maintainer/agent usernames:

- From `maintainer_teams` if provided, else `@idp-admin` + `@idp-maintain`.
- Plus any author with `[bot]` in username or `type: Bot`.

Resolve membership:
`gh api "orgs/<owner>/teams/<slug>/members" --paginate --jq '.[].login'`.
Fallback on permission error:
`gh api "repos/<owner>/<repo>/collaborators" --paginate --jq '.[].login'`.

## 2. Gather data

MCP `list_branches`, `list_pull_requests`, `list_issues`. CLI fallback:

```bash
gh api "repos/<owner>/<repo>/branches?per_page=100" --paginate
gh pr list --state open --json number,title,body,headRefName,baseRefName,isDraft,url,createdAt,updatedAt,author,reviewRequests,statusCheckRollup,labels,assignees
gh issue list --state open --json number,title,body,labels,url,createdAt,updatedAt,author,assignees,comments
```

## 3. Filter to managed items

Keep items authored by the maintainer/agent set. Community items are
handled by `triage-community-work`.

For branches with no PR, infer author from latest commit:
`gh api "repos/<owner>/<repo>/commits?sha=<branch>&per_page=1" --jq '.[0].author.login'`.
If still unknown, include with an `author unknown` note.

## 4. Exempt branch set

`main`, `master`, `base_branch`, `exempt_branches`, plus any matching
`exempt_branch_prefixes`.

## 5. Detection rules

Record every matching rule per item.

**Branches:**

- *Orphan (no PR)* — non-exempt branch with no open PR. **High**. Next:
  create PR or delete.
- *Non-conventional name* — doesn't match `<type>/<desc>` (types listed in
  [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md)).
  **Low**. Next: rename or create clarifying PR.
- *Wrong base* — PR targets something other than `base_branch`. **Low**.
  Next: verify intent or retarget.

**Pull requests:**

- *Stale* — no activity within `stale_days`. **High**. Next: merge,
  request changes, or close with reason.
- *Long-lived draft* — draft opened > `stale_days` ago. **Medium**. Next:
  mark ready or close.
- *Failing required checks* — merge blocked by rulesets. **High**. Next:
  investigate, fix, or rerun if transient.
- *No linked issue* — no `Closes/Fixes/Refs #N`. **Medium**. Next: add
  reference.
- *Unresolved review comments* — pending feedback. **Medium**. Next:
  address or reply.
- *Merge conflicts* — linear-history ruleset blocks merge. **High**. Next:
  rebase/merge `base_branch`.

**Issues:**

- *`in-progress` without active PR* — **High**. Next: create PR or remove label.
- *`in-progress` idle > `stale_days`* — **Medium**. Next: check in, unblock,
  or reassign.
- *`blocked`* — **High**. Next: investigate, resolve or escalate, remove label.
- *Assigned but idle > `stale_days`* — **Medium**. Next: status update or unassign.
- *`needs-review` idle > `stale_days`* — **Medium**. Next: approve or request changes.
- *`ready` without assignee* — **Low**. Next: assign or use `find-work`.

## 6. Severity (summary)

High: orphan branches, stale PRs, failing checks, `in-progress` without PR,
blocked issues, merge conflicts.
Medium: long-lived drafts, unresolved review comments, idle assigned issues,
needs-review idle, PRs missing issue link.
Low: non-conventional branch names, wrong base, ready-without-assignee.

## 7. Report

Per item: entity (type + id/name), author, age, last activity, reason(s),
severity, recommended next step.

```markdown
# Managed Work Triage Report

## Summary
- Branches: N | PRs: N | Issues: N | Total: N
- High: N | Medium: N | Low: N

## Branches
| Branch | Author | Age | Reason | Severity | Next Step |

## Pull Requests
| PR | Author | Age | Last Activity | Reason | Severity | Next Step |

## Issues
| Issue | Author | Assignee | Age | Last Activity | Reason | Severity | Next Step |
```

If empty: "All managed branches, PRs, and issues are in good shape."

## 8. Post to issue (optional)

If `issue_number`: MCP `add_issue_comment` or `gh issue comment`.

## 9. Return

`report`, `attention_count`, `items` (each: entity_type, entity_id, author,
age_days, last_activity_days, reasons[], severity, recommended_action).
