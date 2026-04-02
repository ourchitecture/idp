---
sidebar_position: 2
---

# Level 1: User System Context (Current)

This view shows current IDP context from the user perspective. Delivery
mechanics are present, but user outcomes and decision needs remain primary.

## Audience

- Primary: IDP users and decision stakeholders.
- Secondary: implementers and maintainers who need user-outcome context.

## State

- Current: reflects behavior available in the repository today.
- Target: see [Level 1: User System Context (Target)](./level-1-system-context-target).

```mermaid
C4Context
  title IDP User System Context (Current)

  Person(deliveryAndDesign, "Delivery and Design Roles", "Developer and Architect")
  Person(productAndTechLeadership, "Product and Technology Leadership Roles", "Product Manager, Technology Manager, Technology Leader, and Business Leader")
  Person(assuranceAndControl, "Assurance and Control Roles", "Process Expert, Governance and Compliance, and Security")

  System(idp, "Intent-Driven Portal (IDP)", "Current user experience for intent, validation evidence, and implementation visibility")

  System_Ext(github, "GitHub", "Issues, pull requests, actions, and source collaboration")
  System_Ext(contractHarness, "Contract Test Harness", "Profile-based conformance checks derived from Layer 1 intent specs")

  Rel(deliveryAndDesign, idp, "Defines, validates, and delivers intent changes", "Portal workflows + docs + tests")
  Rel(productAndTechLeadership, idp, "Reviews value delivery and platform progress", "Portfolio and outcome views")
  Rel(assuranceAndControl, idp, "Reviews control evidence and risk posture", "Operational and governance views")
  Rel(idp, github, "Synchronizes workflow state", "GitHub APIs + Actions")
  Rel(idp, contractHarness, "Runs profile-based checks", "core + operational + ui-profile + mcp-profile")
```

## Role Mapping

| Role cluster | Concrete roles | Primary user goal |
| --- | --- | --- |
| Delivery and design roles | Developer, Architect | Move intent from design to validated implementation with fast feedback |
| Product and technology leadership roles | Product Manager, Technology Manager, Technology Leader, Business Leader | Track value delivery, priorities, and cross-team execution health |
| Assurance and control roles | Process Expert, Governance and Compliance, Security | Confirm policy adherence, risk controls, and audit readiness |

## Notes

- `tests/features/*.feature` files are the Layer 1 intent source of truth.
- `tests/src/` contract harness code is Layer 2 validation against implementations.
- `stacks/` contains Layer 3 runtime implementations.
