# Autonomous Task Agent Experiment

Early experiment proving that development tasks can be assigned to fully
autonomous agents that work in isolated git worktrees, plan iteratively with
optional review gates, and implement with validation loops.

## What this proves

1. An agent can claim a git worktree and do all reads/writes inside it,
   isolated from the main checkout and from other concurrent agents.
2. The plan → review → implement → validate pipeline can be driven by a
   single skill invocation, with configurable iteration limits.
3. AI vendor/model selection is developer-controlled via named profiles without
   requiring changes to skill files.

## How to invoke

### OpenCode (primary)

```bash
# Human review gate (default):
pnpm oc
# Then: load the autonomous-task skill, provide inputs

# Fully autonomous (AI reviewer):
AGENT_MODEL_PROFILE=thoughtful pnpm oc
# Then: autonomous-task with review_mode=auto
```

### Pi (comparison)

```bash
pnpm pi
# Same skill; ~2-3x faster execution due to smaller system prompt.
# Best for fast-profile tasks or lightweight validation.
```

### Example invocation inputs

```
task_description: "Add a CONTRIBUTING.md with project setup and PR guidelines"
task_type: docs
model_profile: fast
review_mode: human
max_plan_iterations: 2
max_impl_iterations: 2
local_only: true        # no GitHub needed; leaves worktree ready for manual review
```

After the plan is posted (`review_mode=human`), re-invoke with
`skip_to=implement` to proceed.

---

## Running multiple agents in parallel

Each session works entirely inside its own worktree. Three launchers work
out of the box:

### Option 1 — OpenCode Ensemble

```bash
# Install the plugin once:
pnpm add -D opencode-ensemble

# Launch N agents; each gets its own worktree automatically:
pnpm opencode-ensemble \
  "Add CONTRIBUTING.md" \
  "Fix typo in README" \
  "Refactor auth middleware"
```

### Option 2 — Pi side-agents (tmux-based)

```bash
# Requires tmux and the pi-side-agents extension.
# Each task opens in a separate tmux window with its own worktree.
pnpm pi --extension @pasky/pi-side-agents
```

### Option 3 — Manual tmux splits

```bash
# In each pane, run one of:
pnpm oc   # OpenCode
pnpm pi   # Pi

# Then load the autonomous-task skill in each pane with a different task_description.
# Each agent will create its own worktree automatically.
```

All three options work with `local_only=true` — no GitHub account or remote
required for fully offline parallel runs.

### Observing parallel sessions

Each agent writes two files inside its worktree:

| File | Content |
|------|---------|
| `.agent-lock` | Session ID, start time, task slug, PID |
| `.agent-heartbeat` | Last completed step name + ISO timestamp |

Check status of all running agents at any time:

```bash
# Quick status — last heartbeat for every active worktree:
for f in .agents/worktrees/*/.agent-heartbeat; do echo "=== $f ==="; cat "$f"; done

# Full integrity audit (flags hung sessions after 30 min silence):
make audit-worktrees
# or invoke the audit-work-integrity skill with stale_agent_minutes=30
```

If a session disappears silently:
1. Its lock file remains; `audit-work-integrity` will flag it as a Medium finding.
2. Manually release: `rm .agents/worktrees/<slug>/.agent-lock`
3. Resume: re-invoke `autonomous-task` with the same `task_description` and
   `skip_to=implement` (if planning was complete) or omit `skip_to` to replan.

## Tool selection rationale

| Tool | Role in experiment | Key capability used |
|------|-------------------|---------------------|
| OpenCode v1.14.x | Primary harness | First-party git worktree support; 75+ LLM providers; native `.agents/skills/` discovery |
| Pi v0.74.x | Speed comparison | Minimal system prompt (~1K tokens); same skill discovery path |
| Goose | Excluded (v1) | Worktree support in-progress ([aaif-goose/goose#3557](https://github.com/aaif-goose/goose/issues/3557)); revisit when GA |

## Known limitations

### Docker container collisions

The `autonomous-task` skill automatically sets `COMPOSE_PROJECT_NAME=<TASK_SLUG>`
when invoking `make check`, which namespaces all containers and networks for
that agent session. This prevents name collisions between concurrent agents.

**Remaining gap:** port bindings. If two agents both start services that bind
to the same host port (e.g., `8080`), the second will fail. The stack-level
`compose.yml` files use fixed ports today.

**Full fix (out of scope for v1):** parameterise port offsets in each stack's
compose file (e.g., `PORT_OFFSET=100` shifts all ports by 100). Requires
changes across all stack directories.

### Make targets assume repo root as CWD

Some Makefile targets use relative paths that break when invoked from inside
a worktree at `.agents/worktrees/<slug>`. The skill works around this with:

```bash
make -C $(git rev-parse --show-toplevel) <target>
```

Long term, Moon targets handle this correctly via workspace-aware execution.

### No cross-agent coordination signal

Two agents working the same issue in separate sessions will both call
`make worktree-ensure` and reuse the same worktree path, but neither knows
the other is active. The `audit-work-integrity` skill detects this after
the fact. A future improvement: advisory lock file inside the worktree.

## Adding Goose (future)

When [aaif-goose/goose#3557](https://github.com/aaif-goose/goose/issues/3557)
lands, Goose can be added as a third runtime path. The `autonomous-task`
skill's SKILL.md format is compatible with Goose's skill discovery. The
model profile config in `.agents/agent-models.yml` will need a Goose-specific
provider-ID mapping added to each profile entry.

## Next steps based on findings

- [ ] Run the experiment on 2–3 real tasks in parallel with `local_only=true`;
      confirm worktree isolation and no docker collisions.
- [ ] Evaluate whether `review_mode=auto` plans are safe enough for
      unattended overnight runs.
- [ ] Benchmark OpenCode vs. Pi on identical tasks: wall time, token cost,
      output quality.
- [ ] Investigate port-offset parameterisation for the full multi-agent docker fix.
- [ ] Revisit Goose inclusion when worktree support is GA (aaif-goose/goose#3557).
