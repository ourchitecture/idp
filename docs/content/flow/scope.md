---
sidebar_position: 4
---

# Scope and Guardrails

This model is intentionally small. It captures only what changes action for the flow insight MVP. Everything else is referenced, not modeled.

## In scope

- Canonical concepts that drive action: work item, change, actor, review state, validation state, evidence state, ownership state, risk signal.
- Provider-neutral semantics and wording.
- Signals that rely on those concepts and their minimal attributes.

## Out of scope

- Storage schemas, database models, or migration plans.
- HTTP routes, MCP tool definitions, UI behaviors, or widget contracts.
- Workflow transitions owned by the platform (schedulers, triggers, queues).
- Full backlog or CMDB catalogs, historical audit trails, or identifier strategies.

## CMDB drift guardrail

- Do not model exhaustive entities, relationships, or ownership graphs.
- Only include attributes that a signal uses to change action.
- Avoid requirements for immutable history; references to evidence or validation are pointers, not archives.

## Workflow-engine drift guardrail

- Do not introduce triggers, transition rules, or scheduling primitives.
- Signals observe states; they do not own the progression between them.
- Actors are accountable people or automations, not background workers to be scheduled.

## Provider-shape guardrail

- The core wording stays provider-neutral. Provider names appear only in illustrative appendices.
- Adapters perform normalization; the model and signals never assume a specific provider feature set.

## Implementation guardrail

- Keep the canonical model and signals independent of any stack. No stack is the source of truth for another.
- Model what changes action. Reference the rest.
