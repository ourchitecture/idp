---
name: find-work
version: 1.1.0
description: >
  Queries GitHub Issues to find the next available issue to work on.
  Respects team authorization, priority ordering, and assignment rules.
author: "@idp-maintain"
domain: devops
tags: [github, issues, discovery, workflow, automation]
depends_on: []
inputs:
  - name: domain
    type: string
    required: false
    description: Filter by domain label (ai, api, security, etc.). Omit for all domains.
  - name: max_results
    type: number
    required: false
    default: 5
    description: Maximum issues to return.
outputs:
  - name: issues
    type: array
    description: Sorted list with number, title, priority, labels, assignee.
  - name: recommended
    type: number
    description: Issue number recommended as next item by priority.
---

# Find Work

Discovers the next available issue. GitHub API access uses the priority order
in [../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## 1. Query open issues

Filter: `state=open`, `labels=ready`. Add the `domain` input as an additional
label filter if provided.

MCP: `list_issues`. CLI fallback:

```bash
gh issue list --state open --label ready \
  --json number,title,labels,assignees,author,createdAt --limit 50
```

## 2. Filter

Exclude issues that:

- Have `in-progress` or `blocked`.
- Are assigned to someone else (unless idle > 7 days with no recent comments).

Note (but don't exclude) issues missing `agent-eligible` — they're available
for humans only.

## 3. Sort by priority

1. Assigned by `@idp-admin`.
2. Assigned by `@idp-maintain`.
3. Created by `@idp-admin`.
4. Created by `@idp-maintain`.
5. Priority label: `p0-critical` > `p1-high` > `p2-medium` > `p3-low`.
6. Oldest creation date (tiebreaker).

## 4. Return

Up to `max_results` items showing: number/title, priority/domain,
`agent-eligible`, assignee, age, and the worktree next step
(`moon run repo:worktree-ensure` or `make worktree-ensure` with
`ISSUE_NUMBER` — see [../../docs/shared/worktree.md](../../docs/shared/worktree.md)).

Set `recommended` to the top-ranked issue number. If no eligible issues,
suggest checking `needs-triage` for maintainer approval.
