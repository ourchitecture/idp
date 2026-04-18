# GitLab harness

Local GitLab CE instance for deterministic adapter testing. The harness pins ports to avoid conflicts (HTTP `8929`, SSH `2424`) and disables heavy optional services to keep footprint smaller for CI and laptops.

## Prerequisites

- Docker with Compose v2 (`docker compose` available on PATH)
- ~4 GB free memory while GitLab boots

## Usage

```bash
cd tools/gitlab-harness
make up
make wait-healthy
make token       # writes .secrets/gitlab-harness.token
make seed        # populates bootstrap org/users/projects + scenario seeds
make logs        # follow logs during troubleshooting
make down        # stop containers
make reset       # stop and clear persisted data
```

## Ports

- HTTP: `http://localhost:8929`
- SSH: `localhost:2424`

## Scenarios

`make seed` (or `./seed/seed-all.sh`) now bootstraps the following GitLab CE
states, aligned to the GitLab fixtures under
`schema/fixtures/provider-adapter-input/`:

- blocked_on_review (SaaS) — MR with two required approvals, none granted.
- blocked_on_review (self-managed) — MR awaiting review with legacy CI status.
- trunk_integration_failure — MR merged with failing trunk status on merge SHA.
- unclear_ownership — MR touching paths without matching CODEOWNERS entry.
- waiting_on_evidence — merged MR approved but labeled `evidence:pending`.
- aging_implementation — merged MR with pending trunk validation status.
- risk_aggregation — three concurrent MRs (merged + failing trunk, blocked on
  review, unclear ownership path).

Each seed script prints the project ID and MR IID(s) that were ensured for the
scenario so downstream e2e tests can reference them.

## Notes

- Data, runner config, and logs persist under `tools/gitlab-harness/data/`.
- The harness is intended only for testing and should not be treated as a source of truth.
- First startup can take 10-20 minutes depending on CPU/disk; helper waits now allow up to 30 minutes for readiness and application init. If it still is not healthy after that, check `make logs`.
- GitLab CE lacks some enterprise features (for example richer approval rules
  and evidence workflows). The seeds emulate fixture intent with available CE
  APIs using merge request approvals, commit statuses, labels, and CODEOWNERS.
