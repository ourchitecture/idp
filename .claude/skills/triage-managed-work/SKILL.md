---
name: triage-managed-work
version: 1.0.0
description: >
  Searches for orphaned or mismatched branches, pull requests, and
  issues created by maintainers or agents that need attention.
  Identifies why each item needs attention and recommends a clear
  next step. Use this skill when you need a triage dashboard of
  managed work items across the repository.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - triage
  - branches
  - pull-request
  - issues
  - workflow
  - automation
  - maintainer
depends_on: []
inputs:
  - name: base_branch
    type: string
    required: false
    default: main
    description: Base branch that active PRs should target.
  - name: stale_days
    type: number
    required: false
    default: 7
    description: >
      Number of days without activity before an item is considered
      stale and flagged for attention.
  - name: maintainer_teams
    type: array
    required: false
    description: >
      GitHub team slugs whose members are considered maintainers
      (e.g., idp-admin, idp-maintain). If omitted, uses the
      AGENTS.md defaults: @idp-admin and @idp-maintain.
  - name: exempt_branches
    type: array
    required: false
    description: >
      Exact branch names to skip in addition to main/master.
  - name: exempt_branch_prefixes
    type: array
    required: false
    description: >
      Branch prefixes to skip (e.g., release/, sandbox/).
  - name: issue_number
    type: number
    required: false
    description: >
      If provided, post the triage report as a comment on this issue.
outputs:
  - name: report
    type: object
    description: >
      Structured triage report with categorized items, reasons, and
      recommended next steps.
  - name: attention_count
    type: number
    description: Total number of items needing attention.
  - name: items
    type: array
    description: >
      Flat list of attention items, each with entity type, id, reason,
      severity, and recommended action.
---

# Triage Managed Work

Searches for branches, pull requests, and issues created by
maintainers or agents that need attention. Each flagged item includes
a reason explaining why it needs attention and a concrete recommended
next step.

This skill complements `audit-work-integrity` (which scores structural
linkage) by focusing on actionable triage: what needs a human decision
or agent action right now.

## Step 1: Identify Maintainer and Agent Authors

Determine which GitHub users are maintainers or agents so their work
can be distinguished from community contributions.

1. If `maintainer_teams` input is provided, resolve team membership
   using the GitHub API.
2. Otherwise, use the AGENTS.md defaults: members of `@idp-admin`
   and `@idp-maintain`.
3. Also classify any author whose username contains `[bot]` or whose
   type is `Bot` as an agent author.

Build a set of maintainer/agent usernames for filtering in later
steps.

Resolve team membership using the GitHub MCP tools or:

```bash
gh api "orgs/<owner>/teams/<team-slug>/members" --paginate --jq '.[].login'
```

If team membership cannot be resolved (permissions error), fall back
to inferring maintainer status from issue/PR author associations with
`@idp-admin` or `@idp-maintain` mentions in AGENTS.md, or from
repository collaborator status:

```bash
gh api "repos/<owner>/<repo>/collaborators" --paginate --jq '.[].login'
```

## Step 2: Gather Branches, PRs, and Issues

Collect all active work items from the repository.

Use GitHub MCP tools first:

- `list_branches` for repository branches
- `list_pull_requests` for open PRs
- `list_issues` for open issues

Fallback commands if MCP is unavailable:

```bash
gh api "repos/<owner>/<repo>/branches?per_page=100" --paginate
gh pr list --state open --json number,title,body,headRefName,baseRefName,isDraft,url,createdAt,updatedAt,author,reviewRequests,statusCheckRollup,labels,assignees
gh issue list --state open --json number,title,body,labels,url,createdAt,updatedAt,author,assignees,comments
```

## Step 3: Filter to Managed Items

From the gathered data, retain only items authored by maintainers or
agents (from the set built in Step 1). Discard community-authored
items entirely -- those are handled by the `triage-community-work`
skill.

For branches, authorship cannot be determined directly from the branch
API. Use these heuristics:

1. If the branch has an open PR, use the PR author.
2. If the branch has no PR, check the most recent commit author on
   that branch:

   ```bash
   gh api "repos/<owner>/<repo>/commits?sha=<branch>&per_page=1" --jq '.[0].author.login'
   ```

3. If authorship still cannot be determined, include the branch with
   a note that authorship is unknown.

## Step 4: Build Exempt Branch Set

Build the set of branches to skip:

- `main`, `master`, and the `base_branch` input value
- Any exact names from `exempt_branches` input
- Any branches matching prefixes from `exempt_branch_prefixes` input

## Step 5: Detect Items Needing Attention

Evaluate each managed item against the detection rules below. An item
can match multiple rules; record every applicable reason.

### Branch Attention Rules

1. **Orphaned branch (no PR)**
   - Condition: non-exempt branch has no open PR targeting
     `base_branch`.
   - Why: the branch represents unfinished or abandoned work with no
     visible review path.
   - Next step: create a PR for the branch, or delete it if the work
     is obsolete.

2. **Branch name does not follow convention**
   - Condition: branch name does not match the pattern
     `<type>/<description>` where type is one of: feat, fix, docs,
     style, refactor, perf, test, build, ci, chore, security, revert.
   - Why: non-conventional branch names make it harder to understand
     the purpose of the work and break automation expectations.
   - Next step: rename the branch to follow the `<type>/<description>`
     convention, or create a PR that clarifies the intent.

3. **Branch targets wrong base**
   - Condition: branch has an open PR but the PR targets a branch
     other than `base_branch`.
   - Why: PRs targeting non-default branches may be intentional
     (stacked PRs) but often indicate a misconfiguration.
   - Next step: verify the PR base is correct; retarget to
     `base_branch` if it was set in error.

### Pull Request Attention Rules

1. **Stale PR (no recent activity)**
   - Condition: open PR has no commits, comments, or review activity
     within `stale_days`.
   - Why: stale PRs block progress and accumulate merge conflicts.
   - Next step: review the PR and either merge, request changes, or
     close it with a reason.

2. **Draft PR open too long**
   - Condition: PR is marked as draft and was created more than
     `stale_days` ago.
   - Why: long-lived drafts suggest blocked or abandoned work.
   - Next step: convert to ready-for-review if the work is complete,
     or close the draft and reopen when ready.

3. **PR has failing status checks**
   - Condition: PR has one or more failed required status checks.
   - Why: failing checks block merge and may indicate broken code or
     configuration issues. GitHub rulesets enforce this — the merge
     button is blocked until all required checks pass.
   - Next step: investigate the failing checks, push fixes, or
     re-run if the failure is transient.

4. **PR has no linked issue**
   - Condition: PR body and title contain no issue reference
     (`Closes #N`, `Fixes #N`, `Refs #N`).
   - Why: PRs without linked issues break traceability and the
     issue-driven workflow required by AGENTS.md.
   - Next step: add an issue reference to the PR body using
     `Closes #N` or `Refs #N`.

5. **PR has unresolved review comments**
   - Condition: PR has review comments or change requests that have
     not been addressed (no subsequent commits or replies).
   - Why: unresolved feedback stalls the review cycle.
   - Next step: address the review comments and push updates, or
     reply explaining why the feedback does not apply.

6. **PR has merge conflicts**
   - Condition: PR is not mergeable due to conflicts with the base
     branch.
   - Why: conflicts block merge and grow worse over time. The repository
     ruleset requires linear history, so conflicted PRs cannot be merged.
   - Next step: rebase or merge `base_branch` into the feature branch
     to resolve conflicts.

### Issue Attention Rules

1. **In-progress issue with no active PR**
    - Condition: issue has the `in-progress` label but no open PR
      links to it.
    - Why: the issue claims active work but has no visible code
      delivery path.
    - Next step: create a PR for the work, or remove the `in-progress`
      label if work has not started.

2. **In-progress issue with no recent activity**
    - Condition: issue has the `in-progress` label and no comments or
      linked PR activity within `stale_days`.
    - Why: the issue may be stuck or the assignee may be blocked.
    - Next step: check in with the assignee, unblock, or reassign.

3. **Blocked issue needs resolution**
    - Condition: issue has the `blocked` label.
    - Why: blocked issues represent stalled work that may cascade
      delays.
    - Next step: investigate the blocker (check comments for context),
      resolve or escalate, then remove the `blocked` label.

4. **Assigned issue with no activity**
    - Condition: issue is assigned to a maintainer or agent but has no
      comments or linked PRs, and was last updated more than
      `stale_days` ago.
    - Why: assigned but idle issues may indicate forgotten work or
      unclear requirements.
    - Next step: check with the assignee, update the issue with
      current status, or unassign and return to the backlog.

5. **Needs-review issue sitting too long**
    - Condition: issue has the `needs-review` label and was last
      updated more than `stale_days` ago.
    - Why: items awaiting review that go stale lose context and delay
      dependent work.
    - Next step: review the issue (or the linked plan/PR), approve
      or request changes.

6. **Ready issue with no assignee**
    - Condition: issue has the `ready` label but no assignee.
    - Why: ready work with no owner will not progress.
    - Next step: assign the issue to a maintainer or agent, or use
      the `find-work` skill to pick it up.

## Step 6: Assign Severity

Classify each attention item:

- **High**: orphaned branches, stale PRs, failing checks, in-progress
  issues without PRs, blocked issues, merge conflicts.
- **Medium**: draft PRs open too long, unresolved review comments,
  idle assigned issues, needs-review sitting too long, PRs with no
  linked issue.
- **Low**: branch naming convention violations, branch targeting wrong
  base, ready issues with no assignee.

## Step 7: Build the Triage Report

Compile findings into a structured report grouped by entity type.

For each item include:

- **Entity**: type (branch, PR, issue) and identifier (name or number)
- **Author**: who created it
- **Age**: days since creation
- **Last activity**: days since last update
- **Reason(s)**: why this item needs attention (from the detection
  rules)
- **Severity**: high, medium, or low
- **Recommended next step**: the specific action to take

### Report Format

```markdown
# Managed Work Triage Report

> Generated by AI agent. Review each item and take the recommended
> action or comment with an alternative resolution.

## Summary

- Branches needing attention: N
- Pull requests needing attention: N
- Issues needing attention: N
- Total items: N
- High severity: N | Medium: N | Low: N

## Branches

| Branch | Author | Age | Reason | Severity | Next Step |
| --- | --- | --- | --- | --- | --- |
| `<name>` | @user | Xd | <reason> | high | <action> |

## Pull Requests

| PR | Author | Age | Last Activity | Reason | Severity | Next Step |
| --- | --- | --- | --- | --- | --- | --- |
| #N <title> | @user | Xd | Xd ago | <reason> | high | <action> |

## Issues

| Issue | Author | Assignee | Age | Last Activity | Reason | Severity | Next Step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #N <title> | @user | @assignee | Xd | Xd ago | <reason> | medium | <action> |
```

If no items need attention, state that explicitly:

> All managed branches, pull requests, and issues are in good shape.
> No items need attention at this time.

## Step 8: Report to Issue (conditional)

If `issue_number` input is provided, post the markdown report as a
comment on that issue.

Use GitHub MCP `add_issue_comment` first.

Fallback:

```bash
gh issue comment <issue_number> --body "<triage_report_markdown>"
```

## Step 9: Return Outputs

Return:

- `report` object with the full structured report
- `attention_count` with the total number of items flagged
- `items` array with each finding as a structured object containing
  entity_type, entity_id, author, age_days, last_activity_days,
  reasons (array), severity, and recommended_action
