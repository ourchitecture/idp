---
name: triage-community-work
version: 1.0.0
description: >
  Searches for pull requests and issues submitted by community
  members (external contributors) that need maintainer attention.
  Identifies why each item needs attention and recommends a clear
  next step. Use this skill when you need to ensure community
  contributions are not being neglected.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - triage
  - community
  - pull-request
  - issues
  - workflow
  - automation
  - contributor
depends_on: []
inputs:
  - name: stale_days
    type: number
    required: false
    default: 3
    description: >
      Number of days without maintainer response before a community
      item is flagged. Defaults to 3 to reflect the higher urgency
      of responding to external contributors.
  - name: maintainer_teams
    type: array
    required: false
    description: >
      GitHub team slugs whose members are considered maintainers
      (e.g., idp-admin, idp-maintain). If omitted, uses the
      AGENTS.md defaults: @idp-admin and @idp-maintain.
  - name: issue_number
    type: number
    required: false
    description: >
      If provided, post the triage report as a comment on this issue.
outputs:
  - name: report
    type: object
    description: >
      Structured triage report with categorized community items,
      reasons, and recommended next steps.
  - name: attention_count
    type: number
    description: Total number of community items needing attention.
  - name: items
    type: array
    description: >
      Flat list of attention items, each with entity type, id, reason,
      severity, and recommended action.
---

# Triage Community Work

Searches for pull requests and issues submitted by community members
(external contributors) that need maintainer attention. Each flagged
item includes a reason explaining why it needs attention and a
concrete recommended next step.

Community responsiveness is a signal of project health. This skill
helps maintainers ensure that external contributions are acknowledged
promptly and guided through the review process.

## Step 1: Identify Maintainer and Community Authors

Determine which GitHub users are maintainers so that community
contributors can be identified by exclusion.

1. If `maintainer_teams` input is provided, resolve team membership
   using the GitHub API.
2. Otherwise, use the AGENTS.md defaults: members of `@idp-admin`
   and `@idp-maintain`.
3. Also classify any author whose username contains `[bot]` or whose
   type is `Bot` as a non-community author.

Build a set of maintainer/agent usernames. Any PR or issue author not
in this set is considered a community contributor.

Resolve team membership using the GitHub MCP tools or:

```bash
gh api "orgs/<owner>/teams/<team-slug>/members" --paginate --jq '.[].login'
```

If team membership cannot be resolved (permissions error), fall back
to inferring maintainer status from repository collaborator status:

```bash
gh api "repos/<owner>/<repo>/collaborators" --paginate --jq '.[].login'
```

## Step 2: Gather Open PRs and Issues

Collect all open work items from the repository.

Use GitHub MCP tools first:

- `list_pull_requests` for open PRs
- `list_issues` for open issues

Fallback commands if MCP is unavailable:

```bash
gh pr list --state open --json number,title,body,headRefName,baseRefName,isDraft,url,createdAt,updatedAt,author,reviews,reviewRequests,statusCheckRollup,labels,assignees,comments
gh issue list --state open --json number,title,body,labels,url,createdAt,updatedAt,author,assignees,comments
```

## Step 3: Filter to Community Items

From the gathered data, retain only items authored by community
contributors (authors NOT in the maintainer/agent set from Step 1).
Discard maintainer-authored and agent-authored items entirely -- those
are handled by the `triage-managed-work` skill.

## Step 4: Detect Items Needing Attention

Evaluate each community item against the detection rules below. An
item can match multiple rules; record every applicable reason.

### Pull Request Attention Rules

1. **Community PR with no maintainer review**
   - Condition: open PR from a community contributor has no review
     from any maintainer (no approvals, no change requests, no
     review comments from a maintainer).
   - Why: unreviewed community PRs signal that contributions are
     being ignored, discouraging future participation.
   - Next step: assign a maintainer reviewer and post an
     acknowledgment comment thanking the contributor.

2. **Community PR awaiting response for too long**
   - Condition: the most recent comment or activity on the PR is from
     the community contributor (not a maintainer), and it has been
     more than `stale_days` since that activity.
   - Why: the contributor is waiting for feedback and may lose
     interest or context if the wait is too long.
   - Next step: review the PR and respond with feedback, approval,
     or an update on timeline.

3. **Community PR with merge conflicts**
   - Condition: PR is not mergeable due to conflicts with the base
     branch.
   - Why: asking community contributors to rebase can be a barrier;
     maintainers should assess whether to help resolve conflicts.
   - Next step: ask the contributor to rebase, or offer to resolve
     the conflicts on their behalf if the change is valuable.

4. **Community PR with failing status checks**
   - Condition: PR has one or more failed required status checks.
   - Why: the contributor may not know how to fix CI failures or may
     not have access to reproduce them.
   - Next step: review the failures, comment with guidance on how to
     fix, or push fixes directly if the contributor has granted
     maintainer push access to their fork.

5. **Community PR is draft with no guidance**
   - Condition: PR is marked as draft and has no maintainer comments.
   - Why: the contributor may have opened a draft seeking early
     feedback but received none.
   - Next step: review the draft, provide directional feedback, and
     let the contributor know what is needed to move to
     ready-for-review.

6. **Community PR targets wrong base branch**
   - Condition: PR targets a branch other than `main`.
   - Why: community contributors may not know the correct base
     branch.
   - Next step: comment explaining the correct base branch and help
     retarget the PR.

### Issue Attention Rules

1. **Community issue needs triage**
   - Condition: issue from a community contributor has the
     `needs-triage` label, or has no workflow labels at all (no
     `ready`, `in-progress`, `blocked`, or `needs-review`).
   - Why: untriaged issues leave contributors without feedback on
     whether their request is accepted or understood.
   - Next step: review the issue, add appropriate labels (`ready`,
     `blocked`, or close with explanation), and post a response.

2. **Community issue with no maintainer response**
   - Condition: issue from a community contributor has zero comments
     from maintainers.
   - Why: a silent issue signals that the project is not actively
     maintained or does not value community input.
   - Next step: post an acknowledgment comment, even if full triage
     is not yet complete. A simple "Thanks for reporting, we'll look
     into this" goes a long way.

3. **Community issue awaiting response for too long**
   - Condition: the most recent comment on the issue is from the
     community contributor (not a maintainer), and it has been more
     than `stale_days` since that comment.
   - Why: the contributor asked a follow-up question or provided
     additional context and is waiting for a reply.
   - Next step: respond to the contributor's latest comment with an
     answer, status update, or next steps.

4. **Community issue is stale with no resolution**
   - Condition: issue from a community contributor has been open for
     more than 30 days with no `ready` or `in-progress` label and
     fewer than 2 maintainer comments.
   - Why: long-open issues with minimal engagement suggest the issue
     is being ignored.
   - Next step: make a triage decision -- accept and label `ready`,
     request more information, or close with a clear explanation.

5. **Community bug report with no reproduction acknowledgment**
   - Condition: issue has a `bug` label, was submitted by a community
     contributor, and no maintainer comment confirms or denies
     reproduction of the issue.
   - Why: bug reporters need to know whether their issue has been
     validated.
   - Next step: attempt to reproduce the bug, then comment with
     confirmation or request for more details.

## Step 5: Assign Severity

Classify each attention item:

- **High**: community PR with no maintainer review, community issue
  with no maintainer response, community PR with failing checks and
  no guidance.
- **Medium**: community PR awaiting response too long, community
  issue awaiting response too long, community PR with merge conflicts,
  community issue stale with no resolution, draft PR with no guidance.
- **Low**: community issue needs triage (if recently opened), bug
  report with no reproduction acknowledgment, PR targets wrong base.

Override: any item where the contributor has explicitly asked for help
or expressed frustration in their most recent comment is escalated to
high severity regardless of the base rule.

## Step 6: Build the Triage Report

Compile findings into a structured report grouped by entity type.

For each item include:

- **Entity**: type (PR or issue) and identifier (number)
- **Contributor**: who submitted it
- **Age**: days since creation
- **Last activity**: days since last update
- **Waiting on**: maintainer or contributor
- **Reason(s)**: why this item needs attention (from the detection
  rules)
- **Severity**: high, medium, or low
- **Recommended next step**: the specific action to take

### Report Format

```markdown
# Community Work Triage Report

> Generated by AI agent. Review each item and take the recommended
> action. Prompt community responses build contributor trust.

## Summary

- Community PRs needing attention: N
- Community issues needing attention: N
- Total items: N
- High severity: N | Medium: N | Low: N
- Average response time: X days

## Pull Requests

| PR | Contributor | Age | Waiting On | Reason | Severity | Next Step |
| --- | --- | --- | --- | --- | --- | --- |
| #N <title> | @user | Xd | maintainer | <reason> | high | <action> |

## Issues

| Issue | Contributor | Age | Waiting On | Reason | Severity | Next Step |
| --- | --- | --- | --- | --- | --- | --- |
| #N <title> | @user | Xd | maintainer | <reason> | high | <action> |
```

If no community items need attention, state that explicitly:

> All community pull requests and issues have been responded to.
> No items need attention at this time.

## Step 7: Report to Issue (conditional)

If `issue_number` input is provided, post the markdown report as a
comment on that issue.

Use GitHub MCP `add_issue_comment` first.

Fallback:

```bash
gh issue comment <issue_number> --body "<triage_report_markdown>"
```

## Step 8: Return Outputs

Return:

- `report` object with the full structured report
- `attention_count` with the total number of community items flagged
- `items` array with each finding as a structured object containing
  entity_type, entity_id, contributor, age_days, last_activity_days,
  waiting_on, reasons (array), severity, and recommended_action
