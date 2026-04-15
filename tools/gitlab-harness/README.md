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
make seed        # populates bootstrap org/users/projects (scenario seeds pending)
make logs        # follow logs during troubleshooting
make down        # stop containers
make reset       # stop and clear persisted data
```

## Ports

- HTTP: `http://localhost:8929`
- SSH: `localhost:2424`

## Notes

- Data, runner config, and logs persist under `tools/gitlab-harness/data/`.
- The harness is intended only for testing and should not be treated as a source of truth.
- Seeding currently bootstraps the GitLab org/users/projects; individual scenario seeds will map to existing GitLab fixtures in follow-up steps.
