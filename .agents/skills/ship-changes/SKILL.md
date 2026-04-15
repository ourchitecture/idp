---
name: ship-changes
version: 1.5.0
description: >
  End-to-end workflow that reviews working tree changes, creates a
  feature branch, commits with strict Conventional Commits format,
  pushes to the remote, opens a pull request via the GitHub MCP
  server, and merges the PR to main. After merge the remote
  automatically deletes the feature branch and the local branch is
  cleaned up. Prefer local git commands and the GitHub MCP server;
  fall back to the gh CLI when MCP tools are unavailable.
  When an issue_number is given and the tree has no implementation
  yet, implements the linked issue first, then ships. Use this skill
  when you want to ship pending changes from working tree to
  merged-on-main in a single invocation.
author: "@idp-maintain"
domain: devops
tags:
  - git
  - conventional-commits
  - pull-request
  - merge
  - automation
  - workflow
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: false
    description: >
      The GitHub Issue number this change addresses. When provided,
      the commit footer and PR body include an issue reference and
      progress is reported back to the issue.
  - name: breaking
    type: boolean
    required: false
    default: false
    description: Whether this change includes a breaking change.
  - name: breaking_description
    type: string
    required: false
    description: >
      Description of the breaking change. Required if breaking is
      true.
  - name: remote
    type: string
    required: false
    default: upstream
    description: The git remote to push to.
  - name: dry_run
    type: boolean
    required: false
    default: false
    description: >
      If true, outputs the commit message and stops without
      committing, pushing, or creating a PR.
outputs:
  - name: commit_sha
    type: string
    description: The SHA of the created commit.
  - name: commit_message
    type: string
    description: The Conventional Commits message that was used.
  - name: branch
    type: string
    description: The feature branch that was created and pushed.
  - name: pr_number
    type: number
    description: The GitHub pull request number.
  - name: pr_url
    type: string
    description: The URL of the created pull request.
  - name: merge_sha
    type: string
    description: The merge commit SHA on main after the PR is merged.
---

# Ship Changes

End-to-end workflow: review working tree, create a feature branch,
commit, push, open a PR, merge to main, and clean up.

## Operating Mode: Iterate in Small Commits

This skill is the final "ship" step, but the implementation work that
feeds it (Step 0b and any refinement loops along the way) must be
performed as a sequence of small, granular commits — not as one
large, in-memory edit session that lands a single monster commit at
the end.

Follow these rules whenever the skill is actively editing the repo:

- **Commit after every meaningful change.** Every new file, every
  edit to an existing file, and every deletion is a candidate for
  its own commit. Do not batch unrelated changes into a single
  commit just because they happened in the same session.
- **Do not hold the whole implementation in memory.** Plan the
  smallest next step, edit, stage, commit, and then re-read the repo
  to plan the step after that. The commit history is the working
  memory of the task.
- **It is okay to revise a previous commit with a new commit.**
  When a commit turns out to be wrong or incomplete, land a
  follow-up commit that fixes it rather than trying to rewrite the
  earlier one in place. The squash-merge at Step 13 collapses the
  series into a single clean commit on `main`, so intermediate
  "change direction" commits on the feature branch are expected and
  healthy.
- **Stage explicit file paths per commit.** Prefer
  `git add <path>` over `git add .` / `git add -A` so each commit's
  scope matches the change you just made and unrelated working-tree
  changes do not leak in.
- **Push early and often.** Once the feature branch has its first
  commit, push it (Step 11) so concurrent agents and reviewers can
  see progress. Continue pushing after each additional commit rather
  than waiting until the end.
- **Re-read before re-editing.** Before modifying a file you already
  edited earlier in this session, re-read it from disk. Your mental
  model can drift; the committed state is ground truth.

The numbered steps below describe a single ship pass. When a pass
produces more than one logical change, repeat Steps 1–11 for each
slice (stage → classify → lint → commit → push) before moving on to
Steps 12–15 to open and merge the pull request.

See the top-level [`AGENTS.md`](../../../AGENTS.md) "Iterative Small
Commits" section for the repo-wide rule this skill implements.

## Step 0a: Claim the issue (conditional, mandatory when issue_number provided)

When **`issue_number` is provided**, immediately add the `in-progress`
label to the issue **before any other work begins**. This is the first
action after reading the issue metadata and must happen regardless of
whether the working tree already has an implementation. The label
signals to other agents and maintainers that work is underway and
prevents duplicate effort.

Use the GitHub MCP `update_issue` tool or:

```bash
gh issue edit <issue_number> --add-label "in-progress"
```

If the issue already has the `in-progress` label, check comments for
a prior plan or PR. If another agent is actively working the issue,
stop and report the conflict rather than proceeding.

**This step is non-negotiable.** Do not proceed to Step 0b or Step 1
without first labeling the issue as `in-progress`.

## Step 0b: Implement linked issue when required (optional)

When **`issue_number` is provided** and the repository has **no**
ready-to-ship implementation for that issue (working tree clean, only
unrelated edits, or the change does not satisfy the issue acceptance
criteria):

1. **Fetch the issue** (GitHub MCP `issue_read` or `gh issue view`) and
   read acceptance criteria and validation commands.
2. **Create or reuse the canonical issue worktree** before making code
   changes when the repo defines a worktree helper flow. Prefer the
   repo-local commands (`moon run repo:worktree-ensure` or
   `make worktree-ensure` with `ISSUE_NUMBER` set) over ad hoc
   `git worktree` commands. If already inside the matching issue
   worktree, continue there. If the current checkout is dirty and does
   not belong to the same issue worktree, stop and surface the conflict.
3. **Implement incrementally** following `AGENTS.md` and existing
   patterns. Break the implementation into the smallest useful steps
   and commit each step before starting the next:
   - Plan only the next small step — not the entire implementation.
   - Make the edit (create, update, or delete one file, or a tightly
     related group of files that must change together).
   - Run the fast validation relevant to the change (lint the file,
     run the narrow test) when it is cheap.
   - Stage the exact paths you touched and create a commit with a
     descriptive Conventional Commits message.
   - Push the branch (see Step 11) so the commit is visible.
   - Re-read the repo state and plan the next small step from the
     newly-committed baseline.
   Repeat this loop until the issue's acceptance criteria are met.
   Run the issue's full validation commands (or stack-equivalent
   checks) before handing off to Step 12, and fix failures with
   additional small commits rather than by rewriting earlier ones.
4. **Revise with follow-up commits, not rewrites.** If an earlier
   commit in the series turns out to be wrong or incomplete, land a
   new commit that corrects it. The squash-merge in Step 13 will
   collapse the whole series into a single commit on `main`, so
   intermediate "change direction" commits on the feature branch are
   expected and healthy.
5. If requirements are ambiguous, the issue is blocked, or an
   individual step is still too large to commit cleanly, **stop** and
   ask the user instead of guessing or batching many unrelated
   changes into one commit.

When Step 0b runs, the rest of the workflow operates on the committed
series of changes. If the working tree already contains a complete
implementation for the issue, **skip Step 0b** and start at Step 1.

## Step 1: Review All Unstaged and Untracked Files

Run `git status` to get a complete picture of the working tree.
Identify:

- **Staged changes** (already in the index)
- **Unstaged modifications** (tracked files with changes not yet
  staged)
- **Untracked files** (new files not yet tracked by git)

For each unstaged modification and untracked file, review the
content:

- Run `git diff` to inspect unstaged modifications to tracked files.
- Run `git diff --cached` to inspect any already-staged changes.
- For untracked files, read the file contents to understand what they
  contain.

## Step 2: Determine Staging Actions

For each file, decide the appropriate action:

1. **Stage** -- The file contains intentional, complete changes that
   belong in this commit. Stage it with `git add <file>`.
2. **Skip** -- The file contains unrelated changes, work-in-progress,
   or should not be committed (e.g., temporary files, local config,
   secrets, `.env` files, credentials, large binaries). Leave it
   unstaged. Add sensitive files including but not limited to `.env`
   with credentials, secrets, and other sensitive information to the
   `.gitignore` file at the project root and leave it unstaged.
3. **Warn** -- The file may contain sensitive data (secrets, tokens,
   passwords, API keys). Add it to the `.gitignore` file at the
   project root and do NOT stage it.

Apply the decisions:

- Stage all files marked for staging using `git add <file>` for each
  file (prefer explicit file paths over `git add .` or `git add -A`).
- Report any skipped or warned files to the user with the reason.

## Step 3: Verify Staged Changes Exist

Run `git diff --cached --quiet` to check for staged changes. If there
are no staged changes after the review (all files were skipped or
warned), stop immediately and inform the user.

## Step 4: Classify Changes by Type and Scope

Run `git diff --cached --stat` and `git diff --cached` to inspect the
staged changes.

Determine the following:

1. **Type** -- Select exactly one from the allowed Conventional
   Commits types:
   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation only changes
   - `style`: Formatting, whitespace, semicolons (no logic change)
   - `refactor`: Code change that neither fixes a bug nor adds a
     feature
   - `perf`: Performance improvement
   - `test`: Adding or correcting tests
   - `build`: Changes to build system or external dependencies
   - `ci`: CI/CD pipeline changes
   - `chore`: Maintenance tasks that do not modify src or test files
   - `security`: Security-related changes
   - `revert`: Reverts a previous commit

2. **Scope** -- Identify the primary module, service, or domain
   affected. Use the directory structure to determine scope (e.g.,
   `auth`, `plugin-sdk`, `mcp-tools`, `api`, `deploy`). If changes
   span multiple scopes, use the most significant one or omit scope
   if truly cross-cutting.

3. **Description** -- Write a concise imperative-mood summary (max 72
   chars) that describes what the change does, not how. Start with a
   lowercase verb.

4. **Body** -- Write a brief explanation of why this change is needed
   and what it accomplishes. Wrap at 72 characters per line.

## Step 5: Validate the Commit Type

Validate the classified type against the allowed list. If the change
touches security-sensitive code (auth, encryption, access control,
secrets), the type MUST be `security` regardless of other
classification.

Also validate:

- The description is imperative mood, lowercase, no period at end,
  max 72 chars.
- The scope (if present) is kebab-case and meaningful.

## Step 6: Compose the Conventional Commit Message

Format:

```text
<type>(<scope>): <description>

<body>

[optional footer(s)]
```

Rules:

- If `breaking` is true, append `!` after the scope:
  `<type>(<scope>)!: <description>` AND add
  `BREAKING CHANGE: <breaking_description>` as a footer.
- If `issue_number` is provided, include
  `Closes #<issue_number>` or `Refs #<issue_number>` in the footer.
  Use `Closes` if the change fully addresses the issue, `Refs` if
  partial.
- If `issue_number` is NOT provided, omit the issue reference footer.
  If there are no footers at all, omit the footer section entirely.
- The subject line must not exceed 72 characters.
- Body lines must wrap at 72 characters.

## Step 7: Validate the Commit Message

Perform a final validation:

1. Subject line matches:
   `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|security|revert)(\(.+\))?!?: .+$`
2. Subject line is 72 characters or fewer.
3. Second line is blank (if body or footer exists).
4. Body lines are 72 characters or fewer.
5. If `issue_number` was provided, footer contains `Closes #N` or
   `Refs #N`.
6. If `issue_number` was NOT provided, the commit is still valid
   without an issue reference.
7. If breaking, footer contains `BREAKING CHANGE:` description.
8. Description starts with lowercase letter and has no trailing
   period.

If any rule fails, fix the message and re-validate. Do not proceed
with an invalid message.

## Step 8: Lint Changed Markdown Files

Identify every `.md` file that appears in the staged changes:

```bash
git diff --cached --name-only --diff-filter=ACMR -- '*.md'
```

If the list is non-empty, run the repo's canonical Markdown lint task.
**Never invoke `npx markdownlint-cli2` directly** — always use the
`moon` task or `make` target so the pinned toolchain and project
configuration are respected:

```bash
moon run repo:check-lint-md
# or: make check-lint-md
```

- If linting **passes** (exit 0), proceed to the next step.
- If linting **fails** (exit non-zero), inspect the errors. If
  failures are limited to staged files, fix them, re-stage, and
  re-run. If failures are in pre-existing files not part of the
  current change, note them and proceed — do not block the commit
  on unrelated lint debt.

If no `.md` files are staged, skip this step.

## Step 9: Ensure a Feature Branch

If the current branch is `main` or `master`, create and switch to a
new feature branch following the convention
`<type>/<short-description>` derived from the classified commit type
and description (e.g., `feat/add-ship-changes-skill`).

```bash
git checkout -b <type>/<short-description>
```

If already on a non-default branch, continue on it. When issue worktree
automation is in use, the canonical issue worktree branch may already
exist; prefer reusing that branch rather than replacing it with an ad
hoc second branch unless the repo policy explicitly requires otherwise.

## Step 10: Create the Git Commit

If `dry_run` is true, output the commit message and stop without
committing.

Otherwise, create the commit using the validated message:

```bash
git commit -m "<validated commit message>"
```

Run `git log -1 --format="%H %s"` to confirm the commit was created
successfully.

When the feature branch needs to carry more than one logical change,
return to Step 1 after this commit and process the next slice. Each
slice should be its own small commit — do not try to consolidate
several unrelated changes into the message composed in Steps 4–7.

## Step 11: Push to Remote

Run `git remote get-url <remote>` (default: `upstream`) to confirm
the remote exists.

Check for an upstream tracking branch:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

- If no tracking branch is configured, push with `-u`:

  ```bash
  git push -u <remote> <branch>
  ```

- Otherwise push normally:

  ```bash
  git push <remote> <branch>
  ```

Verify the push by comparing local and remote SHAs:

```bash
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse <remote>/<branch>)
```

If they do not match, stop and report the failure.

Push after every new commit, not just the last one in the series.
Early pushes make in-progress work visible to concurrent agents and
reviewers, and keep the remote branch close to the local branch so a
later failure does not lose work.

## Step 12: Create a Pull Request

Determine the current GitHub username by running:

```bash
gh api user --jq .login
```

Determine the correct label from the commit type:

| Commit type | Label |
| --- | --- |
| `feat` | `enhancement` |
| `fix` | `bug` |
| `docs` | `documentation` |
| `chore`, `style`, `refactor`, `perf`, `build`, `ci`, `test`, `revert` | `chore` |
| `security` | `bug` |

Use the GitHub MCP `create_pull_request` tool to open a **draft** PR:

- **owner**: repository owner (e.g., `ourchitecture`)
- **repo**: repository name (e.g., `idp`)
- **head**: the feature branch name
- **base**: `main`
- **title**: the commit subject line
- **body**: the commit body. If `issue_number` was provided, append
  `\n\nCloses #<issue_number>` to the PR body.
- **draft**: `true`

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh pr create --base main --head <branch> \
  --title "<commit subject>" \
  --body "<commit body>" \
  --draft
```

Record the PR number and URL from the response.

### Set Assignee and Labels

After the PR is created, use the GitHub MCP `update_pull_request`
tool to set:

- **assignees**: the current GitHub username obtained above
- **labels**: the label determined from the commit type mapping

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh pr edit <pr_number> --add-assignee "@me" \
  --add-label "<label>"
```

## Step 12b: Mark PR Ready for Review

After the draft PR is created and assignee/labels are set, mark the
PR as ready for review. This transitions the PR from draft to
non-draft status, which triggers the full CI pipeline (expensive
jobs like stack validation, container builds, and integration tests
are gated behind `github.event.pull_request.draft == false`).

Use the GitHub MCP `update_pull_request` tool to set `draft: false`,
or use the `gh` CLI:

```bash
gh pr ready <pr_number>
```

This step must complete before waiting for status checks in Step 13.
The lightweight checks (change detection, markdown lint, commit
message validation) run on the draft PR to provide early feedback;
the full validation suite starts only after this ready-for-review
transition.

## Step 13: Wait for Status Checks and Merge

The `main` branch is protected by GitHub rulesets that enforce required status
checks, at least one approving CODEOWNERS review, resolved conversations, and
squash-only merges. GitHub will reject any merge attempt that does not satisfy
these constraints. The checks below serve as pre-flight verification to surface
failures early.

Before merging, wait for all required PR status checks to pass.
This is a hard gate: do not merge while any check is failing, cancelled,
timed out, pending, queued, or in progress.

Use the GitHub MCP `pull_request_read` tool with
`method: "get_check_runs"` to inspect checks for the PR head commit.
Re-check until all required checks are completed successfully.

Treat these conclusions as merge blockers:

- `failure`
- `cancelled`
- `timed_out`
- `action_required`
- `stale`
- `startup_failure`
- any `null`/missing conclusion for required checks while still pending

Only continue when all required checks report `conclusion: "success"`
(or are explicitly non-required and can be ignored).

If checks are still running, poll with the `gh` CLI:

```bash
gh pr checks <pr_number> --watch --interval 15
```

This command blocks until all checks complete. If any required check
fails, stop and report the failing check names and URLs to the user —
do not merge. Even if this skill attempted a non-squash merge or merge
with failing checks, GitHub rulesets would block the operation.

Once all checks pass, use the GitHub MCP `merge_pull_request`
tool to merge:

- **owner**: repository owner
- **repo**: repository name
- **pullNumber**: the PR number from Step 12
- **merge_method**: `squash` (the only permitted method; the repository
  ruleset enforces linear history via squash merges)

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh pr merge <pr_number> --squash --delete-branch
```

## Step 14: Sync Local Main and Clean Up

After the merge completes:

1. Switch back to main:

   ```bash
   git checkout main
   ```

2. Pull the latest from remote:

   ```bash
   git pull <remote> main
   ```

3. Delete the local feature branch:

   ```bash
   git branch -d <branch>
   ```

4. If the repo defines canonical issue worktree cleanup helpers and
   `issue_number` was provided, run the cleanup helper with explicit
   post-merge confirmation so only the clean merged issue worktree is
   removed. Do not force-remove dirty or ambiguous worktrees.
5. Verify by running `git log -1 --format="%H %s"` on main.

## Step 15: Report to GitHub Issue and Clean Up Labels (conditional)

If `issue_number` was provided:

1. **Remove the `in-progress` label** from the issue. The work is
   complete and the label must not linger:

   ```bash
   gh issue edit <issue_number> --remove-label "in-progress"
   ```

2. **Post a completion comment** using the GitHub MCP
   `add_issue_comment` tool with the merge SHA, PR number, summary,
   and any leftover worktree cleanup action that still requires manual
   follow-up.

Skip this step if no issue number was given.
