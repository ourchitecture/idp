---
name: review-pull-requests
version: 1.1.0
description: >
  Reviews PRs for completeness, quality, and merge readiness. Validates
  metadata, commits, linked issues, CI status, code changes, tests, docs,
  and merge state.
author: "@idp-maintain"
domain: devops
tags: [github, pull-request, review, quality, validation, automation]
depends_on: []
inputs:
  - name: pr_number
    type: number
    required: true
    description: PR to review.
  - name: check_ci_status
    type: boolean
    required: false
    default: true
    description: Verify required CI checks have passed.
  - name: require_linked_issue
    type: boolean
    required: false
    default: true
    description: Flag PRs without an issue reference.
  - name: require_conventional_commits
    type: boolean
    required: false
    default: true
    description: Validate PR title and commits against Conventional Commits.
  - name: require_tests
    type: boolean
    required: false
    default: false
    description: Flag source-code changes without test additions/updates.
  - name: post_review
    type: boolean
    required: false
    default: false
    description: Post findings as a PR review.
outputs:
  - name: findings
    type: array
    description: Findings with severity, category, recommendations.
  - name: overall_status
    type: string
    description: pass | warn | fail.
  - name: merge_ready
    type: boolean
    description: All gates passed and ready to merge.
  - name: score
    type: number
    description: PR quality score 0–100.
---

# Review Pull Requests

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).
Commit/PR-title format: [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md).
Branch protection rules: [../../docs/git-standards.md](../../docs/git-standards.md).

## 1. Fetch PR metadata

MCP `pull_request_read` (`method: get`) → number, title, body, author,
assignees, reviewers, state, draft, base/head, labels, linked issues
(`closingIssuesReferences` or parsed), timestamps.

CLI fallback:

```bash
gh pr view <n> --json number,title,body,state,isDraft,headRefName,baseRefName,author,assignees,labels,commits,reviews,additions,deletions,changedFiles,url,createdAt,updatedAt
```

Stop if not found.

## 2. Validate metadata

- **Title** (if `require_conventional_commits`): matches
  `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|security|revert)(\(.+\))?!?: .+$`,
  ≤72 chars, lowercase after colon, no trailing period.
- **Body**: clear description; if `require_linked_issue`, at least one
  `Closes/Fixes/Resolves/Refs #N`; if breaking, `BREAKING CHANGE:` footer
  or `!` in title.
- **Labels**: appropriate (`bug`, `enhancement`, `documentation`, `chore`).
- **Draft**: note status — full review continues but merge defers.

## 3. Validate linked issues

If `require_linked_issue`: parse references, verify each issue exists and
is `open` (or closed by this PR), has `ready` (not `needs-triage`/`blocked`),
and scope aligns. No links → **high**. Multiple links → confirm related.

## 4. Review commit history

MCP `pull_request_read` → commits. Fallback:
`gh pr view <n> --json commits --jq '.commits[].messageHeadline'`.

If `require_conventional_commits`, every commit matches the pattern; flag
generic messages ("fix", "update", "wip"). Flag merge commits (squash
preferred), unexplained reverts, add-and-remove churn. Recommend squashing
fixup commits.

## 5. Review changed files

MCP `get_files` or `gh pr diff <n> --name-only`.

- **Source**: if `require_tests`, test files must be added/updated.
  Flag large single-file diffs (500+ lines) without justification.
- **Docs**: if source/APIs/config changed, related docs must be updated
  (README, AGENTS index, `.agents/docs/`, `docs/`).
- **Config/infra**: `Makefile`, `moon.yml`, `.github/workflows`,
  `Dockerfile`, `package.json` — intentional and documented.
- **Sensitive files**: flag changes to `.env`, secret managers, credential
  storage; verify no committed secrets.

## 6. CI status (conditional)

If `check_ci_status`: MCP `pull_request_read` (`method: get_check_runs`).
Required checks must conclude `success`. Flag `failure`, `cancelled`,
`timed_out`, `action_required`, `stale`, `startup_failure`. Defer merge
if any required check is pending/in-progress. CLI: `gh pr checks <n>`.

If a check fails, ask for log lines — MCP cannot fetch raw logs (see
[../../docs/shared/github-api.md](../../docs/shared/github-api.md)).

## 7. Reviews, comments, merge state

MCP `get_reviews`, `get_review_comments`, `get_comments`.

- **Unresolved review threads** → **High** blocker until resolved by code
  change, accepted reply, or consensus.
- **Review status**: count `APPROVED` / `CHANGES_REQUESTED` / `COMMENTED`.
  CODEOWNERS approval required by rulesets. Any `CHANGES_REQUESTED` →
  **High** until re-reviewed.
- **Stale reviews** (older than latest commit) → **Medium**; request
  re-review.
- **General comments**: unanswered maintainer questions → **Medium**;
  flag blockers/dependencies. Advisory unless from CODEOWNERS or
  explicitly blocking.

Merge state: `gh pr view <n> --json mergeable,mergeStateStatus,statusCheckRollup`.

- `mergeable: CONFLICTING` or `mergeStateStatus: DIRTY` → **High**.
- Behind base when policy requires up-to-date → **Medium**; recommend
  merge/rebase from base.
- Verify ruleset compliance: required checks, required reviews,
  conversations resolved, linear history (squash-ready).

## 8. Score, status, merge-ready

Severity: **High** = missing linked issue (when required), failing CI,
secrets in diff, unresolved review threads, merge conflicts,
`CHANGES_REQUESTED`, breaking changes without docs. **Medium** =
non-conventional commits, missing tests/docs (when required), large
unjustified diffs, draft not marked ready, branch needs update,
unanswered maintainer questions, stale reviews. **Low** = minor
title/body formatting, missing labels, advisory non-reviewer comments.

Score from 100: high `-25` (max `-75`), medium `-12` (max `-36`),
low `-5` (max `-20`). Clamp `[0,100]`.

- `fail` if any high; `warn` if only med/low; `pass` if none.

`merge_ready=true` only when: `overall_status=pass`, all required checks
passed, PR not draft, ≥1 approving CODEOWNERS review (if required), no
unresolved threads, no conflicts, no `CHANGES_REQUESTED`, branch
up-to-date when policy requires it.

## 9. Report

Summary (number/title/author/branch, state/draft, linked issues, CI,
merge status, review status, comment resolution, overall status/score).
Return findings as `{severity, category, message, suggestion}` objects.
Merge recommendation: "ready to merge" or list of blockers.

## 10. Post review (optional)

If `post_review`: MCP `pull_request_review_write` (`method: create`,
`event: COMMENT`). If `merge_ready` and no high/medium findings,
`event: APPROVE` instead. Fallback: `gh pr comment <n> --body "<report>"`.

## 11. Return

`findings`, `overall_status`, `merge_ready`, `score`. Clean PR →
`merge_ready=true` and score 100 with explicit passing statement.
