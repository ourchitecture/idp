---
name: ship-changes
version: 1.0.0
description: >
  End-to-end workflow that reviews working tree changes, creates a
  feature branch, commits with strict Conventional Commits format,
  pushes to the remote, opens a pull request via the GitHub MCP
  server, and merges the PR to main. After merge the remote
  automatically deletes the feature branch and the local branch is
  cleaned up. Prefer local git commands and the GitHub MCP server;
  fall back to the gh CLI when MCP tools are unavailable.
  Use this skill when you want to ship pending changes from
  working tree to merged-on-main in a single invocation.
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

## Step 8: Ensure a Feature Branch

If the current branch is `main` or `master`, create and switch to a
new feature branch following the convention
`<type>/<short-description>` derived from the classified commit type
and description (e.g., `feat/add-ship-changes-skill`).

```bash
git checkout -b <type>/<short-description>
```

If already on a non-default branch, continue on it.

## Step 9: Create the Git Commit

If `dry_run` is true, output the commit message and stop without
committing.

Otherwise, create the commit using the validated message:

```bash
git commit -m "<validated commit message>"
```

Run `git log -1 --format="%H %s"` to confirm the commit was created
successfully.

## Step 10: Push to Remote

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

## Step 11: Create a Pull Request

Use the GitHub MCP `create_pull_request` tool to open a PR:

- **owner**: repository owner (e.g., `ourchitecture`)
- **repo**: repository name (e.g., `idp`)
- **head**: the feature branch name
- **base**: `main`
- **title**: the commit subject line
- **body**: the commit body. If `issue_number` was provided, append
  `\n\nCloses #<issue_number>` to the PR body.

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh pr create --base main --head <branch> \
  --title "<commit subject>" \
  --body "<commit body>"
```

Record the PR number and URL from the response.

## Step 12: Merge the Pull Request

Use the GitHub MCP `merge_pull_request` tool to merge:

- **owner**: repository owner
- **repo**: repository name
- **pullNumber**: the PR number from Step 11
- **merge_method**: `squash`

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh pr merge <pr_number> --squash --delete-branch
```

## Step 13: Sync Local Main and Clean Up

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

4. Verify by running `git log -1 --format="%H %s"` on main.

## Step 14: Report to GitHub Issue (conditional)

If `issue_number` was provided, use the GitHub MCP
`add_issue_comment` tool to post a comment on the issue with the
merge SHA, PR number, and summary. Skip this step if no issue number
was given.
