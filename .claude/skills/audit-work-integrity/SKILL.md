---
name: audit-work-integrity
version: 1.0.0
description: >
  Audits repository work integrity by checking branch, pull request,
  and issue relationships. Flags orphaned branches, PRs without linked
  issues, in-progress issues without active PRs, and duplicate active
  work paths. Uses GitHub MCP tools first and falls back to gh/gh api
  commands when MCP tools are unavailable.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - workflow
  - audit
  - branch-hygiene
  - pull-request
  - issues
  - automation
depends_on: []
inputs:
  - name: base_branch
    type: string
    required: false
    default: main
    description: Base branch that active PRs should target.
  - name: remote
    type: string
    required: false
    default: upstream
    description: Remote used when branch details are fetched via git.
  - name: strict_branch_pr
    type: boolean
    required: false
    default: true
    description: >
      If true, any non-exempt branch without an open PR is an immediate
      high-severity finding.
  - name: stale_days
    type: number
    required: false
    default: 14
    description: >
      Used only when strict_branch_pr is false. Branches newer than this
      threshold are not flagged as orphaned.
  - name: exempt_branches
    type: array
    required: false
    description: >
      Exact branch names to ignore in addition to main/master/base_branch.
  - name: exempt_branch_prefixes
    type: array
    required: false
    description: >
      Branch prefixes to ignore, such as release/ or sandbox/.
  - name: include_closed
    type: boolean
    required: false
    default: false
    description: >
      If true, include recently closed PRs and issues for context in the
      final report notes.
  - name: issue_number
    type: number
    required: false
    description: >
      If provided, post the final audit report as a comment on this
      issue.
outputs:
  - name: report
    type: object
    description: Structured report with summary, findings, and actions.
  - name: overall_status
    type: string
    description: Overall result category: pass, warn, or fail.
  - name: score
    type: number
    description: Integrity score from 0 to 100.
  - name: findings
    type: array
    description: Flattened list of findings with severity and remediation.
---

# Audit Work Integrity

Audits branch, pull request, and issue relationships to detect workflow
integrity gaps before they become drift.

This skill is strict by default:

- Any non-exempt branch without an open PR is flagged immediately.
- Open PRs must link to at least one issue.
- Open issues labeled `in-progress` must have an active linked PR.

## Step 1: Resolve Repository Context

Determine repository owner/name, base branch, and exemption sets.

1. Resolve owner and repo from current checkout.
2. Build an exact-match branch exemption set:
   - `main`
   - `master`
   - `base_branch` input
   - any `exempt_branches` input values
3. Build optional prefix exemptions from `exempt_branch_prefixes`.

When `strict_branch_pr` is true, no other branch-level grace period is
applied.

## Step 2: Gather Data (MCP-first)

Collect branches, open PRs, and open issues.

Use GitHub MCP tools first:

- `list_branches` for repository branches
- `list_pull_requests` for open PRs
- `list_issues` for open issues

Filter to active work:

- PR state: `open`
- Issue state: `open`
- Prefer PRs that target `base_branch`

If `include_closed` is true, also fetch recently closed PRs/issues for
context notes in the final report.

Fallback commands if MCP is unavailable:

```bash
gh api "repos/<owner>/<repo>/branches?per_page=100" --paginate
gh pr list --state open --base <base_branch> --json number,title,body,headRefName,baseRefName,isDraft,url,createdAt,updatedAt,author
gh issue list --state open --json number,title,body,labels,url,createdAt,updatedAt,author,assignees
```

Optional closed-context fallback:

```bash
gh pr list --state closed --base <base_branch> --limit 100 --json number,title,body,headRefName,mergedAt,closedAt,url
gh issue list --state closed --limit 100 --json number,title,labels,url,closedAt
```

## Step 3: Normalize and Link Entities

Create consistent maps before evaluating findings.

1. **Branch to PR map**: match on exact `headRefName`.
2. **PR to Issue map** in priority order:
   - `closingIssuesReferences` from API payload when available.
   - Explicit references in PR title/body using patterns like:
     - `Closes #123`
     - `Fixes #123`
     - `Resolves #123`
     - `Refs #123`
3. **Issue to PR map**: reverse index of linked PRs.
4. **Branch to Issue hint map** (heuristic only): parse issue numbers from
   branch names like `feat/123-...`, `fix/issue-123-...`, or
   `chore/foo-123`.

Reference regexes:

- Issue refs in text:
  `(?i)\b(closes|fixes|resolves|refs?)\s+#(\d+)\b`
- Issue hint in branch name:
  `(?:^|[/-])(?:issue-)?(\d+)(?:[/-]|$)`

## Step 4: Detect Integrity Findings

Evaluate findings with deterministic rules.

### High severity

1. **Orphan branch**
   - Condition: branch is non-exempt and has no open PR targeting
     `base_branch`.
   - Strict behavior: this is always high when `strict_branch_pr=true`.
2. **PR missing issue link**
   - Condition: open PR has zero linked issues.
3. **In-progress issue without active PR**
   - Condition: open issue has label `in-progress` and has no linked open
     PR.

### Medium severity

1. **Duplicate PRs for one issue**
   - Condition: one issue links to more than one open PR.
2. **Multiple active branches for one issue**
   - Condition: one issue appears tied to multiple active branches (via
     linked PR heads and/or branch name hints).
3. **Branch hints issue but no PR**
   - Condition: branch name implies an issue number but branch has no open
     PR.

### Low severity

1. **Issue has PR linkage ambiguity**
   - Condition: PR body has free-form `#N` references without explicit
     close/ref verbs.
2. **Closed-context mismatch** (only when `include_closed=true`)
   - Condition: branch still exists after merged PR where branch deletion
     policy appears inconsistent.

## Step 5: Score and Status

Start from `100` and subtract penalties:

- High: `-25` each (max high penalty `75`)
- Medium: `-10` each (max medium penalty `30`)
- Low: `-3` each (max low penalty `15`)

Clamp final score to `[0, 100]`.

Set `overall_status`:

- `fail` if any high-severity finding exists
- `warn` if no high findings but any medium/low findings exist
- `pass` if no findings exist

## Step 6: Build Actionable Report

Return a structured report that includes:

1. **Summary**
   - Branch count, PR count, issue count
   - Findings by severity
   - Final score and status
2. **Findings**
   - `id`, severity, entity type, entity id/name, evidence, action
3. **Recommended actions (ordered)**
   - Create PRs for orphan branches
   - Add explicit issue links to PRs using `Closes #N` or `Refs #N`
   - Reconcile duplicate PRs per issue
   - Move stale/unowned work out of `in-progress`

Example remediation commands:

```bash
gh pr create --base <base_branch> --head <branch> --title "<type>(<scope>): <description>" --body "Closes #<issue_number>"
gh pr edit <pr_number> --body-file <updated_body_file>
gh issue edit <issue_number> --remove-label "in-progress"
```

## Step 7: Report to Issue (conditional)

If `issue_number` input is provided, post the markdown report to that
issue.

Use GitHub MCP `add_issue_comment` first.

Fallback:

```bash
gh issue comment <issue_number> --body "<audit_report_markdown>"
```

## Step 8: Return Outputs

Return:

- `report` object
- `overall_status`
- `score`
- `findings` array

If no findings are present, explicitly state that repository workflow
integrity is currently clean under strict branch-to-PR policy.
