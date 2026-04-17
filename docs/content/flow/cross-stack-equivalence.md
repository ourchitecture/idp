---
sidebar_position: 10
---

# Cross-Stack Equivalence Report

This report records the current semantic equivalence status for flow insights
across the Go and Node.js stacks.

## Why this report exists

The MVP promise is one shared capability contract across stacks. This document
captures the verification evidence and any differences.

## Fixture-based profile run (shared contract harness)

Command used:

- `make -C stacks/go/net-http/rest check-contract-flow-insights`
- `make -C stacks/nodejs/react-fastify/rest check-contract-flow-insights`
- `bash /home/runner/work/idp/idp/scripts/ci/check-flow-insights-equivalence.sh`

Result:

- Go: **pass**
- Node.js: **pass**

Validated equivalence intent:

- Signal identity
- Severity/priority intent
- Confidence intent (including degraded confidence on partial data)
- Recommended next action intent

## Differences found and resolution

### Unacceptable divergence (fixed)

- **Issue:** `risk_aggregation` was missing in both stacks for
  `risk-aggregation-github.yaml` and `risk-aggregation-gitlab.yaml`.
- **Root cause:** risk-window anchoring used wall-clock runtime time instead of
  the latest observed signal timestamp from fixture data.
- **Fix:** both inference implementations now anchor the risk window to the
  latest observed contributing signal.
- **Status:** fixed; fixture-based equivalence now passes on both stacks.

### Allowed differences

- No current allowed semantic differences are required for fixture-based runs.
- Wording and ordering differences remain non-contractual per ADR-0014.

## GitLab harness end-to-end status

Attempted commands:

- `make gitlab-harness-up`
- `make gitlab-harness-wait-healthy`
- `make gitlab-harness-token`
- `make gitlab-harness-seed`

Current blocker:

- `make gitlab-harness-token` fails with `Root user missing` repeatedly after
  container readiness, so seeding cannot complete in this environment.
- A retry loop was added to reduce startup race sensitivity, but the root user
  still does not become available before timeout.

Interpretation:

- GitLab harness end-to-end adapter validation remains **blocked** by harness
  initialization in this environment.
- Fixture-based cross-stack semantic equivalence is fully passing.

## CI coverage

A PR validation job now runs fixture-based cross-stack equivalence checks:

- Workflow job: `check-flow-insights-equivalence`
- Triggered when Go or Node.js stack validation is selected by change detection.
- Command: `moon run repo:check-flow-insights-equivalence`
