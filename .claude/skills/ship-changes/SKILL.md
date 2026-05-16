---
name: ship-changes
version: 1.6.0
description: >
  End-to-end: review working tree, branch, commit with Conventional Commits,
  push, open a draft PR, mark ready, wait for checks, squash-merge to main,
  clean up. When issue_number is given and no implementation yet exists,
  implement the issue first.
author: "@idp-maintain"
domain: devops
tags: [git, conventional-commits, pull-request, merge, automation, workflow]
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: false
    description: GitHub Issue this change addresses. Adds issue refs and reports.
  - name: breaking
    type: boolean
    required: false
    default: false
    description: Marks the change as breaking.
  - name: breaking_description
    type: string
    required: false
    description: Required if breaking=true.
  - name: remote
    type: string
    required: false
    default: upstream
    description: Git remote to push to.
  - name: dry_run
    type: boolean
    required: false
    default: false
    description: If true, output the commit message and stop.
outputs:
  - name: commit_sha
    type: string
    description: SHA of the created commit.
  - name: commit_message
    type: string
    description: Conventional Commits message used.
  - name: branch
    type: string
    description: Feature branch created and pushed.
  - name: pr_number
    type: number
    description: PR number.
  - name: pr_url
    type: string
    description: PR URL.
  - name: merge_sha
    type: string
    description: Merge commit SHA on main.
---

# Ship Changes

End-to-end workflow that lands working-tree changes on `main`.

- Commit/PR format rules: [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md)
- Iterative-commit discipline: [../../docs/shared/iterative-commits.md](../../docs/shared/iterative-commits.md)
- GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md)
- Worktree rules: [../../docs/shared/worktree.md](../../docs/shared/worktree.md)
- Branch protection: [../../docs/git-standards.md](../../docs/git-standards.md)

## Operating mode

Repeat steps 1–11 for **each** logical slice; do not consolidate unrelated
slices. Stage explicit paths (`git add <path>`, not `git add .`). Push after
every commit. Re-read before re-editing. Revise prior commits with a new
follow-up commit; the squash-merge in step 13 collapses the series.

## 0a. Claim the issue (mandatory when `issue_number` provided)

First action after reading metadata — before any other work. Add
`in-progress`:

`gh issue edit <issue_number> --add-label "in-progress"`

If already `in-progress`, check for an active PR or plan. If another agent
is working it, stop and surface the conflict.

## 0b. Implement the linked issue (only when needed)

Run only when `issue_number` is provided **and** no implementation exists
yet (working tree clean, unrelated edits, or doesn't satisfy acceptance
criteria):

1. Fetch the issue (MCP `issue_read` or `gh issue view`). Read acceptance
   criteria and validation commands.
2. Create or reuse the canonical issue worktree
   (`moon run repo:worktree-ensure` or `make worktree-ensure` with
   `ISSUE_NUMBER`). Stop on conflicts; never use ad hoc `git worktree`.
3. Implement incrementally: plan the next small step, edit, run cheap
   local validation, stage exact paths, commit, push (step 11), re-read,
   plan again. Repeat until acceptance criteria are met.
4. On failure, fix with follow-up commits — don't rewrite earlier ones.
5. If requirements are ambiguous or a step is still too large, stop and
   ask the user.

If a complete implementation already exists in the working tree, skip 0b.

## 1. Review working tree

`git status`, `git diff`, `git diff --cached`. For each untracked file,
read the contents.

## 2. Stage decisions

For each file: **Stage** (intentional and complete), **Skip** (unrelated,
WIP, temp/local-only), or **Warn** (likely secrets — add to `.gitignore`
at repo root, never stage).

Apply with `git add <path>` for each staged file. Report skipped/warned
files with reasons.

## 3. Verify staged changes

`git diff --cached --quiet`. If nothing is staged after review, stop.

## 4. Classify the slice

From `git diff --cached --stat` and `git diff --cached`:

- **Type** — one of `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/
  `build`/`ci`/`chore`/`security`/`revert`. Security-sensitive code (auth,
  encryption, access control, secrets) **must** be `security` regardless of
  other classification.
- **Scope** — primary module/service/domain from the directory tree
  (`auth`, `mcp-tools`, `api`, `deploy`). Omit if truly cross-cutting.
- **Description** — imperative, lowercase, no trailing period, ≤72 chars.
- **Body** — why and what (not how), wrapped at 72.

## 5. Compose and validate the commit message

See [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md).

Validate: subject regex
`^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|security|revert)(\(.+\))?!?: .+$`,
≤72 chars, blank line before body/footer, body lines ≤72, lowercase start,
no trailing period. Fix and re-validate on failure — never commit an
invalid message.

## 6. Lint changed markdown

```bash
git diff --cached --name-only --diff-filter=ACMR -- '*.md'
```

If non-empty, run `moon run repo:check-lint-md` (or `make check-lint-md`).
**Never** use `npx markdownlint-cli2` directly. Fix staged-file failures
and re-stage. Pre-existing failures in unrelated files: note and proceed.

## 7. Ensure a feature branch

If on `main`/`master`, create `<type>/<short-description>`:
`git checkout -b <type>/<short-description>`. If on a non-default branch,
continue. Prefer the canonical issue worktree branch when present — don't
create a second ad hoc branch for the same issue.

## 8. Commit

If `dry_run=true`, output the message and stop.
Else: `git commit -m "<message>"`. Verify with `git log -1 --format="%H %s"`.

If more slices remain, return to step 1 for the next slice. Don't
consolidate unrelated slices into one commit message.

## 9. Push

```bash
git remote get-url <remote>
git rev-parse --abbrev-ref --symbolic-full-name @{u}  # check tracking
git push -u <remote> <branch>   # if no tracking
# else: git push <remote> <branch>
```

Verify: `git rev-parse HEAD` matches `git rev-parse <remote>/<branch>`.
Stop and report on mismatch.

Push **after every commit**, not just the last.

## 10. Create the PR (draft first)

Current user: `gh api user --jq .login`.

Label from type:

| Type | Label |
| --- | --- |
| feat | enhancement |
| fix, security | bug |
| docs | documentation |
| chore/style/refactor/perf/build/ci/test/revert | chore |

MCP `create_pull_request` with: owner, repo, head, base=`main`, title=commit
subject, body=commit body (+ `\n\nCloses #N` if `issue_number`), **`draft: true`**.

Fallback:

```bash
gh pr create --base main --head <branch> \
  --title "<subject>" --body "<body>" --draft
```

Set assignee and label via MCP `update_pull_request` or:

`gh pr edit <pr_number> --add-assignee "@me" --add-label "<label>"`.

## 11. Mark ready for review

Validate branch is visible on GitHub (see
[../../docs/shared/github-api.md](../../docs/shared/github-api.md) for the
backoff sequence), then mark ready — this triggers the full CI suite.

MCP `update_pull_request` with `draft: false` or `gh pr ready <pr_number>`.

## 12. Wait for required checks

The `main` ruleset requires all checks pass, ≥1 CODEOWNERS approval,
resolved conversations, squash merge, linear history. Pre-flight verify
checks before merging:

`gh pr checks <pr_number> --watch --interval 15` (blocks until complete)
or MCP `pull_request_read` with `method: get_check_runs`.

Treat as blockers (do not merge): `failure`, `cancelled`, `timed_out`,
`action_required`, `stale`, `startup_failure`, or any null/pending
conclusion on a required check.

If a required check fails, stop and report names + URLs. Ask for log lines —
MCP cannot fetch raw logs.

## 13. Merge (squash only)

MCP `merge_pull_request` with `merge_method: squash`, or:

`gh pr merge <pr_number> --squash --delete-branch`.

## 14. Sync local and clean up

```bash
git checkout main
git pull <remote> main
git branch -d <branch>
git log -1 --format="%H %s"
```

If `issue_number` was provided, run the canonical worktree cleanup helper
(post-merge confirmation only; never force-remove dirty/ambiguous trees).

## 15. Report to issue (when `issue_number` provided)

1. Remove `in-progress`: `gh issue edit <issue_number> --remove-label "in-progress"`.
2. Post completion comment via MCP `add_issue_comment` with merge SHA, PR
   number, summary, and any leftover worktree cleanup needing manual follow-up.
