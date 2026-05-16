# Contributing to Stemix IDP

Thank you for your interest in contributing to the Intent-Driven Portal (IDP).
This guide covers both non-technical and technical contribution paths.

## Non-Technical Contributions

- Report bugs or suggest features by opening a GitHub Issue.
- Improve documentation clarity or fix typos.
- Participate in discussions on open issues.

## Technical Contributions

### Prerequisites

- **Node.js** 24+ and **pnpm** (managed by proto for the main workspace)
- **Go** 1.26+ (for the Go reference stack)
- **GNU Make** (optional convenience wrapper -- direct pnpm/moon commands work
  too)
- **Docker** (optional -- only needed for container builds)
  - Rancher Desktop with `dockerd (moby)` engine is the recommended FOSS
    alternative to Docker Desktop on Windows/macOS.

### Getting Started

```bash
git clone https://github.com/ourchitecture/idp.git
cd idp
pnpm install
```

### Running a Stack Locally

```bash
# Default Go stack
make dev

# Node.js React + Fastify stack
STACK=stacks/nodejs/react-fastify/rest make dev
```

### Running Tests

```bash
# Run contract tests against the default stack
make test

# Run stack-specific CI checks
make -C stacks/go/net-http/rest check-ci
make -C stacks/nodejs/react-fastify/rest check-ci
```

### Building Container Images

Container builds require Docker in PATH. They are opt-in and silently skipped
when Docker is not available.

```bash
# Build all container images
make build-containers

# Build a single stack's containers
make -C stacks/go/net-http/rest build-containers
make -C stacks/nodejs/react-fastify/rest build-containers

# Build the contract test container
make -C tests build-container
```

### Linting

```bash
# Markdown lint
make check-lint-md

# Workflow file lint
make check-lint-workflows
```

## Workflow

1. Start from a GitHub Issue -- no untracked work.
2. Create a feature branch: `<type>/<short-description>`.
3. Make atomic commits. Conventional Commits format is encouraged but not required.
4. Include issue references: `Refs #N` or `Closes #N`.
5. Open a pull request against `main`.
6. Ensure PR validation checks pass.
7. At least one maintainer approval is required (CODEOWNERS-based).
8. All PR conversations must be resolved before merge.
9. Merges to `main` use squash merge only (enforced by repository rulesets).

These requirements are enforced by GitHub repository rulesets. GitHub will
prevent merging if any requirement is unmet.

### Stale Issue and PR Policy

To keep the work queue current and reduce abandoned context, this repository
runs weekly stale triage automation.

- Issues with no activity for 45 days are marked `stale`.
- Pull requests with no activity for 21 days are marked `stale`.
- Activity on an item removes the `stale` label automatically.
- During the initial rollout, stale automation does not auto-close items.
- Add `keep-open` to explicitly exempt an issue or PR from stale automation.

Maintainers and contributors should leave a short comment when applying
`keep-open` so future triage has clear context.

## Autonomous Task Agents

The `autonomous-task` skill lets you assign a development task to an agent
that works entirely autonomously — planning, implementing, validating, and
optionally shipping — inside an isolated git worktree. No GitHub account or
remote is required for local runs.

### Prerequisites

```bash
pnpm install   # installs opencode and pi as repo-local CLIs
```

### Basic usage

```bash
pnpm oc   # launch OpenCode (full-featured)
pnpm pi   # launch Pi (lighter, faster for small tasks)
```

Load the `autonomous-task` skill, then provide inputs. The only required
input is either `task_description` or `issue_number`.

### Local run (no GitHub required)

```yaml
task_description: "Add request-ID header to all BFF responses"
task_type: feat
model_profile: default
review_mode: human
local_only: true
```

With `local_only=true` the agent stops after a passing `make check` and
leaves the worktree at `.agents/worktrees/<slug>` for you to review and push
manually. No PR is created.

### Review modes

| `review_mode`     | Behaviour                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `human` (default) | Agent posts the plan and halts. Re-invoke with `skip_to=implement` to proceed after you approve.       |
| `auto`            | A second agent instance reviews the plan automatically. Enables fully unattended runs.                 |

### Model profiles

Edit or add profiles in `.agents/agent-models.yml`. Select a profile at
runtime:

```bash
AGENT_MODEL_PROFILE=thoughtful pnpm oc   # stronger reasoning for planning
AGENT_MODEL_PROFILE=fast pnpm oc         # haiku-class throughout; cheap iteration
AGENT_PLAN_MODEL=openai/gpt-4o pnpm oc   # override a single role
```

Any provider supported by OpenCode or Pi can be used. Profiles map four
roles (`plan`, `implement`, `validate`, `review`) to a provider and model.

### Running multiple agents in parallel

Each session operates in its own worktree, so you can run N sessions
concurrently on a single machine. Three launchers work out of the box:

| Launcher              | Command                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| OpenCode Ensemble     | `pnpm opencode-ensemble "task A" "task B" "task C"`                                           |
| Pi side-agents (tmux) | `pnpm pi --extension @pasky/pi-side-agents`                                                   |
| Manual tmux splits    | Split panes; run `pnpm oc` or `pnpm pi` in each with a different `task_description`           |

All three are compatible with `local_only=true`.

### Observability and recovery

Each agent writes two files inside its worktree:

- `.agent-lock` — session ID, start time, task slug
- `.agent-heartbeat` — last completed step and timestamp

Check status across all active sessions:

```bash
for f in .agents/worktrees/*/.agent-heartbeat; do echo "=== $f ==="; cat "$f"; done
```

If a session disappears silently (crash, OOM, timeout):

1. The lock file remains. The `audit-work-integrity` skill flags it as a
   Medium finding after 30 minutes of heartbeat silence.
2. Release the lock manually: `rm .agents/worktrees/<slug>/.agent-lock`
3. Resume: re-invoke `autonomous-task` with the same `task_description` and
   `skip_to=implement` (if planning completed) or without `skip_to` to replan.

For full details see
[`.agents/docs/autonomous-task-experiment.md`](.agents/docs/autonomous-task-experiment.md).

## Code Style

- Match existing patterns in the repo.
- Follow the style guidelines in `AGENTS.md`.
- Markdown must pass markdownlint.

## Documentation

Documentation updates must accompany code changes whenever behavior, setup,
operations, or interfaces change. See the documentation requirements in
`AGENTS.md` for full details.

## Security

- Never commit secrets, credentials, or environment-specific configs.
- Run `pnpm audit` before submitting changes. For `tools/backstage`, use `corepack enable && yarn npm audit`
  for now, so use `npm --prefix tools/backstage audit` for that package island.
- Report security vulnerabilities privately via GitHub Security Advisories.
