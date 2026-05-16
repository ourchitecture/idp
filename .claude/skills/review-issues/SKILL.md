---
name: review-issues
version: 1.1.0
description: >
  Reviews GitHub Issues for completeness, clarity, and adherence to
  repository issue standards (acceptance criteria, labels, priority/domain).
  Use to audit issue quality before triage or planning.
author: "@idp-maintain"
domain: devops
tags: [github, issues, quality, validation, triage, automation]
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: false
    description: "Specific issue. Default: all matching open issues."
  - name: state
    type: string
    required: false
    default: open
    description: open | closed | all (when issue_number not given).
  - name: label_filter
    type: array
    required: false
    description: Only review issues with these labels.
  - name: require_acceptance_criteria
    type: boolean
    required: false
    default: true
    description: Flag issues missing acceptance criteria.
  - name: require_priority
    type: boolean
    required: false
    default: true
    description: Flag issues missing priority labels.
  - name: require_domain
    type: boolean
    required: false
    default: true
    description: Flag issues missing domain labels.
  - name: post_comment
    type: boolean
    required: false
    default: false
    description: Post findings as comments on issues that have findings.
outputs:
  - name: findings
    type: array
    description: All findings with severity, issue number, recommendation.
  - name: overall_status
    type: string
    description: pass | warn | fail.
  - name: issues_reviewed
    type: number
    description: Total issues reviewed.
  - name: issues_with_findings
    type: number
    description: Issues with at least one finding.
---

# Review Issues

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## 1. Identify issues

- If `issue_number`: MCP `issue_read` (method: `get`).
- Else: MCP `list_issues` with `state` and optional `label_filter`,
  `perPage: 100` (paginate).

CLI fallback:

```bash
gh issue view <n> --json number,title,body,labels,assignees,state,author,createdAt,updatedAt,comments
gh issue list --state <state> --json number,title,body,labels,assignees,state,author,createdAt,updatedAt
```

## 2. Parse and validate

For each issue, check:

- **Title**: clear, specific. Flag vague ones ("Fix bug", "Update", "Help").
- **Body**: description, motivation, required template sections.
- **Acceptance criteria** (if `require_acceptance_criteria`): explicit
  checklist/numbered list or "Acceptance Criteria" section.
- **Labels**:
  - Priority (if required): `p0-critical` / `p1-high` / `p2-medium` / `p3-low`.
  - Domain (if required): `security` / `ai` / `mcp` / `infrastructure` /
    `plugin` / `api` / `ui` / `devops` / `docs`.
  - Task type: `bug` / `enhancement` / `task` / etc.
  - `agent-eligible` only when appropriate.
- **Status**:
  - `in-progress` → must have assignee and linked PR or recent activity.
  - `blocked` → blocker explanation in comments.
  - `needs-triage` → not sitting unattended > ~7 days.

## 3. Anti-patterns

Flag: duplicate/near-duplicate of another open issue (title similarity);
stale (open > 45 days, no recent activity, no `blocked` or `backlog`);
missing context (body < 20 chars); overly broad scope (consider splitting);
issue-PR mismatch (`in-progress` without PR, or linked PR closed/merged
while issue still open).

## 4. Agent eligibility (conditional)

If `agent-eligible`: confirm description is unambiguous, criteria
well-defined, no open-ended research needed, not `blocked` or
`needs-triage`. Else flag incorrect labeling.

## 5. References

Validate referenced issues/PRs/links exist and are correctly formatted; if
sub-issue of a parent, the parent exists and is open; referenced commits or
branches exist.

## 6. Score per issue

Severity: **High** (missing critical info, incorrect status/label
combinations, blockers); **Medium** (missing priority/domain, vague
title/description, missing assignment when `in-progress`, stale);
**Low** (clarity, formatting, optional context).

Per-issue score from 100: high `-30`, medium `-15`, low `-5`.
Clamp `[0,100]`.

## 7. Report

Return findings as `{issue_number, severity, category, message, suggestion}` objects.
Aggregate: total reviewed, issues with findings, counts by severity,
overall status (`fail` if any high; `warn` if only med/low; `pass` if none).

## 8. Post comments (optional)

If `post_comment=true`, post **only** on issues that have findings.
MCP `add_issue_comment` or `gh issue comment <n> --body "<report>"`.

## 9. Return

`findings`, `overall_status`, `issues_reviewed`, `issues_with_findings`.
If clean, explicit pass statement.
