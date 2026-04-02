---
sidebar_position: 4
---

# Level 1: Delivery Context (Current and Target)

This view shows delivery-system context for maintainers and implementers. It is
the companion to the user-first Level 1 views.

## Audience

- Primary: IDP project maintainers and IDP implementers/operators.
- Secondary: advanced users who need delivery governance context.

## State

- Current: repository-driven workflows and stack operations used today.
- Target: expanded policy integration and stronger automated delivery controls.

```mermaid
C4Context
  title IDP Delivery Context (Current and Target)

  Person(maintainer, "Project Maintainer", "Owns roadmap, governance, and merge quality")
  Person(operator, "IDP Implementer and Operator", "Builds, hosts, and supports IDP implementations")

  System(idpDelivery, "IDP Delivery System", "Coordinates intent specs, contract checks, implementation stacks, docs, and release workflows")

  System_Ext(github, "GitHub", "Issues, pull requests, actions, and repository collaboration")
  System_Ext(registry, "Container Registry", "Stores runtime and contract test images")
  System_Ext(policySystems, "Identity and Policy Systems", "Identity and policy control integrations")

  Rel(maintainer, idpDelivery, "Defines standards and approves changes", "ADRs + CI/CD + release policy")
  Rel(operator, idpDelivery, "Builds and runs implementations", "moon + make + scripts")
  Rel(idpDelivery, github, "Reads issues, validates PRs, and publishes docs", "GitHub APIs + Actions")
  Rel(idpDelivery, registry, "Builds and publishes container images", "OCI pushes")
  Rel(idpDelivery, policySystems, "Integrates policy controls", "Current: partial, Target: expanded")
```

## Notes

- This diagram is intentionally delivery-focused and separate from user context.
- Most readers should start with user-first Level 1 diagrams.
