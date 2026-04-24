---
name: review-pull-requests
version: 1.0.0
description: >
  Reviews GitHub pull requests for completeness, quality, and readiness
  to merge. Validates PR metadata, commit history, linked issues, CI
  status, code changes, test coverage, and documentation updates.
  Ensures PRs follow repository conventions before human review and
  merge. Use this skill to perform comprehensive PR review validation.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - pull-request
  - review
  - quality
  - validation
  - automation
depends_on: []
inputs:
  - name: pr_number
    type: number
    required: true
    description: Pull request number to review.
  - name: check_ci_status
    type: boolean
    required: false
    default: true
    description: >
      If true, verify that required CI checks have passed before
      approving the PR for merge.
  - name: require_linked_issue
    type: boolean
    required: false
    default: true
    description: >
      If true, flag PRs that do not reference at least one issue.
  - name: require_conventional_commits
    type: boolean
    required: false
    default: true
    description: >
      If true, validate that PR title and commits follow Conventional
      Commits format.
  - name: require_tests
    type: boolean
    required: false
    default: false
    description: >
      If true, flag PRs that modify source code without adding or
      updating tests.
  - name: post_review
    type: boolean
    required: false
    default: false
    description: >
      If true, post findings as a PR review comment.
outputs:
  - name: findings
    type: array
    description: >
      List of PR review findings with severity, category, and
      recommendations.
  - name: overall_status
    type: string
    description: Overall review result: pass, warn, or fail.
  - name: merge_ready
    type: boolean
    description: >
      Whether the PR passes all checks and is ready to merge.
  - name: score
    type: number
    description: PR quality score from 0 to 100.
---

# Review Pull Requests

Reviews GitHub pull requests for completeness, quality, and merge
readiness according to repository conventions.

## Step 1: Fetch PR Metadata

Use GitHub MCP `pull_request_read` with `method: get` to retrieve:

- PR number, title, body
- Author, assignees, reviewers
- State (open, closed, merged), draft status
- Base and head branches
- Labels
- Linked issues (from `closingIssuesReferences` or parsed from body)
- Created and updated timestamps

Fallback command if MCP is unavailable:

```bash
gh pr view <pr_number> --json number,title,body,state,isDraft,headRefName,baseRefName,author,assignees,labels,commits,reviews,additions,deletions,changedFiles,url,createdAt,updatedAt
```

If the PR is not found, stop and report an error.

## Step 2: Validate PR Metadata

Check PR title and body:

1. **Title**: Verify it follows Conventional Commits format if
   `require_conventional_commits` is true:
   - Pattern: `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|security|revert)(\(.+\))?!?: .+$`
   - Max 72 characters
   - Lowercase first word after colon
   - No trailing period

2. **Body**: Verify it contains:
   - A clear description of what changed and why.
   - If `require_linked_issue` is true, at least one issue reference
     (`Closes #N`, `Fixes #N`, `Resolves #N`, or `Refs #N`).
   - If the change is breaking, a `BREAKING CHANGE:` footer or `!` in
     the title.

3. **Labels**: Check that the PR has appropriate labels (e.g., `bug`,
   `enhancement`, `documentation`, `chore`).

4. **Draft Status**: If the PR is still a draft, note this in the
   report. Full review continues but recommendations defer to "mark
   ready for review" before merging.

## Step 3: Validate Linked Issues

If `require_linked_issue` is true:

1. Parse issue references from the PR body and title.
2. For each referenced issue:
   - Verify the issue exists and is open (or recently closed if the PR
     was the closing action).
   - Check that the issue has the `ready` label (not `needs-triage` or
     `blocked`).
   - Verify that the PR scope aligns with the issue description.

3. If no issues are linked, add a high-severity finding.
4. If multiple issues are linked, verify they are related and the PR
   scope is appropriate.

## Step 4: Review Commit History

Use GitHub MCP `pull_request_read` with `method: get` to retrieve commit
list, or use fallback:

```bash
gh pr view <pr_number> --json commits --jq '.commits[].messageHeadline'
```

Validate commits:

1. If `require_conventional_commits` is true:
   - Check that each commit message follows Conventional Commits format.
   - Flag commits with unclear or generic messages ("fix", "update",
     "wip").

2. Check for:
   - Merge commits (should be rare; squash merges are preferred).
   - Revert commits without explanation.
   - Commits that add and then immediately remove the same code (churn).

3. Recommend squashing fixup commits or clarifying commit intent if the
   history is confusing.

## Step 5: Review Changed Files

Use GitHub MCP `pull_request_read` with `method: get_files` to list all
changed files, or use fallback:

```bash
gh pr diff <pr_number> --name-only
```

Validate changes:

1. **Source code changes**:
   - If `require_tests` is true and source code was modified, verify
     that test files were also added or updated.
   - Flag large diffs (e.g., 500+ lines changed in a single file)
     without clear justification.

2. **Documentation changes**:
   - If source code, APIs, or configuration changed, verify that
     corresponding documentation was updated.
   - Check that README, AGENTS.md, or docs/ files reflect the changes.

3. **Configuration or infrastructure changes**:
   - If `Makefile`, `moon.yml`, `.github/workflows`, `Dockerfile`, or
     `package.json` changed, verify the changes are intentional and
     documented.

4. **Sensitive files**:
   - Flag changes to `.env` files, secret managers, or credential
     storage.
   - Verify no secrets or credentials are committed in the diff.

## Step 6: Check CI Status (conditional)

If `check_ci_status` is true:

1. Use GitHub MCP `pull_request_read` with `method: get_check_runs` to
   list all CI checks.
2. Verify that all required checks have passed:
   - Conclusion must be `success` for required checks.
   - Flag checks with `failure`, `cancelled`, `timed_out`,
     `action_required`, `stale`, or `startup_failure`.

3. If any required checks are still pending or in progress, note this in
   the report and defer merge recommendation until checks complete.

Fallback command:

```bash
gh pr checks <pr_number>
```

## Step 7: Review Existing PR Comments and Reviews

Use GitHub MCP `pull_request_read` with `method: get_reviews` and
`method: get_review_comments` to fetch existing reviews.

Check:

1. **Unresolved conversations**: If review threads exist and are not
   resolved, flag this as a blocker to merge.
2. **Review status**:
   - Count approvals, rejections, and comment-only reviews.
   - Verify that at least one CODEOWNERS-designated reviewer has
     approved if repository rulesets require it.
3. **Stale reviews**: If reviews are older than the latest commit,
   suggest re-requesting review.

Fallback:

```bash
gh pr view <pr_number> --json reviews --jq '.reviews[] | {author: .author.login, state: .state, submittedAt: .submittedAt}'
```

## Step 8: Score and Classify Findings

Assign severity to each finding:

- **High**: Missing linked issue (when required), CI checks failing,
  secrets in diff, unresolved review threads, breaking changes without
  documentation.
- **Medium**: Non-conventional commit messages, missing tests (when
  required), missing documentation updates, large diffs without
  justification, draft PR not marked ready.
- **Low**: Minor title/body formatting issues, missing labels, stale
  reviews.

Calculate a quality score starting from 100:

- High: `-25` each (max penalty 75)
- Medium: `-12` each (max penalty 36)
- Low: `-5` each (max penalty 20)

Clamp to `[0, 100]`.

Set `overall_status`:

- `fail` if any high-severity finding exists
- `warn` if no high findings but medium/low findings exist
- `pass` if no findings exist

Set `merge_ready`:

- `true` only if:
  - `overall_status` is `pass`
  - All required CI checks have passed
  - PR is not a draft
  - At least one approving review exists (if required by rulesets)
  - No unresolved review conversations

## Step 9: Generate Review Report

Produce a structured report:

1. **Summary**:
   - PR number, title, author, branch
   - State, draft status, linked issues
   - CI check status
   - Review status (approvals, rejections, unresolved threads)
   - Overall status and score

2. **Findings**: Each finding with severity, category, description, and
   recommended action.

3. **Merge Recommendation**:
   - If `merge_ready` is true: "PR is ready to merge."
   - Otherwise: List blockers and recommended next steps.

Example finding structure:

```json
{
  "severity": "high",
  "category": "linked-issue",
  "message": "PR does not reference any GitHub issue",
  "suggestion": "Add 'Closes #N' or 'Refs #N' to the PR body"
}
```

## Step 10: Post PR Review Comment (conditional)

If `post_review` is true:

1. Format the review report as GitHub-flavored Markdown.
2. Use GitHub MCP `pull_request_review_write` with `method: create` and
   `event: COMMENT` to post the review.

Fallback:

```bash
gh pr comment <pr_number> --body "<review_report_markdown>"
```

The comment should start with:

```markdown
## 🤖 Pull Request Review

> Posted by AI agent. Review findings below.
```

If `merge_ready` is true and no high/medium findings exist, post an
approving review with `event: APPROVE`. Otherwise, post as a comment
only.

## Step 11: Return Outputs

Return:

- `findings` array
- `overall_status`
- `merge_ready`
- `score`

If the PR passes all checks, return `merge_ready: true` with a score of
100 and an explicit passing statement.

## Definition of Done

This skill is complete when:

1. The PR has been fully reviewed across metadata, commits, changes,
   tests, docs, and CI status.
2. Findings are categorized by severity with actionable guidance.
3. A merge-readiness determination has been made.
4. If `post_review` was true, the review was successfully posted to the
   PR.
