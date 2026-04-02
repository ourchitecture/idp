---
sidebar_position: 5
---

# Level 2: User Capability Containers (Current and Target)

This stack-agnostic Level 2 view shows user-facing capability containers rather
than implementation-specific containers.

## Audience

- Primary: IDP users and decision stakeholders.
- Secondary: implementers aligning architecture to user outcomes.

## State

- Current: delivery intent, conformance visibility, and operations awareness.
- Target: expanded planning, governance, and portfolio outcome capabilities.

```mermaid
C4Container
  title IDP User Capability Containers (Current and Target)

  Person(deliveryAndDesign, "Delivery and Design Roles", "Developer and Architect")
  Person(productAndTechLeadership, "Product and Technology Leadership Roles", "Product Manager, Technology Manager, Technology Leader, and Business Leader")
  Person(assuranceAndControl, "Assurance and Control Roles", "Process Expert, Governance and Compliance, and Security")

  System_Boundary(idp, "Intent-Driven Portal") {
    Container(intentWorkspace, "Intent Workspace", "Current", "Capture and evolve intent, requirements, and delivery constraints")
    Container(conformanceCenter, "Conformance Center", "Current", "Run and review profile-based validation across implementations")
    Container(operationalViews, "Operational Views", "Current", "Show health, readiness, and runtime status signals")
    Container(portfolioViews, "Portfolio and Outcome Views", "Target", "Expose value flow, prioritization, and delivery outcome reporting")
    Container(governanceCenter, "Governance and Risk Center", "Target", "Provide policy controls, evidence trails, and risk posture")
  }

  Rel(deliveryAndDesign, intentWorkspace, "Defines and refines intent")
  Rel(deliveryAndDesign, conformanceCenter, "Runs and reviews validation")
  Rel(deliveryAndDesign, operationalViews, "Monitors runtime health")
  Rel(productAndTechLeadership, portfolioViews, "Tracks strategy and outcomes")
  Rel(assuranceAndControl, governanceCenter, "Reviews controls and compliance evidence")
  Rel(intentWorkspace, conformanceCenter, "Supplies intent context")
  Rel(conformanceCenter, operationalViews, "Correlates validation and runtime state")
  Rel(portfolioViews, governanceCenter, "Shares outcome and risk context")
```

## Notes

- This is the primary Level 2 view for users.
- Stack-specific Level 2 container diagrams remain for implementers/operators.
