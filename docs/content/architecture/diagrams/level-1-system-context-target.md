---
sidebar_position: 3
---

# Level 1: User System Context (Target)

This view shows target IDP context from the user perspective. It extends current
capabilities with stronger planning, governance, and value reporting while
keeping user outcomes primary.

## Audience

- Primary: IDP users and decision stakeholders.
- Secondary: implementers and maintainers planning platform evolution.

## State

- Current: see [Level 1: User System Context (Current)](./level-1-system-context).
- Target: intended user-centered context after capability expansion.

```mermaid
C4Context
  title IDP User System Context (Target)

  Person(deliveryAndDesign, "Delivery and Design Roles", "Developer and Architect")
  Person(productAndTechLeadership, "Product and Technology Leadership Roles", "Product Manager, Technology Manager, Technology Leader, and Business Leader")
  Person(assuranceAndControl, "Assurance and Control Roles", "Process Expert, Governance and Compliance, and Security")

  System(idp, "Intent-Driven Portal (IDP)", "Unified user experience for planning, validated delivery, governance evidence, and value outcomes")

  System_Ext(github, "GitHub", "Issues, pull requests, actions, and source collaboration")
  System_Ext(contractHarness, "Contract Test Harness", "Profile-based conformance checks derived from Layer 1 intent specs")
  System_Ext(runtimePlatforms, "Implementation and Runtime Platforms", "Reference stacks, hosted deployments, and runtime telemetry")
  System_Ext(policySystems, "Identity and Policy Systems", "Identity, access control, and policy decision inputs")

  Rel(deliveryAndDesign, idp, "Plans and delivers validated intent changes", "Intent workflows + implementation visibility")
  Rel(productAndTechLeadership, idp, "Tracks value flow and delivery outcomes", "Portfolio and outcome dashboards")
  Rel(assuranceAndControl, idp, "Evaluates controls and risk posture", "Policy controls + evidence trails")
  Rel(idp, github, "Synchronizes workflow state", "GitHub APIs + Actions")
  Rel(idp, contractHarness, "Runs and consumes conformance checks", "core + operational + ui-profile + mcp-profile")
  Rel(idp, runtimePlatforms, "Collects deployment and runtime signals", "health + readiness + metrics")
  Rel(idp, policySystems, "Evaluates identity and policy controls", "policy queries + decisions")
```

## Role Mapping

| Role cluster | Concrete roles | Target user goal |
| --- | --- | --- |
| Delivery and design roles | Developer, Architect | Plan, execute, and validate changes with trusted guidance and fast feedback |
| Product and technology leadership roles | Product Manager, Technology Manager, Technology Leader, Business Leader | Manage value outcomes, strategic priorities, and delivery health |
| Assurance and control roles | Process Expert, Governance and Compliance, Security | Enforce controls, review risk, and maintain auditable evidence |

## Notes

- Target-state context is implementation-agnostic and aligned to ADR direction.
- Layered intent, contract, and implementation separation remains unchanged.
