# AGENTS.md - Intent-Driven Portal (IDP)

## Purpose

This file is the operating manual for coding agents working in this repo. Follow it first, then the codebase conventions.

## Roadmap Alignment

- Treat [ROADMAP.md](ROADMAP.md) as the target-state capability map, not as
  proof that a capability already exists in the repo.
- When work is described as "roadmap-driven", prefer the smallest end-to-end
  slice that produces a real contract, runnable behavior, docs, and
  verification in the current repository.
- When updating docs or user-facing copy, explicitly separate implemented
  behavior from planned capability direction so readers are not misled.
- Defer plug-in, external-system, or governance expansion until the repo has a
  concrete contract and runnable slice for that area.

## Important Long-Lived Decisions (ADR Guardrails)

To avoid documentation bloat and context explosion, only record decisions in
`docs/content/architecture/decisions/` when they are expected to be long-lived and expensive to
reverse (architecture boundaries, contracts, runtime conventions, security baselines).

Current high-signal ADRs agents must respect:

- `0001` layered intent/contract/implementation architecture.
- `0002` stack layout and required GNU Make target contract.
- `0003` implementation-agnostic TypeScript contract harness and runtime port contract.
- `0004` implementation portfolio and support tiers (Go default/reference,
  TypeScript and React-first support path, bootstrap transition rules).
- `0005` shared capability contract and profile-based conformance model.
- `0006` cross-platform local runtime UX baseline (loopback defaults,
  stable executable identity for compiled stacks).
- `0007` moon-required orchestration and proto-enhanced pinned toolchain policy.
- `0009` Gherkin as the Layer 1 intent specification format (`tests/features/*.feature`
  files are ground truth; the TypeScript harness in `tests/src/profiles/` is derived
  from them — when they disagree, the `.feature` file wins).
- `0011` IETF health endpoint contract (`/health` and `/readiness` paths,
  `application/health+json` media type, `pass`/`fail`/`warn` status values
  per `draft-inadarei-api-health-check-06`; applies to all hosted services).
- `0012` moon/proto Python-uv integration constraint (use `unstable_python` and
  `unstable_uv` moon toolchains mapped via `.prototools [plugins.tools]`;
  avoid unsupported direct `python`/`uv` moon toolchain IDs).

When proposing a new ADR, include a short rationale for why the decision is
long-lived, cross-cutting, and not better captured in regular docs.

Use this intake threshold before adding an ADR:

- At least 3 of these 5 gates are true: cross-cutting scope, costly to reverse,
  contract surface, multi-quarter longevity, drift risk.
- At least one true gate must be either costly to reverse or contract surface.
- If the threshold is not met, document in regular docs instead of
  `docs/content/architecture/decisions/`.

**Long-lived documentation reference rule.** ADRs (`docs/content/architecture/decisions/`) and other long-lived documentation (for example `docs/content/flow/`) must not reference short-term artifacts such as GitHub issues, pull requests, milestones, project cards, or commit SHAs. If the content of a short-term artifact is valuable, integrate it into the documentation directly. Cross-references inside long-lived docs must point to other long-lived canonical artifacts — file paths inside this repository, other ADRs, or stable external specifications. Short-term project-management artifacts (issue comments, PR summaries, release notes, changelog entries) may reference issues because they are themselves short-term.

## Multi-Agent Collaboration (Priority Context)

Multiple agents may work in this repo concurrently. Each agent operates independently but must assume others are making changes in parallel.

### Cooperative defaults

- Assume other agents are acting in good faith and following these same rules.
- Prefer cooperative, additive changes over defensive guards against other agents' work.
- Trust that concurrent agents are scoped to their own issues/branches; avoid re-validating their output unless you have direct evidence of breakage.
- Minimize re-work: if a file or artifact already satisfies a requirement, do not re-generate or overwrite it.

### Iterative and minimal changes

- Make the smallest change that satisfies the current task. Do not refactor or reorganize unrelated code.
- Prefer appending or patching over rewriting. Wholesale rewrites increase merge conflicts and wasted effort.
- Commit atomically and frequently so concurrent agents can rebase cleanly.
- Do not try to hold an entire implementation in memory before editing files
  and committing. Break the work into the smallest useful step, apply it,
  commit it, and then plan the next step from the newly-committed state.
- It is expected and healthy to change a file one way, learn that a
  different approach is required, and then update it again in a follow-up
  commit. Rely on source control for iteration — do not try to land the
  "perfect" version in a single edit.

### Real-time adaptation

- Before editing any file, re-read it to capture the latest state; do not rely on a cached version from earlier in the session.
- After completing a change, verify the final state on disk before reporting done.
- If a conflict or unexpected state is detected, stop and comment on the issue rather than guessing a resolution.

### Protecting unique work

- Scope branches tightly to the issue at hand. Avoid touching files outside the issue scope.
- If a required shared file (for example `package.json`, a Makefile, or a workflow) must change, note the change in the issue comment so other agents can rebase.
- Do not silently revert or overwrite another agent's recent commit. Surface conflicts explicitly.

### Issue Worktree Isolation

- Planning, issue triage, and read-only exploration may run from the main checkout.
- Issue-scoped implementation and shipping should run from a canonical repo-local worktree rooted at `.agents/worktrees/`.
- The canonical issue worktree path is `.agents/worktrees/issue-<number>-<slug>`.
- The canonical issue branch name is `issue/issue-<number>-<slug>`.
- Use the repo-local helpers and root tasks to resolve, create, reuse, clean up, and audit issue worktrees rather than ad hoc `git worktree` commands.
- Reuse an existing canonical issue worktree for the same issue when it already exists.
- If you are in another issue worktree, stop and surface the conflict instead of creating a second active checkout from there.
- If the current checkout is dirty and you are not already in the matching issue worktree, stop and resolve that state before creating or reusing a worktree for another issue.
- Automatic cleanup is allowed only after successful merge confirmation and only for clean issue worktrees. Dirty or ambiguous worktrees must be reported and audited rather than deleted blindly.
- All worktree paths must remain inside the repository root. Do not create sibling-directory or parent-directory worktrees.

### Branch Hygiene

Agent-created branches must not accumulate without corresponding open pull
requests. The weekly branch cleanup workflow removes orphaned zero-commit
branches, but agents are responsible for not creating branches they do not need.

- Planning, triage, review, and read-only skills run from the main checkout
  and must not create branches.
- If the agent runtime automatically creates a branch at session start, the
  skill must detect this and delete the branch before completing when no
  commits were made and no PR was opened from it.
- Any non-exempt branch with zero commits ahead of `main` and no open PR is
  considered orphaned. The automated weekly cleanup workflow will delete it.
- Do not create multiple branches for the same issue. Repeated invocations
  that produce branch names like `fix/foo-again` or `fix/foo-another-one`
  signal a process failure, not a workflow pattern. Stop and reconcile the
  existing branch instead.
- Exempt from cleanup: `main`, `master`, and any branch matching the prefix
  `release-please--`.

## Iterative Small Commits (Required)

Source control is the agent's working memory. Use it instead of trying to
plan, implement, and perfect a large change in a single edit pass.

### Commit on every meaningful step

- Commit after every meaningful step: a new file created, an existing file
  edited, or a file deleted. "Meaningful" is small — a single file change
  that leaves the repo in a coherent state is enough.
- Prefer many small commits on a feature branch over one large commit.
  Small commits are easier to review, revert, rebase, and reason about.
- Stage and commit related files together when they only make sense as a
  unit (for example, a generated artifact and the source that produced it).
  Otherwise, commit each change on its own.
- Run the relevant lint/test/validation for the touched scope before the
  commit when it is cheap to do so; rely on follow-up commits to fix
  issues surfaced by broader validation later in the loop.

### Do not hold the whole change in memory

- Do not accumulate edits across many files before writing any of them to
  disk. Edit, save, and commit in small slices so the working tree always
  reflects the latest decision.
- Re-read a file just before editing it, even if you edited it earlier in
  the same session. Your mental model goes stale; the commit history and
  the file on disk are ground truth.
- When a task looks too large to commit in one step, split it into a
  sequence of small commits (scaffolding → wiring → behavior → docs → tests,
  or similar). Land each slice before planning the next.

### Iterate through commits, not through rework

- It is expected and normal to change a file one way, learn that a
  different approach is required, and then update it again in a later
  commit. Do not treat the first attempt as wasted work — the earlier
  commit is a checkpoint that makes the revision safe.
- Prefer a follow-up commit (`fix:`, `refactor:`, or a squash at merge)
  over silently rewriting an earlier commit. Other agents and reviewers
  may already be reading the intermediate state.
- If a direction turns out to be wrong, revert or adjust with a new
  commit. Do not force-push to erase the exploration from history on a
  shared branch.

### Delete and move with commits too

- Deleting a file is a change worth committing on its own. Do not bundle
  unrelated deletions into a larger feature commit.
- Renames and moves should be committed separately from behavioral
  changes so git can detect the rename cleanly and reviewers can see the
  intent of each step.

## Core Principles

- Secure by default: zero-trust, least privilege, no secrets in code, TLS 1.3+.
- Container-first: everything should run in containers; include Dockerfiles for services.
- AI-first and MCP-first: expose new capabilities via MCP tools alongside APIs.
- Extensible via plug-ins: design clear extension points and sandboxed execution.
- Multi-tenant SaaS ready and self-hostable from day one.

## Cross-Platform Developer Experience (Required)

- Local developer startup must be smooth on Windows, macOS, and Linux.
- Default local `run-web` and `run-bff` behavior should prioritize loopback
  binding (`127.0.0.1`) to reduce OS firewall interruptions and accidental LAN
  exposure.
- Network exposure for LAN, container, or remote-device testing must be explicit
  and opt-in via documented environment overrides.
- Compiled-language stacks should avoid ephemeral executable paths for default
  local run targets on Windows (for example repeated `go run` temp executables);
  prefer stable repo-local binary paths.
- On Windows, prefer PowerShell-native commands for Windows-first workflows and
  an explicit Git Bash path for Bash-based repo helpers; do not rely on a bare
  `bash` resolution because it may point to WSL or another unintended runtime.
- On Windows PowerShell, when an interactive Bash shell is needed, first try
  `& "C:\Program Files\Git\bin\bash.exe" --login -i` before relying on a plain
  `bash` resolution that may point at an unintended environment.
- When a reusable helper would otherwise require separate Bash and PowerShell
  implementations, prefer one portable Python or Node.js script with thin task
  wrappers instead of maintaining duplicate shell logic.
- Do not prefix Bash tool commands with `cd <path> &&`. The working directory
  is already the repository root. Prefixing with `cd` breaks permission
  allowlist patterns (e.g. `Bash(git *)` will not match `cd ... && git ...`).
  If a command needs to run in a subdirectory, either use a separate `cd`
  command first or pass absolute/relative paths as arguments to the tool.
- Platform caveats and first-run behavior must be documented alongside run
  commands for each stack.

## Issue-Driven Workflow (Required)

- Start from a GitHub Issue; no untracked work.
- Use any available GitHub API channel for issue/PR operations (GitHub MCP tools, `gh` CLI, or direct REST API — see **GitHub API Access Priority** below).
- Only work on authorized issues from `@idp-admin` or `@idp-maintain`.
- If external, add `needs-triage` and request maintainer review.
- Comment on the issue for key decisions, blockers, or scope changes.
- Link related PRs, issues, or references as comments on the original issue as work progresses so stakeholders can follow the trail.
- When beginning implementation on an approved issue, add the `in-progress` label to signal active work.
- Before implementation for an approved issue, create or reuse the canonical issue worktree via the repo-local worktree helper flow. Planning remains non-mutating and may stay in the main checkout.

### Draft-to-Ready PR Lifecycle

Pull requests should follow a two-phase validation strategy using
GitHub's built-in draft PR status:

1. **Create PRs as drafts** (`gh pr create --draft` or MCP
   `create_pull_request` with `draft: true`). Draft PRs trigger only
   lightweight CI checks (change detection, markdown lint, commit
   message validation) for early feedback.
2. **Mark PRs ready for review** (`gh pr ready` or MCP
   `update_pull_request` with `draft: false`) once local validation
   passes. This triggers the full CI pipeline (stack validation,
   container builds, integration tests).
3. Agents must mark PRs ready-for-review before completing their work
   and requesting human review. Do not leave PRs in draft status when
   handing off to a maintainer.

This lifecycle is enforced by draft-aware `if` conditions in the
`pr-validate.yml` and `container-build.yml` workflows.

### Triage Model

The Issue Triage workflow (`.github/workflows/issue-triage.yml` plus
`scripts/ci/issue-triage.sh`) applies labels automatically, but its behavior
is deliberately narrow so maintainer overrides are not reverted.

- The workflow fires only on `opened`, `reopened`, and `edited` — never on
  `labeled`. This is intentional: it means manual label changes by maintainers
  are authoritative and will not be stomped by a re-run of the triage script.
- On `opened` and `reopened`, the workflow checks whether the issue author is
  a member of `@ourchitecture/idp-admin` or `@ourchitecture/idp-maintain` and
  applies either `ready` (team member) or `needs-triage` (external contributor)
  accordingly. Team membership is read via the `IDP_TRIAGE_TOKEN` secret, which
  must carry `read:org` scope for the `ourchitecture` organization; the default
  `GITHUB_TOKEN` cannot read team membership and will incorrectly treat every
  author as external.
- On `edited`, the workflow refreshes only form-field labels (priority, domain,
  task type, agent eligibility) from the issue body. It never touches
  `ready` or `needs-triage`, so maintainers can safely override them.
- Maintainers can move an issue from `needs-triage` to `ready` at any time by
  editing the label directly. No workflow will undo that change.

### Two Independent Transport Channels

Git operations (`commit`, `push`, `pull`) use the local git proxy and
the git protocol. GitHub API operations (PR creation, issue comments,
label updates) can be performed via any available channel: GitHub MCP
tools (if present in the tool set under any prefix such as
`mcp__github__*` or `github-mcp-server-*`), the `gh` CLI (if installed
and authenticated), or direct GitHub REST API calls. These channels are
independent from git — any one can be available while others are not. It
is therefore valid and expected to commit and push while GitHub API
access is unavailable; this is not a logical inconsistency. It does,
however, leave a partial state that must be completed as soon as any
GitHub API channel becomes available.

### Operation Sequencing

GitHub API operations that follow a git push must always be completed
in the same uninterrupted sequence when possible:

1. `git push` — always works via the git protocol.
2. Validate that the branch is visible on GitHub before creating a PR:
   list branches via any available GitHub API channel and retry with
   exponential backoff (2 s, 4 s, 8 s, up to 4 attempts) if the branch
   is not yet visible. The local proxy may have a small propagation lag.
3. Create the PR via any available GitHub API channel.
4. Update the issue via any available GitHub API channel — remove
   `in-progress`, add `needs-review`, or close if the PR body contains
   `Closes #N`.
5. Post an issue comment summarising the work done.

If any step in the sequence fails, record exactly which steps completed
and which did not. Do not leave the issue in a stale label state (e.g.,
`in-progress` without a PR, or `needs-review` without a comment).

### Commit Closure Language

Always use `Closes #N` in the commit footer — not `Refs #N` — when all
acceptance criteria for an issue are met. Never downgrade to `Refs`
because of GitHub API unavailability at commit time; the commit message
must reflect the intent of the change, not the transient availability of
a tool.

### GitHub API Access Priority

When performing any GitHub API operation (adding labels, posting
comments, creating PRs, reading issue data), use the first available
channel in priority order:

1. **GitHub MCP tools** — check whether any `mcp__github__*`,
   `github-mcp-server-*`, or similarly prefixed tools are present in the
   active tool set. Different agent environments may surface these under
   different prefixes; probe for them before concluding they are absent.
2. **`gh` CLI** — if `gh` is installed and authenticated (`gh auth
   status`), use it as a capable fallback for the most common GitHub API
   operations (issues, PRs, labels, comments). Prefer `gh` commands over
   raw REST calls for better token handling and ergonomics.
3. **Direct GitHub REST API** — if a `GITHUB_TOKEN` or equivalent
   credential is available in the environment, call the GitHub REST API
   directly using a secure token-passing method (e.g., store the token
   in a file and pass it via `--header @token-file`, or use an
   environment variable only within a trusted script context — never
   expose raw tokens in shell history or command arguments).
4. **Surface and continue** — if no channel is available, output the
   full ready-to-use content the user would need to perform the action
   manually and maintain a pending-operations list. Do not stop all
   work; continue any local operations that do not require GitHub API
   access.

### When No GitHub API Channel Is Available

If all channels above have been tried and none work:

- Continue any local work (edits, commits, pushes via `git`) that does
  not require GitHub API access — those operations work regardless.
- When blocked on a GitHub operation (PR creation, issue comment,
  label assignment), output the full ready-to-use content the user
  would need to perform the action manually:
  - For a PR: the exact title and body text.
  - For an issue comment: the exact comment text.
- Maintain an explicit pending-operations list in the response so the
  user can track what is still outstanding.
- Resume ALL pending GitHub operations as the very first action once
  any GitHub API channel becomes available. Do not answer other
  questions or take other actions first.

### MCP Transient Failure Retry

For transient MCP errors (HTTP 5xx, network timeout, rate limit) that
are distinct from full server disconnection:

- Retry up to 4 times with exponential backoff: 2 s, 4 s, 8 s, 16 s.
- Log each attempt: `MCP operation <name> failed (attempt N/4): <error>`.
- After 4 failures, fall back to the next available GitHub API channel
  (see **GitHub API Access Priority** above) before surfacing the error
  to the user.
- Do NOT retry on 4xx client errors (invalid input, not found,
  permission denied) — those require human intervention.

### GitHub API Validation Before PR Creation

A successful `git push` to the local proxy does not mean the branch is
immediately visible via the GitHub REST API. The proxy syncs to GitHub
asynchronously, so the GitHub API may not show the branch for several
seconds after the push returns. Always confirm the branch is present
before attempting PR creation — do not assume the push and the API view
are in sync.

Before creating a pull request via any GitHub API channel:

1. List branches via your available GitHub API channel and look for the
   head branch.
2. If absent, wait and retry with exponential backoff (2 s, 4 s, 8 s,
   16 s, up to 4 polls). The expected cause is normal propagation lag
   from the local proxy to GitHub — not a push failure.
3. Only proceed once the branch is confirmed present. If absent after
   4 polls, surface the blocker and stop — do not attempt to create the
   PR against a branch GitHub cannot see.

### CI Check Failure Debugging

The GitHub MCP tools expose check-run **metadata** (conclusion, status,
timestamps, URLs) but **cannot retrieve raw job log output**. The log
download endpoint exists in the GitHub REST API but is not surfaced by
the available MCP tools.

**Required behaviour when a CI check fails:**

1. Call `pull_request_read` with `method: get_check_runs` to identify
   which job failed and its conclusion.
2. **Immediately ask the user for the relevant log lines.** Do not
   attempt to guess the failure cause from metadata alone — this wastes
   rounds and leads to incorrect speculation.
3. Once the user provides log output, diagnose from that content and act.

Do not spend multiple tool calls speculating about failure causes that
are directly visible in the job log. A single question — "can you share
the failing log lines?" — is always faster than inferring from timing,
metadata, or code inspection.

## CI/CD and Make Reuse (Required)

- The authoritative call hierarchy is: `make target` -> `moon run project:task`
  -> real tool command (`go`, `npm`, `mvnw`, `docker`, etc.). Moon tasks carry
  the real commands; Makefile recipes are thin wrappers that delegate to moon
  when available and fall back to direct commands for contributors without moon.
- No `moon.yml` task should contain `command: ["make", "..."]`. Moon is the
  canonical task runner; make wraps moon, not the other way around.
- `moon` is required for maintainer and CI orchestration flows.
- `proto` should be used to provide pinned, reproducible maintainer/CI toolchain
  installs, but contributors may use system-installed language toolchains.
- GNU Make targets are **optional convenience wrappers** for common local
  workflows. Contributors are not required to use them; direct `moon`, `npm`,
  or language-toolchain commands are equally valid. Make targets must stay in
  sync with their `moon`/script equivalents and must not duplicate logic that
  diverges from the canonical command.

- PR validation must be path-aware and run the minimum meaningful checks for the
  changed scope.
- For open-source/external pull requests, prefer careful, lower-cost validation
  by default; run expensive full-system checks only when shared or
  cross-cutting paths change.
- Any CI/CD command that developers should be able to reproduce locally must be
  exposed through GNU Make targets and/or repo scripts (for example
  `scripts/ci/`).
- **Workflow script policy (strictly required):** GitHub Actions `run:` steps
  must not contain significant scripting logic. Any `run:` block with more than
  3 lines of shell, or any logic that is reusable across steps or workflows,
  **must** be extracted to a script in `scripts/ci/`. Permitted inline uses are
  limited to:
  - A single delegating command (`moon run`, `make`, `bash scripts/ci/foo.sh`).
  - Environment variable forwarding required before calling a script or tool
    (e.g., `export VAR=...`).
  - Writing to GitHub Actions output files (`$GITHUB_OUTPUT`,
    `$GITHUB_STEP_SUMMARY`) when the value is a single literal string, not a
    computed result.
  - A GitHub-Actions-only built-in that has no local equivalent.
  Inline scripts are not acceptable when the same logic appears in more than
  one step or workflow, the logic is locally testable, or the block exceeds 3
  lines of shell. New workflows that violate this rule will be rejected in
  review.
- Scripts in `scripts/ci/` must be executable (`chmod +x`), accept inputs
  exclusively via environment variables, and produce correct output when invoked
  directly from a developer's terminal. Scripts that write to `$GITHUB_OUTPUT`
  or `$GITHUB_STEP_SUMMARY` must accept the path via an `OUTPUT_FILE`
  environment variable and default to `/dev/stdout` for local execution.
- **Workflow permissions (strictly required):** Every GitHub Actions workflow
  file **must** declare an explicit top-level `permissions:` block. Relying on
  the repository default is not acceptable. Apply the principle of least
  privilege: grant only the permissions the workflow actually needs, and nothing
  more. Workflows missing an explicit `permissions:` block will be rejected in
  review. When a workflow needs no GitHub API access at all, use
  `permissions: {}` to explicitly revoke all permissions.
- Validation and test commands in Makefiles should use `check-` prefixed
  targets (for example `check-lint-md`, `check-test`, `check-contract`).
- Use `check-lint-md` as the canonical Markdown lint target name (not
  `lint-md`).
- Keep GNU Make targets as compatibility wrappers so local workflows remain
  accessible even when moon is the canonical CI/maintainer orchestrator.
- **Never invoke tools via `npx <tool>` directly** when a `moon` task or `make`
  target exists for that tool. Always prefer the canonical task (for example,
  use `moon run repo:check-lint-md` or `make check-lint-md` — never
  `npx markdownlint-cli2`). Direct `npx` calls bypass the pinned toolchain,
  ignore project configuration resolution, and may produce different results
  than CI.
- The `pr-validation-result` aggregating job is a required status check
  enforced by GitHub rulesets on the `main` branch.

## Documentation Requirements (Required)

Documentation must be updated alongside code for child projects, reference
implementations, and any additional functionality. Keep docs minimal but
operationally complete.

- Every new or updated guide must start with a brief, non-technical statement
  of why the solution exists before technical details.
- Keep documentation audience-specific and discoverable from a docs entry map
  (for example, top-level `README.md` and/or a `docs/` index page).
- Do not leave runnable code paths undocumented; include minimum prerequisites
  and validated run steps.

### Required Audience Paths

- Brief overview and getting started for newcomers (non-technical first, then
  technical quickstart).
- Expert shortcut links to deep technical resources (ADR index, contracts,
  architecture, runbooks).
- General user guide.
- Developer implementation guide.
- Operations guide.
- Security guide.
- Contributor guide with both non-technical and technical contribution paths.

### Minimum Prerequisite and Runtime Documentation

For each runnable stack, child project, or major component, document:

- Required tools and supported versions.
- Required access and setup assumptions.
- Environment variables, defaults, and where to set them (never commit
  secrets).
- Install, run, lint, and test commands.
- Default ports and override behavior.
- Platform-specific caveats (especially Windows, macOS, Linux differences).

### Additional Required Operational Documentation

- Configuration reference (inputs, defaults, and examples).
- API/contract reference for externally consumed interfaces.
- Troubleshooting and known issues.
- Release lifecycle docs (changelog expectations, upgrade notes, deprecation
  policy, support window).
- Ownership and support model (maintainers, escalation path, issue labels).
- Testing and verification guide (what "done" means and how to validate).
- Glossary for cross-functional readers where domain terms are non-obvious.

### Documentation Definition of Done

- Documentation updates are included in the same change as code whenever
  behavior, setup, operations, or interfaces change.
- Docs entry map links are updated so new material is discoverable.
- Commands in docs are copy/paste ready and validated.
- Markdown lint passes for changed documentation files.
- If no documentation update is needed, capture explicit rationale in the PR or
  issue.

## Build, Lint, Test Commands

This repo defines reusable GNU Make targets as **optional convenience wrappers**
for common local workflows, alongside canonical `moon` and `npm` commands.
Contributors may use any of the following interchangeably; `make` targets are
not required but are always kept in sync with their `moon`/script equivalents.

- Install deps: `npm install`
- Install pinned toolchain (recommended): `proto install`
- Run privacy and secret scanning (moon canonical): `moon run repo:check-privacy`
- Run privacy and secret scanning (make shortcut): `make check-privacy`
- Show moon project graph and tasks: `moon project <project-id>`
- Lint Markdown (make shortcut): `make check-lint-md`
- Lint Markdown (moon canonical): `moon run repo:check-lint-md`
- Lint workflow files (make shortcut): `make check-lint-workflows`
- Resolve issue worktree path (moon canonical): `moon run repo:worktree-path`
- Resolve issue worktree path (make shortcut): `make worktree-path`
- Create or reuse issue worktree (moon canonical): `moon run repo:worktree-ensure`
- Create or reuse issue worktree (make shortcut): `make worktree-ensure`
- Clean up issue worktree after merge confirmation (moon canonical): `moon run repo:worktree-cleanup`
- Clean up issue worktree after merge confirmation (make shortcut): `make worktree-cleanup`
- Audit repo-local issue worktrees (moon canonical): `moon run repo:audit-worktrees`
- Audit repo-local issue worktrees (make shortcut): `make audit-worktrees`
- Compute PR change-based validation plan:
  `BASE_SHA=<sha> HEAD_SHA=<sha> make check-pr-changes`
- Run Go web server (npm): `npm run start:web`
- Run Go web server (make shortcut): `make run-web`
- Run Go BFF server (npm): `npm run start:bff`
- Run Go BFF server (make shortcut): `make run-bff`
- Run React web server (npm): `npm run start:web:react-fastify`
- Run React BFF server (npm): `npm run start:bff:react-fastify`
- Run contract tests (npm): `npm run test:contract`
- Start default stack web + BFF (make shortcut): `make dev`
- Test running system (make shortcut): `make test`
- Run full build/test verification for all detected stacks (make shortcut): `make all`
- Run CI-safe affected-aware checks for all stacks (make shortcut): `make ci`
- Run CI-safe checks via moon directly (moon canonical): `moon ci go-net-http-rest:check-ci nodejs-react-fastify-rest:check-ci docs-site:check-ci`
- Install npm deps explicitly (moon canonical): `moon run repo:install`
- Run docs site dev server (moon canonical): `moon run docs-site:run-dev`
- Build docs site (make shortcut): `make -C docs build`
- Run full docs site validation (make shortcut): `make docs-site`
- Generate docs architecture diagrams (moon canonical): `moon run docs-site:generate-diagrams`
- Generate docs architecture diagrams (make shortcut): `make -C docs generate-diagrams`
- Validate docs diagram generation (moon canonical): `moon run docs-site:check-diagrams`
- Validate docs diagram generation (make shortcut): `make -C docs check-diagrams`
- Run MCP server in HTTP mode (make shortcut): `make -C tools/mcp run-http`
- Run MCP server CI checks (moon canonical): `moon run mcp-tools:check-ci`
- Build MCP server container (make shortcut): `make -C tools/mcp build-container`
- Run MCP server contract tests (make shortcut): `make -C tools/mcp check-contract`

> **Docs install note**: The docs `npm ci` skips puppeteer's bundled Chrome
> download (`PUPPETEER_SKIP_DOWNLOAD=true` is set in `docs/Makefile`). The
> `check-diagrams` target auto-detects the system Chrome at runtime via
> `PUPPETEER_EXECUTABLE_PATH` or standard binary names (`google-chrome-stable`,
> `chromium`, etc.). If diagram generation fails locally, set
> `PUPPETEER_EXECUTABLE_PATH=/path/to/chrome` before running the make target.

Moon project IDs currently used:

- `repo`
- `go-net-http-rest`
- `nodejs-react-fastify-rest`
- `contract-tests`
- `docs-site`
- `mcp-tools`
- `vscode-extension`
- `backstage-tools`

Stack-level Makefile targets (from `stacks/<stack>/Makefile`).
All are **optional convenience wrappers**; equivalent `moon` task invocations
are equally valid.

- `make all` runs install, build, lint, tests, and contract checks for that stack.
- `make install` installs dependencies for that stack.
- `make build` builds stack artifacts.
- `make clean` removes stack build artifacts.
- `make check-lint` runs stack linters.
- `make check-test` runs stack tests.
- `make check-contract` runs stack contract checks.
- `make check-ci` runs CI-safe validation checks for the stack.
- `make check` runs lint, tests, and contract checks for that stack.
- `make test` is a stack-defined test alias (at minimum `check-test`).
- `make test-contract` is a stack-defined alias for `check-contract`.
- `make run-web` starts the web server for that stack.
- `make run-bff` starts the BFF server for that stack.
- `make build-container-web` builds the web container image (requires docker).
- `make build-container-bff` builds the BFF container image (requires docker).
- `make build-containers` builds all container images for that stack (requires docker).

Container targets (root Makefile):

- Build all containers for all stacks: `make build-containers`
- `make all` silently skips container builds when docker is not in PATH.

Container targets (tests/Makefile):

- `make -C tests build-container` builds the contract test container image.
- `make -C tests run-container` runs the contract test container.

Notes:

- Markdown lint config: `.markdownlint.jsonc` and `.markdownlint-cli2.jsonc`.
- No test scripts are defined yet. If you add tests, add scripts and document them here.
- Docker is **not** managed by proto; do not add docker to `.prototools`.
  Docker (or a compatible runtime like Rancher Desktop with dockerd/moby) must
  be installed separately by the developer. Container build targets are opt-in
  and fail loudly if docker is absent.

## Repository Boundary (Required)

Agents must never navigate, read, write, or execute commands outside the
repository root. This rule applies regardless of where the repository is cloned.

- The repository root is the directory that contains this `AGENTS.md` file and
  the `.git/` directory. Determine it with `git rev-parse --show-toplevel` when
  needed; never hard-code an absolute path.
- Do not traverse to parent directories (for example `../`, `../../`) of the
  repository root. Tools such as file search, glob, read, and bash must be
  constrained to paths at or below the repository root.
- Do not read, copy, or reference config files from the host machine or from
  sibling repositories (for example a `.markdownlint.jsonc` in a parent
  directory). Use only the config files that exist inside this repository.
- If a tool or command unexpectedly resolves a path outside the repository root,
  treat it as an error, stop, and report it rather than proceeding.

## Validation and Verification

Agents must validate that requested changes actually took effect and report evidence.

- Re-check file system changes after moves/deletes (re-list directories to confirm).
- Avoid assumptions; verify by reading or listing the affected paths.
- Call out any leftover empty directories and remove them when safe.
- If a request mentions a specific path, confirm it exists (or is removed) explicitly.
- When you claim cleanup or refactors, show the resulting layout in the response.

## Code Style Guidelines

### General

- Match existing patterns in the repo before introducing new ones.
- Default to ASCII and keep diffs focused and minimal.
- Prefer clarity over cleverness; avoid magic behavior.
- Keep public APIs versioned; document any schema changes.

### Imports

- Order imports: standard libs, third-party, internal modules.
- Use type-only imports when supported.
- Avoid deep relative paths; prefer module-level entry points.

### Formatting

- Follow existing formatting; do not reformat unrelated code.
- Markdown must pass markdownlint; long lines are allowed.
- Use consistent indentation and line endings within a file.
- Keep this file markdownlint-compliant when editing (proper headings, blank lines, list spacing).
- In Makefiles and shell snippets, always wrap executable paths and executable
  variables in double quotes to handle spaces on Windows Git Bash and similar
  environments (example: `"$(MAKE)" -C "$(STACK)" run-web`).

### Types

- Prefer explicit types at module boundaries and public APIs.
- Avoid `any`; use narrow types and discriminated unions.
- Use `unknown` with validation for external input.

### Naming

- `camelCase` for variables/functions, `PascalCase` for types/classes.
- `SCREAMING_SNAKE_CASE` for true constants.
- Use intent-revealing names; avoid abbreviations unless common.

### Error Handling

- Fail fast on invalid input; validate boundaries.
- Wrap external errors with context; do not swallow exceptions.
- Return structured error info for APIs; avoid leaking secrets.

### Logging and Observability

- Use structured JSON logs with correlation IDs.
- Avoid logging secrets or PII.
- Prefer OpenTelemetry-friendly patterns for tracing.

## Security Rules

- Never commit secrets, credentials, or environment-specific configs.
- Do not bypass auth/permission checks for convenience.
- Prefer secure defaults; document any exceptions.
- All container builds must emit OCI labels plus SBOM and provenance attestations; keep `sbom`/`provenance` enabled in release workflows and carry labels into final images.
- Review SBOM findings and remediate or document any High/Critical issues before releasing containers.
- Run dependency and container vulnerability scans when changes affect dependency graphs, executable behavior, or Dockerfiles (for example manifests/lockfiles, runtime source, build scripts, CI scripts, Makefiles, moon task definitions, or container definitions).
- For documentation-only or Markdown-only changes, skip dependency audits and run markdown lint (`moon run repo:check-lint-md`) as the required validation.
- For container changes, ensure the integrated Dockerfile vulnerability scan passes during `make build-containers`.
- Never leave known high or critical vulnerabilities unaddressed: fix them in the same change, then re-run the audit and confirm a clean result.
- If a vulnerability has no safe fix available, document the mitigation and risk in the issue/PR and create a follow-up issue before closing work.

## Git Standards

- AI agents must use Conventional Commits format for all commits.
- Human contributors are encouraged but not required to use Conventional Commits.
- Include issue references: `Refs #N` or `Closes #N`.
- Keep commits atomic and scoped to one logical change. See
  [Iterative Small Commits](#iterative-small-commits-required) — prefer
  many small commits over one large commit, and commit after each new
  file, edit, or deletion rather than batching many changes together.
- Branch naming: `<type>/<short-description>`.

### Branch Protection (GitHub Rulesets)

The `main` branch is protected by a GitHub ruleset. The following are enforced:

- All changes require a pull request; direct pushes are blocked.
- At least one approving review from a CODEOWNERS-designated reviewer.
- Stale approvals are dismissed when new commits are pushed.
- All PR conversations must be resolved before merge.
- The `pr-validation-result` status check must pass.
- Only squash merges are permitted (linear history required).
- Force pushes to `main` are blocked.
- Deletion of `main` is blocked.

`idp-admin` members can bypass rulesets in emergencies; this should be used
sparingly and documented in the issue or PR.

Agents must not attempt merges that violate these constraints — GitHub will
reject the operation.

## Versioning

- Use SemVer (`MAJOR.MINOR.PATCH`) for all versioned artifacts.
- Bump versions in the same PR as the change.

## File and Directory Conventions

- `/stacks/<language>/<framework>/<interface>/` technology-specific implementations with a GNU Makefile
- Stack names encode language, server framework, and interface type (for web or BFF).
- `/deploy/` container and infra definitions
- `/plugins/` plug-ins and SDKs
- `/docs/` Docusaurus documentation site; `docs/content/` is the single source of truth for all docs
- `/docs/content/architecture/decisions/` Architecture Decision Records (ADRs)
- `/docs/content/architecture/diagrams/` C4 architecture diagrams authored in Mermaid syntax
- `/tests/` contract test harness (TypeScript) and Layer 1 Gherkin intent specs
- `/tests/features/` Layer 1 Gherkin `.feature` files — ground truth for all contract intent
- `/tests/src/profiles/` Layer 2 TypeScript test implementations derived from `.feature` files
- `/tools/` tooling and MCP definitions
- `/tools/mcp/` Model Context Protocol adapter server
- `/tools/vscode-extension/` VS Code extension skeleton (early integration target)
- `/tools/backstage/` Backstage test harness for IDP plug-in integration (skeleton phase)
- `/.agents/skills/` agent skills

### Test Harness Sync Rule

Any change to `tests/features/*.feature` files or `tests/src/profiles/*.ts` files **obligates**
an update to `docs/content/testing/` in the same change:

- Adding or changing a scenario in a `.feature` file → update the corresponding profile doc in
  `docs/content/testing/profiles/`.
- Adding or changing a test in `tests/src/profiles/*.ts` → verify it matches the `.feature` spec;
  if a `.feature` file must be updated, update both together.
- Adding a new profile → create both the `.feature` file and the matching
  `docs/content/testing/profiles/<profile>.md` page in the same change.

### Architecture Diagram Sync Rule

Any change to files under `docs/content/architecture/diagrams/` **obligates**
an update to generated assets in `docs/static/diagrams/` in the same change.

- Source of truth: Mermaid C4 diagrams in `docs/content/architecture/diagrams/*.md`.
- Generated artifacts: `docs/static/diagrams/*.svg`.
- Generate with: `moon run docs-site:generate-diagrams` or `make -C docs generate-diagrams`.
- Validate generation with: `moon run docs-site:check-diagrams` or `make -C docs check-diagrams`.

## Editor Rules (Cursor/Copilot)

- `.github/copilot-instructions.md` provides GitHub Copilot with repository context
  and points to this file as the authoritative operating manual. It includes references
  to agent skills in `.agents/skills/` including the `review-*` pattern for future
  review-focused skills.
- No `.cursor/rules/` or `.cursorrules` found in this repo.
- `CLAUDE.md` exists at the repo root for Claude Code context. It is intentionally
  brief — full standards and maintenance instructions live here in `AGENTS.md`, not
  in `CLAUDE.md`. Do not duplicate content between the two files.

## What Not To Do

- Do not navigate, read, write, or execute commands outside the repository root.
- Do not use symlinks.
- Do not disable security features.
- Do not introduce cloud-provider lock-in without an abstraction.
- Do not add AI/LLM calls without error handling, rate limits, and cost controls.
