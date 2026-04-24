---
name: review-issues
version: 1.0.0
description: >
  Reviews GitHub Issues for completeness, clarity, and adherence to
  repository issue standards. Validates that issues have clear
  acceptance criteria, appropriate labels, proper priority and domain
  classification, and sufficient context for implementation. Use this
  skill to audit issue quality before triaging or planning work.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - issues
  - quality
  - validation
  - triage
  - automation
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: false
    description: >
      Specific issue number to review. If not provided, reviews all
      open issues.
  - name: state
    type: string
    required: false
    default: open
    description: >
      Issue state filter: open, closed, or all. Only used when
      issue_number is not provided.
  - name: label_filter
    type: array
    required: false
    description: >
      Optional label filter. Only review issues with these labels.
      Only used when issue_number is not provided.
  - name: require_acceptance_criteria
    type: boolean
    required: false
    default: true
    description: >
      If true, flag issues missing explicit acceptance criteria.
  - name: require_priority
    type: boolean
    required: false
    default: true
    description: >
      If true, flag issues missing priority labels.
  - name: require_domain
    type: boolean
    required: false
    default: true
    description: >
      If true, flag issues missing domain labels.
  - name: post_comment
    type: boolean
    required: false
    default: false
    description: >
      If true, post review findings as a comment on each reviewed
      issue.
outputs:
  - name: findings
    type: array
    description: >
      List of issue review findings with severity, issue number, and
      recommendations.
  - name: overall_status
    type: string
    description: Overall review result: pass, warn, or fail.
  - name: issues_reviewed
    type: number
    description: Total number of issues reviewed.
  - name: issues_with_findings
    type: number
    description: Number of issues with at least one finding.
---

# Review Issues

Reviews GitHub Issues for completeness, clarity, and adherence to
repository standards to ensure they are ready for triage and
implementation.

## Step 1: Identify Issues to Review

Based on input parameters:

1. If `issue_number` is provided, review only that single issue. Use
   GitHub MCP `issue_read` with `method: get` to fetch full details.
2. Otherwise, list issues matching filters:
   - Use GitHub MCP `list_issues` with:
     - `state`: from input (default `open`)
     - `labels`: from `label_filter` if provided
     - `perPage`: 100 (handle pagination for large repos)

Fallback commands if MCP is unavailable:

```bash
gh issue view <issue_number> --json number,title,body,labels,assignees,state,author,createdAt,updatedAt,comments
gh issue list --state <state> --json number,title,body,labels,assignees,state,author,createdAt,updatedAt
```

## Step 2: Parse and Validate Issue Structure

For each issue, extract and validate:

1. **Title**: Check that it is clear, concise, and descriptive.
   - Flag vague titles like "Fix bug", "Update", or "Help".
   - Recommend specificity: what, where, or why.

2. **Body**: Verify that the issue body contains:
   - A clear description of what needs to be done.
   - Context or motivation for the change.
   - If the repo uses issue templates, check for required sections.

3. **Acceptance Criteria** (if `require_acceptance_criteria` is true):
   - Look for explicit criteria in the body (markdown checklist,
     numbered list, or "Acceptance Criteria" section).
   - Flag issues missing testable success conditions.

4. **Labels**:
   - If `require_priority` is true, verify presence of a priority label
     (`p0-critical`, `p1-high`, `p2-medium`, `p3-low`).
   - If `require_domain` is true, verify presence of a domain label
     (`security`, `ai`, `mcp`, `infrastructure`, `plugin`, `api`, `ui`,
     `devops`, `docs`).
   - Check for task type labels (`bug`, `enhancement`, `task`, etc.).
   - Verify `agent-eligible` label is only present when appropriate.

5. **Assignment and Status**:
   - If labeled `in-progress`, verify that the issue is assigned and
     has a linked PR or recent activity.
   - If labeled `blocked`, check for a clear blocker explanation in
     comments.
   - If labeled `needs-triage`, verify the issue has not been sitting
     without maintainer attention for more than a threshold period
     (e.g., 7 days for initial issues).

## Step 3: Check for Common Anti-Patterns

Flag issues with these patterns:

1. **Duplicate or near-duplicate** of another open issue (heuristic
   title similarity check).
2. **Stale issues**: Open past the repository's configured stale
   workflow threshold (currently 45 days) with no recent activity and
   no `blocked` or `backlog` label.
3. **Missing context**: Issue body is a single line or fewer than 20
   characters.
4. **Overly broad scope**: Issue description suggests multiple unrelated
   changes (flag as "consider splitting").
5. **Issue-PR mismatch**: Issue has `in-progress` label but no linked
   PR, or has a linked PR that is closed/merged while the issue remains
   open.

## Step 4: Validate Agent Eligibility (conditional)

If the issue has the `agent-eligible` label:

1. Verify that the issue is sufficiently detailed for autonomous
   processing:
   - Clear, unambiguous description.
   - Well-defined acceptance criteria.
   - No open-ended research or human judgment required.
2. Check that the issue is not `blocked` or `needs-triage`.
3. If the issue is not actually suitable for agent work, flag as
   incorrectly labeled.

## Step 5: Check References and Links

Validate that:

1. If the issue references other issues, PRs, or external links, they
   are valid and formatted correctly.
2. If the issue is a sub-issue of another issue, the parent issue exists
   and is open.
3. If the issue references commits or branches, they exist in the
   repository.

## Step 6: Score and Classify Findings

Assign severity to each finding:

- **High**: Missing critical information (no description, no acceptance
  criteria for complex tasks), incorrect status/label combinations, or
  blocking issues.
- **Medium**: Missing priority or domain labels, vague title or
  description, missing assignment when `in-progress`, stale issues.
- **Low**: Minor clarity improvements, formatting inconsistencies,
  optional context missing.

Issues are scored individually:

- Start at 100.
- High: `-30` each
- Medium: `-15` each
- Low: `-5` each

Clamp to `[0, 100]` per issue.

## Step 7: Generate Review Report

Produce a structured report for each issue:

1. **Issue metadata**: Number, title, author, state, labels, assignees.
2. **Findings**: Each finding with severity, description, and
   recommended action.
3. **Score**: Individual issue quality score.

Example finding structure:

```json
{
  "issue_number": 123,
  "severity": "high",
  "category": "acceptance-criteria",
  "message": "Issue lacks explicit acceptance criteria",
  "suggestion": "Add a checklist or numbered list of success conditions"
}
```

Aggregate findings across all reviewed issues:

- Total issues reviewed
- Issues with findings
- Findings by severity
- Overall status:
  - `fail` if any high-severity findings exist across all issues
  - `warn` if only medium/low findings exist
  - `pass` if no findings

## Step 8: Post Issue Comments (conditional)

If `post_comment` is true and any issue has findings:

1. Format findings for each issue as a GitHub-flavored Markdown comment.
2. Post the comment using GitHub MCP `add_issue_comment`.

Fallback:

```bash
gh issue comment <issue_number> --body "<review_report_markdown>"
```

The comment should start with:

```markdown
## 🤖 Issue Quality Review

> Posted by AI agent. Recommendations below to improve issue clarity
> and completeness.
```

Only post comments on issues that have findings — do not comment on
issues that pass review.

## Step 9: Return Outputs

Return:

- `findings` array (all findings across all reviewed issues)
- `overall_status`
- `issues_reviewed`
- `issues_with_findings`

If all issues pass, return a passing status with an explicit statement.

## Definition of Done

This skill is complete when:

1. All in-scope issues have been reviewed.
2. Findings are categorized by severity with actionable guidance.
3. If `post_comment` was true, review comments were posted to issues
   with findings.
4. A summary report is available showing overall issue quality health.
