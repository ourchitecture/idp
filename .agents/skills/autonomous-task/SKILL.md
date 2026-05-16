---
name: autonomous-task
version: 0.3.0
description: >
  Orchestrates autonomous plan → review → implement → validate loops for a
  development task. Each phase runs inside an isolated git worktree. Supports
  human or AI review gates, configurable iteration limits, fully local runs
  (no GitHub required), and safe parallel execution across multiple sessions.
author: "@idp-maintain"
domain: devops
tags: [autonomous, planning, implementation, worktree, workflow, automation, parallel]
depends_on: []
inputs:
  - name: task_description
    type: string
    required: false
    description: Free-form task description. Required if issue_number is not provided.
  - name: issue_number
    type: number
    required: false
    description: GitHub Issue to work from. If given, task_description is derived from the issue body.
  - name: task_type
    type: string
    required: false
    default: feat
    description: "Conventional Commits type: feat | fix | docs | refactor | chore"
  - name: model_profile
    type: string
    required: false
    default: default
    description: "Named profile from .agents/agent-models.yml: default | thoughtful | fast"
  - name: review_mode
    type: string
    required: false
    default: human
    description: "'human' halts after planning for developer approval. 'auto' uses an AI reviewer agent."
  - name: max_plan_iterations
    type: number
    required: false
    default: 3
    description: Maximum planning iterations before failing with an unresolved-plan error.
  - name: max_impl_iterations
    type: number
    required: false
    default: 3
    description: Maximum implementation iterations before failing with a validation-failure error.
  - name: skip_to
    type: string
    required: false
    description: "Re-entry point after human review approval: 'implement'"
  - name: local_only
    type: boolean
    required: false
    default: false
    description: >
      If true, stop after a validated implementation in the worktree. Skip
      ship-changes entirely — no PR, no CI, no remote push. The worktree is
      left ready for the developer to review and push manually. Enables fully
      local multi-agent runs with no GitHub dependency.
outputs:
  - name: worktree_path
    type: string
    description: Path to the isolated git worktree used for this task.
  - name: plan_comment_url
    type: string
    description: URL of the plan comment posted on the issue (when issue_number is provided).
  - name: pr_url
    type: string
    description: URL of the merged pull request. Empty when local_only=true.
---

# Autonomous Task

Orchestrates the full plan → review → implement → validate → ship pipeline.
Each phase runs inside an isolated git worktree; no reads or writes happen in
the main checkout during execution.

- Worktree rules: [../../docs/shared/worktree.md](../../docs/shared/worktree.md)
- Model profiles: [../../agent-models.yml](../../agent-models.yml)
- Commit format: [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md)
- GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md)

## Runtime note: OpenCode vs. Pi

This skill is discovered by both `pnpm oc` (OpenCode) and `pnpm pi` (Pi).
OpenCode's richer toolset handles the full workflow including worktree APIs and
multi-session agents. Pi's minimal harness (~1K token system prompt vs.
OpenCode's ~10K) runs 2–3× faster on the same model — useful for `fast`-profile
tasks or lightweight validation steps. Run `pnpm pi` instead of `pnpm oc` to
compare execution speed and cost on any given task.

## PR-aware task guidance

When the task involves fixing or unblocking pull requests (e.g. "fix CI failures
on PR #N", "all PRs should pass status checks"), the agent must track two
distinct health signals for every PR under scope:

1. **Merge conflict state** — a PR with `mergeable: CONFLICTING` cannot have its
   CI results acted on, and CI may not trigger at all. Conflicts must be resolved
   before any other work counts.
2. **Status check results** — every required check must reach a terminal
   `SUCCESS` conclusion. Queued or in-progress checks are not done.

### Checking a PR's current state

```bash
gh pr view <PR_NUMBER> \
  --json number,title,mergeable,mergeStateStatus,statusCheckRollup
```

Key fields:

| Field | Meaning |
| --- | --- |
| `mergeable` | `MERGEABLE` \| `CONFLICTING` \| `UNKNOWN` |
| `mergeStateStatus` | `CLEAN` (ready to merge) \| `BLOCKED` \| `BEHIND` \| `UNSTABLE` \| `DIRTY` (conflicts) |
| `statusCheckRollup[].status` | `QUEUED` \| `IN_PROGRESS` \| `COMPLETED` |
| `statusCheckRollup[].conclusion` | `SUCCESS` \| `FAILURE` \| `TIMED_OUT` \| `CANCELLED` \| `""` (pending) |

### Conflict resolution protocol

If `mergeable: CONFLICTING`:

1. Rebase or merge the target branch into the task branch inside the worktree:

   ```bash
   git -C <worktree_path> fetch upstream main
   git -C <worktree_path> merge upstream/main --no-edit
   ```

2. Fix any conflict markers, then stage and commit:

   ```bash
   git -C <worktree_path> add <conflicted-file>
   git -C <worktree_path> commit -m "chore: merge main, resolve <scope> conflict"
   ```

3. Push and re-query until `mergeable: MERGEABLE` before continuing.

### Status check protocol

After each push, wait for all required checks to reach `COMPLETED` status before
marking a step done. Failed checks must be diagnosed and fixed — do not advance
until all required checks report `SUCCESS`. Use:

```bash
gh pr checks <PR_NUMBER>
```

to list check names, status, and URLs for failing runs.

---

## Running multiple sessions in parallel

Each agent session works entirely inside its own worktree, so N sessions can
run concurrently on a single machine as long as each targets a different
task/issue. Two mechanisms make this safe:

1. **Advisory lock file** (`.agent-lock` in the worktree) — written at startup
   with a session identifier; deleted on exit. A second agent that finds an
   existing lock for the same worktree will surface a conflict instead of
   silently overwriting work.
2. **Heartbeat file** (`.agent-heartbeat` in the worktree) — updated after
   every step. The `audit-work-integrity` skill flags worktrees where the
   heartbeat is older than `stale_agent_minutes` (default: 30) as potentially
   hung.

**Recommended launchers for parallel sessions:**

| Tool              | How                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| OpenCode Ensemble | `opencode-ensemble` plugin — each agent automatically gets its own worktree                       |
| Pi side-agents    | `@pasky/pi-side-agents` — one tmux window per agent, each in an isolated worktree                 |
| Manual tmux       | Split panes; run `pnpm oc` or `pnpm pi` in each; provide a different `task_description` per pane  |

All three approaches are compatible with `local_only=true` for fully offline
multi-agent runs.

---

## 0. Resolve inputs and derive slug

If `skip_to=implement`, jump directly to step 3 (skip lock/heartbeat
initialisation; they should already exist from the original run).

Derive `TASK_SLUG` for use in worktree paths, lock files, and docker namespacing:

- If `issue_number` provided: `issue-<number>-<title-slug>` (title words lowercased, spaces → hyphens, max 40 chars total).
- If `task_description` only: first 8 words of description, lowercased, spaces → hyphens.

**From issue:**

```bash
gh issue view <issue_number> --json number,title,body,labels,assignees,state
```

If closed, stop and report. If `blocked`, stop and surface the blocker.
Derive `task_description` from the issue body and acceptance criteria.

If the issue references PRs or the `task_description` mentions CI failures or
PR status checks, query each referenced PR immediately:

```bash
gh pr view <PR_NUMBER> \
  --json number,title,mergeable,mergeStateStatus,statusCheckRollup
```

Record which PRs have conflicts (`mergeable: CONFLICTING`) and which have
failing checks — these are the primary work items before any implementation.

**From free-form description:** use `task_description` as-is; generate a slug
for worktree naming: lowercase, spaces → hyphens, max 40 chars.

Claim the issue if `issue_number` is provided:

```bash
gh issue edit <issue_number> --add-label "in-progress"
```

If labeling fails, stop and report.

---

## 1. Create worktree and claim it

Create or reuse the canonical worktree. All subsequent reads and writes must
happen inside this path.

```bash
# With an issue number:
make worktree-ensure ISSUE_NUMBER=<issue_number>

# Without an issue number (task_description slug):
git worktree add .agents/worktrees/<TASK_SLUG> -b task/<TASK_SLUG>
```

Resolve the absolute worktree path:

```bash
make worktree-path ISSUE_NUMBER=<issue_number>   # or derive manually
```

If the worktree already exists for the same slug, reuse it — do not create a
duplicate. If a different task's worktree is active in the current shell, stop
and surface the conflict.

Set `worktree_path` output to the resolved path.

### Advisory lock

Check for an existing lock file at `<worktree_path>/.agent-lock`. If it exists,
read its contents and surface a conflict — do **not** overwrite it. Stop until
the developer confirms the previous session has ended (or the heartbeat shows
it is stale).

Write the lock file with a session identifier:

```text
session: <random 8-char hex or tool-provided session ID>
started: <ISO 8601 timestamp>
task: <TASK_SLUG>
pid: <process ID if available>
```

### Heartbeat — initial

Write `<worktree_path>/.agent-heartbeat`:

```text
step: worktree-claimed
timestamp: <ISO 8601>
```

Update this file after completing each numbered step below.

---

## 2. Planning loop

Repeat up to `max_plan_iterations`. Load the model defined for the `plan`
role in the active profile (see [../../agent-models.yml](../../agent-models.yml)).

### 2a. Explore (inside worktree)

From `worktree_path`:

1. Read files relevant to the task — check existing patterns, tests, docs.
2. Identify files to create or modify.
3. Note reusable utilities and patterns.
4. Estimate complexity: low / medium / high.

### 2b. Produce plan

Structure: **Summary** (1 paragraph) · **Files to create/modify** ·
**Approach** (ordered steps) · **Patterns to follow** · **Risks** ·
**Verification commands** · **Complexity**.

### 2c. Review gate

**`review_mode=human`:**

- If `issue_number` provided: post plan as issue comment starting with
  `## Implementation Plan` and a note that approval is required.

  ```bash
  gh issue comment <issue_number> --body "<plan markdown>"
  ```

  Set `plan_comment_url` output. Replace `in-progress` with `needs-review`:

  ```bash
  gh issue edit <issue_number> --remove-label "in-progress" --add-label "needs-review"
  ```

- If no issue: print the plan to stdout.
- **Halt.** Inform the developer to re-invoke with `skip_to=implement` after
  approving the plan. Do not proceed.

**`review_mode=auto`:**

- Invoke a second agent instance (review role model from the active profile).
  Provide: original task requirements + the plan. Ask: does the plan
  completely and safely satisfy the requirements? Respond APPROVED or
  REJECTED with specific critique.
- If APPROVED: proceed to step 3.
- If REJECTED: incorporate critique and produce a revised plan. Increment
  iteration counter. If `max_plan_iterations` reached, stop with error:
  "Plan could not be approved after N iterations. Last critique: <critique>."

---

## 3. Implementation loop

If entering via `skip_to=implement`: restore `in-progress` label (if
`issue_number` provided) and proceed.

Repeat up to `max_impl_iterations`. Load the model defined for the `implement`
role in the active profile.

### 3a. Implement (inside worktree)

Working strictly inside `worktree_path`:

1. Follow the approved plan step by step.
2. Stage and commit each logical slice — never `git add .`.
   See [../../docs/shared/iterative-commits.md](../../docs/shared/iterative-commits.md).
3. Push after every commit.

### 3b. Validate

After each implementation pass, run from the repo root using the worktree's
files, with a namespaced docker project to avoid collisions with other
concurrent agent sessions:

```bash
COMPOSE_PROJECT_NAME=<TASK_SLUG> \
  make -C $(git rev-parse --show-toplevel) check
```

`COMPOSE_PROJECT_NAME=<TASK_SLUG>` ensures all containers and networks created
during this validation are unique to this agent session. Never omit it when
running `make check` from inside a worktree.

**After each push to the remote branch:**

1. Confirm the PR is no longer conflicting:

   ```bash
   gh pr view <PR_NUMBER> --json mergeable,mergeStateStatus
   # expect: mergeable=MERGEABLE
   ```

   If still `CONFLICTING`, resolve conflicts before proceeding (see
   [PR-aware task guidance](#pr-aware-task-guidance)).

2. Wait for all required status checks to reach `COMPLETED`:

   ```bash
   gh pr checks <PR_NUMBER>
   ```

   Do not advance until every required check shows `SUCCESS`. For checks that
   are `FAILURE` or `TIMED_OUT`, read the log URL from the output and diagnose
   the root cause before returning to step 3a.

If local and remote checks pass, update the heartbeat (`step: impl-validated`)
and proceed to step 4.

If checks fail:

- Capture the full error output.
- Update heartbeat (`step: impl-validation-failed`).
- Increment iteration counter.
- Feed errors back to the implement agent with instruction to fix.
- If `max_impl_iterations` reached, stop with error: "Validation failed after
  N iterations. Last errors: <output>." Release the lock file before exiting.

---

## 4. Validation pass

Load the model defined for the `validate` role in the active profile.

The validation agent reviews the final state of the worktree:

1. Does the implementation satisfy all acceptance criteria from the task?
2. Are tests added or updated?
3. Are docs updated (if user-facing behavior changed)?
4. No secrets staged; no debug artifacts left in.

If validation fails, return to step 3 with the validation agent's critique.
Count against `max_impl_iterations`.

---

## 5. Ship or stop (controlled by `local_only`)

Update heartbeat: `step: ship`.

### If `local_only=true`

Stop here. Do **not** invoke `ship-changes`. Print a completion summary:

- Worktree path
- Branch name
- Last commit SHA and message
- Validation result
- Instructions for the developer to review the worktree and push when ready

Release the lock file (`rm <worktree_path>/.agent-lock`). Leave the heartbeat
in place for observability. Leave the worktree intact for manual review.

Set `pr_url` to empty string.

### If `local_only=false`

Delegate to the `ship-changes` skill with `issue_number` (if available) and
`dry_run=false`. That skill handles: PR creation, CI wait, squash-merge, and
worktree cleanup.

Set `pr_url` output from the result of `ship-changes`.

After successful merge:

- Remove `in-progress` label (if present):

  ```bash
  gh issue edit <issue_number> --remove-label "in-progress"
  ```

- Confirm worktree cleanup:

  ```bash
  make worktree-cleanup ISSUE_NUMBER=<issue_number>
  ```

- Release the lock file: `rm <worktree_path>/.agent-lock`

---

## On any unrecoverable failure

Before exiting on error at any step:

1. Update heartbeat: `step: failed — <step-name>`.
2. Release the lock file: `rm <worktree_path>/.agent-lock`.
3. If `issue_number` provided, remove `in-progress` and add `blocked`:

   ```bash
   gh issue edit <issue_number> \
     --remove-label "in-progress" --add-label "blocked"
   ```

4. Report the failure with the last heartbeat step and full error context so a
   developer or a future agent session can resume from the right point.

---

## Definition of done

**`local_only=false`:**

1. Implementation passes `make check` without errors.
2. All acceptance criteria from the task/issue are met.
3. PR has `mergeable: MERGEABLE` — no conflict markers remain.
4. All required PR status checks report `SUCCESS` (`gh pr checks <PR_NUMBER>`).
5. PR is squash-merged to `main`.
6. No orphaned worktrees remain (`make audit-worktrees`).
7. Lock file is removed. `in-progress` label is removed (if issue-backed).

**`local_only=true`:**

1. Implementation passes `make check` without errors.
2. All acceptance criteria from the task/issue are met.
3. Worktree is left clean and ready for developer review.
4. Lock file is removed. Heartbeat reflects final step.
