---
name: triage-community-work
version: 1.1.0
description: >
  Triages PRs and issues from external contributors that need maintainer
  attention. Flags each item with a reason and recommended next step.
  Defaults to a shorter stale window than triage-managed-work because
  prompt community responses build contributor trust.
author: "@idp-maintain"
domain: devops
tags: [github, triage, community, pull-request, issues, contributor]
depends_on: []
inputs:
  - name: stale_days
    type: number
    required: false
    default: 3
    description: Days without maintainer response before flagging.
  - name: maintainer_teams
    type: array
    required: false
    description: Team slugs treated as maintainers. Default `@idp-admin`, `@idp-maintain`.
  - name: issue_number
    type: number
    required: false
    description: Optional issue to post the report to.
outputs:
  - name: report
    type: object
    description: Triage report with categorized community items, reasons, next steps.
  - name: attention_count
    type: number
    description: Total community items flagged.
  - name: items
    type: array
    description: Per-item entity_type, entity_id, contributor, ages, waiting_on, reasons, severity, action.
---

# Triage Community Work

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## 1. Identify maintainers (community = NOT in this set)

Build the maintainer/agent set as in
[triage-managed-work](../triage-managed-work/SKILL.md):

- From `maintainer_teams` if provided, else `@idp-admin` + `@idp-maintain`.
- Plus authors with `[bot]` in username or `type: Bot`.

Resolve via `gh api orgs/<owner>/teams/<slug>/members` (fallback:
`repos/<owner>/<repo>/collaborators`).

## 2. Gather open items

MCP `list_pull_requests`, `list_issues`. CLI fallback:

```bash
gh pr list --state open --json number,title,body,headRefName,baseRefName,isDraft,url,createdAt,updatedAt,author,reviews,reviewRequests,statusCheckRollup,labels,assignees,comments
gh issue list --state open --json number,title,body,labels,url,createdAt,updatedAt,author,assignees,comments
```

## 3. Filter to community items

Keep items whose author is **not** in the maintainer/agent set.

## 4. Detection rules

**Pull requests:**

- *No maintainer review* — no maintainer approval, change request, or
  review comment. **High**. Next: assign a reviewer and post acknowledgment.
- *Awaiting maintainer reply* — latest activity is from the contributor,
  > `stale_days` ago. **Medium**. Next: respond with feedback, approval,
  or timeline.
- *Merge conflicts* — **Medium**. Next: ask for rebase or resolve on their
  behalf if change is valuable.
- *Failing required checks* — rulesets block merge. **High**. Next:
  comment with guidance or push fix if fork allows maintainer pushes.
- *Draft with no guidance* — **Medium**. Next: provide directional
  feedback and explain what unblocks ready-for-review.
- *Wrong base branch* — `main` ruleset only protects PRs targeting `main`.
  **Low**. Next: explain correct base and help retarget.

**Issues:**

- *Needs triage* — `needs-triage` or no workflow labels at all. **Low**.
  Next: triage and label or close with explanation.
- *No maintainer response* — zero maintainer comments. **High**. Next:
  post acknowledgment ("Thanks for reporting, we'll look into this").
- *Awaiting maintainer reply* — latest comment from contributor,
  > `stale_days` ago. **Medium**. Next: respond with answer or status.
- *Stale with no resolution* — open > 30 days, no `ready`/`in-progress`,
  fewer than 2 maintainer comments. **Medium**. Next: accept, request
  info, or close with explanation.
- *Bug with no reproduction acknowledgment* — `bug` label, no maintainer
  comment confirming/denying repro. **Low**. Next: attempt to reproduce,
  comment with result.

## 5. Severity overrides

Any item where the contributor explicitly asks for help or expresses
frustration in their most recent comment is escalated to **High**.

## 6. Report

Per item: entity (PR/issue + number), contributor, age, last activity,
waiting on (maintainer | contributor), reason(s), severity, next step.

```markdown
# Community Work Triage Report

## Summary
- PRs: N | Issues: N | Total: N | High: N | Medium: N | Low: N
- Average response time: X days

## Pull Requests
| PR | Contributor | Age | Waiting On | Reason | Severity | Next Step |

## Issues
| Issue | Contributor | Age | Waiting On | Reason | Severity | Next Step |
```

If empty: "All community PRs and issues have been responded to."

## 7. Post to issue (optional)

If `issue_number`: MCP `add_issue_comment` or `gh issue comment`.

## 8. Return

`report`, `attention_count`, `items` (each: entity_type, entity_id,
contributor, age_days, last_activity_days, waiting_on, reasons[],
severity, recommended_action).
