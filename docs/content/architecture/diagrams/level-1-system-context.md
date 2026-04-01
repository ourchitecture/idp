---
sidebar_position: 2
---

# Level 1: System Context

This view explains who uses IDP and which external platforms it depends on. It
is the highest-level map and is intended for quick orientation.

```mermaid
C4Context
  title IDP System Context

  Person(developer, "Developer", "Builds and ships services through the IDP workflows")
  Person(operator, "Platform Operator", "Runs and maintains platform infrastructure and policy")

  System(idp, "Intent-Driven Portal (IDP)", "Coordinates intent specs, contract checks, implementation stacks, and docs")

  System_Ext(github, "GitHub", "Issues, pull requests, actions, and repository collaboration")
  System_Ext(ghcr, "Container Registry", "Stores published runtime and test container images")

  Rel(developer, idp, "Defines and validates intent-driven changes", "CLI + docs + tests")
  Rel(operator, idp, "Operates CI/CD and release workflows", "moon + make + scripts")
  Rel(idp, github, "Reads issues, validates PRs, and publishes docs", "GitHub APIs + Actions")
  Rel(idp, ghcr, "Builds and publishes container images", "OCI pushes")
```

## Notes

- `tests/features/*.feature` files are the Layer 1 intent source of truth.
- `tests/src/` contract harness code is Layer 2 validation against implementations.
- `stacks/` contains Layer 3 runtime implementations.
