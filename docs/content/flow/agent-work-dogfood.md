---
sidebar_position: 11
---

# Agent Work — Local Dogfood Path

This page documents a deliberately manual, fixture-backed path for
observing goose autonomous task work in the IDP portal. It exists as the
first useful slice while a real goose launcher (e.g.
`make agent-goose-task`) is still being designed.

## What this is

A local-first, fixture-backed view that lets a human read an agent task
snapshot and decide what to do next. The flow:

1. A goose autonomous task writes (or simulates) a snapshot file named
   `.agent-task.json` describing what it observed, why it matters, and a
   recommended next action.
2. The Node.js BFF reads those snapshots at startup from
   `schema/fixtures/agent-tasks/` (seed fixtures) and from
   `.agents/worktrees/<slug>/.agent-task.json` (live snapshots).
3. The BFF exposes them at `GET /api/agent-work/tasks` and
   `GET /api/agent-work/tasks/:taskId`.
4. The web app's `/agent-work` route renders an `AgentTaskCard` per task,
   surfacing **Observation**, **Why it matters**, and **What to do**.

## What this is not

- Not a goose launcher. There is no `make agent-goose-task` target yet.
- Not a telemetry pipeline. No OpenTelemetry ingestion, no database, no
  push-based events. The BFF only reads local files.
- Not a remote agent runner. There is no network call to start, observe,
  or modify an agent run.

## Snapshot shape

`.agent-task.json` files are plain JSON. The required fields are:

```json
{
  "task_id": "goose-001",
  "issue_number": 371,
  "state": "impl-validation-failed",
  "slug": "issue-371-agent-work-insights",
  "worktree_path": ".agents/worktrees/issue-371-agent-work-insights",
  "heartbeat": {
    "state": "impl-validation-failed",
    "updated_at": "2026-05-16T10:00:00Z"
  },
  "model": null,
  "tokens": null,
  "cost": null,
  "observation": "make check failed on iteration 2 of 3. ...",
  "why_it_matters": "The autonomous task exhausted its retries. ...",
  "what_to_do": "Open the worktree at ..., fix Y, re-invoke with ..."
}
```

`state` and `heartbeat.state` are constrained to the heartbeat vocabulary
defined in `.agents/skills/autonomous-task/SKILL.md`: `worktree-claimed`,
`planning`, `planning-review`, `implementing`, `impl-validation-failed`,
`impl-validated`, `validating`, `ship`, `complete-local`, `failed`,
`blocked`.

`model`, `tokens`, and `cost` are intentionally nullable. When a snapshot
does not carry a known value, set it to `null` and the UI will display
"unavailable" — values are never guessed or backfilled.

## Adding a snapshot manually

The dogfood path requires no special tooling. Drop a file with the shape
above into one of two locations:

- `schema/fixtures/agent-tasks/<name>.agent-task.json` — seed fixture
  that lives with the repo. Good for demos and tests.
- `.agents/worktrees/<slug>/.agent-task.json` — live snapshot for a real
  worktree. The catalog reads this on BFF startup and shadows any
  fixture with the same `task_id`.

Restart the BFF to pick up the new file. The catalog loads at startup;
there is no file watcher.

## How to test locally

```bash
# Validate a fixture file is well-formed JSON
node -e "JSON.parse(require('fs').readFileSync('schema/fixtures/agent-tasks/impl-validation-failed-goose-001.agent-task.json','utf8'))"

# Start the BFF
pnpm --dir stacks/nodejs/react-fastify/rest run start:bff

# Probe the endpoints
curl -s http://localhost:8000/api/agent-work/tasks | jq '.total, .tasks[0].state'
curl -s http://localhost:8000/api/agent-work/tasks/goose-001 | jq '.task.what_to_do'

# Start the web app and navigate to /agent-work
pnpm --dir stacks/nodejs/react-fastify/rest run start:web
```

## Environment overrides

The catalog resolves directories from the repo root by default. Override
either with an environment variable if you need a non-default location
(useful inside containers or for integration tests):

- `OUR_IDP_AGENT_TASK_FIXTURE_DIR` — fixture directory
- `OUR_IDP_AGENT_TASK_DIR` — live worktree root

## Replacing this with a real launcher

When a launcher exists, no code change is needed in the BFF or web. The
launcher writes `.agent-task.json` to its worktree as part of the
existing snapshot contract; the catalog reads it on the next BFF
restart. This page becomes obsolete at that point and should be replaced
with launcher documentation.
