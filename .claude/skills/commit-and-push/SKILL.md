---
name: commit-and-push
version: 1.1.1
deprecated: >-
  Superseded by ship-changes which provides end-to-end
  branch, commit, push, PR, and merge automation.
description: >
  Orchestrates the full commit-to-push workflow. First invokes the
  evaluate-and-commit skill to classify changes and create a strict
  Conventional Commits message, then pushes the committed changes to
  the GitHub remote upstream. Use this skill when you have staged changes
  that need to be committed and pushed in one workflow.
author: "@idp-maintain"
domain: devops
tags:
  - git
  - conventional-commits
  - push
  - automation
  - workflow
depends_on:
  - evaluate-and-commit
inputs:
  - name: issue_number
    type: number
    required: false
    description: >
      The GitHub Issue number this change addresses. Passed through to the
      commit skill. When provided, the commit footer includes an issue
      reference and the push result is reported back to the issue.
  - name: breaking
    type: boolean
    required: false
    default: false
    description: Whether this change includes a breaking change.
  - name: breaking_description
    type: string
    required: false
    description: Description of the breaking change. Required if breaking is true.
  - name: remote
    type: string
    required: false
    default: origin
    description: The git remote to push to.
  - name: set_upstream
    type: boolean
    required: false
    default: true
    description: Whether to set the upstream tracking branch if not already configured.
  - name: dry_run
    type: boolean
    required: false
    default: false
    description: If true, runs the commit in dry-run mode and skips the push.
outputs:
  - name: commit_sha
    type: string
    description: The SHA of the created commit.
  - name: commit_message
    type: string
    description: The Conventional Commits message that was used.
  - name: branch
    type: string
    description: The branch that was pushed.
  - name: push_success
    type: boolean
    description: Whether the push to remote succeeded.
  - name: remote_url
    type: string
    description: The remote URL that was pushed to.
---

# Commit and Push to Remote

Orchestrates the full commit-to-push workflow by composing the `evaluate-and-commit` skill and then pushing to the remote.

## Step 1: Evaluate and Commit

Invoke the `evaluate-and-commit` skill with the provided inputs (`issue_number`, `breaking`, `breaking_description`, `dry_run`). This classifies the staged changes, composes a Conventional Commits message, validates it, and creates the commit.

If the commit step fails, stop the entire workflow.

## Step 2: Detect Current Branch

Run `git branch --show-current` to determine the active branch.

## Step 3: Validate Branch Name Convention

Check the branch name follows the convention: `<type>/<short-description>` where type is one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, security, revert.

Examples of valid names: `feat/mcp-tool-registry`, `fix/auth-race-condition`, `security/tls-upgrade`.

**If the branch is `main` or `master`, STOP.** Direct pushes to the default branch are not allowed. The agent should create a feature branch instead.

If the branch name does not follow the convention, warn but do not block -- the push may still proceed for work-in-progress branches.

## Step 4: Verify Remote Exists

Run `git remote get-url <remote>` (default: `origin`) to confirm the remote is configured and reachable. Stop if the remote does not exist.

## Step 5: Check Upstream Tracking Branch

Run `git rev-parse --abbrev-ref --symbolic-full-name @{u}` to check if an upstream tracking branch is already configured. Note the result for the push step.

## Step 6: Push to Remote

If `dry_run` is true, skip this step and report that the push was skipped.

Otherwise:

- If no upstream tracking branch is configured and `set_upstream` is true, push with `-u` to set tracking:
  ```bash
  git push -u <remote> <branch>
  ```
- Otherwise, push normally:
  ```bash
  git push <remote> <branch>
  ```

## Step 7: Verify Push Succeeded

Confirm the local HEAD SHA matches the remote branch SHA:

```bash
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse <remote>/<branch>)
```

If they match, the push is verified. If they differ, report a warning and fail.

## Step 8: Report to GitHub Issue (conditional)

If `issue_number` was provided, use the GitHub MCP `add_issue_comment` tool to post a comment on the issue confirming the push, including the commit SHA, branch name, and remote. Skip this step if no issue number was given.
