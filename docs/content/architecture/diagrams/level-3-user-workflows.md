---
sidebar_position: 9
---

# Level 3: User Workflow Components (Current and Target)

This stack-agnostic Level 3 view models user-facing workflow components instead
of implementation internals.

## Audience

- Primary: IDP users, architects, and product stakeholders.
- Secondary: implementers designing features around user workflow outcomes.

## State

- Current: intent capture, validation review, and runtime visibility workflows.
- Target: guided planning, policy evidence, and outcome management workflows.

```mermaid
C4Component
  title IDP User Workflow Components (Current and Target)

  Container_Boundary(userWorkflowLayer, "IDP User Workflow Layer") {
    Component(intentEditor, "Intent Editor", "Current", "Capture and evolve delivery intent and constraints")
    Component(validationPanel, "Validation Panel", "Current", "Show contract profile results and actionable failures")
    Component(runtimeStatusPanel, "Runtime Status Panel", "Current", "Display health and readiness signals")
    Component(planningAssistant, "Planning Assistant", "Target", "Recommend impact-aware sequencing and delivery plans")
    Component(policyEvidencePanel, "Policy and Evidence Panel", "Target", "Surface governance controls and audit evidence")
    Component(outcomeDashboard, "Outcome Dashboard", "Target", "Report delivery throughput, value signals, and risk trends")
  }

  Rel(intentEditor, validationPanel, "Sends intent context")
  Rel(validationPanel, runtimeStatusPanel, "Correlates conformance and runtime behavior")
  Rel(intentEditor, planningAssistant, "Provides planned change context")
  Rel(validationPanel, policyEvidencePanel, "Supplies validation evidence")
  Rel(runtimeStatusPanel, outcomeDashboard, "Feeds operational signals")
  Rel(policyEvidencePanel, outcomeDashboard, "Feeds control and risk signals")
```

## Notes

- Current and target elements are co-located to support roadmap communication.
- Implementation-specific Level 3 views remain separate.
