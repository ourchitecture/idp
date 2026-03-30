---
name: find-work
version: 1.0.0
description: >
  Queries GitHub Issues to find the next available issue to work on.
  Respects team authorization, priority ordering, and assignment
  rules from AGENTS.md. Use this skill when you need to discover
  what to work on next.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - issues
  - discovery
  - workflow
  - automation
depends_on: []
inputs:
  - name: domain
    type: string
    required: false
    description: >
      Filter issues by domain label (e.g., ai, api, security).
      If omitted, returns issues across all domains.
  - name: max_results
    type: number
    required: false
    default: 5
    description: Maximum number of issues to return.
outputs:
  - name: issues
    type: array
    description: >
      Sorted list of eligible issues with number, title, priority,
      labels, and assignee.
  - name: recommended
    type: number
    description: >
      The issue number recommended as the next item to work on,
      based on priority ordering.
---

# Find Work

Discovers the next available issue to work on by querying GitHub
Issues, filtering by authorization and status, and sorting by the
priority rules defined in AGENTS.md.

## Step 1: Query Open Issues

Use the GitHub MCP `list_issues` tool to fetch open issues for the
repository with the following filters:

- **state**: `open`
- **labels**: `ready` (issues must be triaged and approved)

If the `domain` input is provided, also filter by that domain label.

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh issue list --state open --label "ready" --json number,title,labels,assignees,author,createdAt --limit 50
```

If `domain` is provided, add `--label "<domain>"` to the command.

## Step 2: Filter Issues

From the results, exclude issues that:

1. Have the `in-progress` label (already being worked on).
2. Have the `blocked` label.
3. Are assigned to someone else (unless they have been idle for more
   than 7 days with no recent comments).

Also check for the `agent-eligible` label. Issues without this label
are available for human work but should be listed with a note that
they are not flagged for agent processing.

## Step 3: Sort by Priority

Sort the remaining issues using the AGENTS.md priority ordering:

1. Issues assigned by `@idp-admin` members (highest priority)
2. Issues assigned by `@idp-maintain` members
3. Issues created by `@idp-admin` members
4. Issues created by `@idp-maintain` members
5. By priority label: `p0-critical` > `p1-high` > `p2-medium` >
   `p3-low`
6. By creation date (oldest first) as a tiebreaker

## Step 4: Format and Return Results

Return up to `max_results` issues (default: 5) as a formatted list
showing:

- Issue number and title
- Priority and domain labels
- Whether it is `agent-eligible`
- Current assignee (if any)
- Age (days since creation)

Set `recommended` to the issue number of the top-ranked result.

If no eligible issues are found, report that clearly and suggest
checking for issues with `needs-triage` that may need a maintainer
to approve.
