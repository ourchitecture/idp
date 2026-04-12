---
sidebar_position: 1
---

# Flow Insights

Flow insights define the smallest shared language for understanding how work moves from proposal to production across providers. The goal is a provider-neutral model and signal catalog that let adapters, inference logic, and UIs converge without locking into any one platform shape.

## What this covers

- Canonical concepts that change action: work item, change, actor, review state, validation state, evidence state, ownership state, and risk signal.
- The initial signal catalog for the MVP, with semantic inference rules and worked examples.
- Scope guardrails that prevent CMDB drift and workflow-engine drift.
- Layer 1 intent scenarios that express the flow insights as Gherkin ground truth.
- MVP boundaries, provider strategy, implementation strategy, and deferred scope.

## Where to start

### Understanding the semantic foundation

- Read the [canonical model](./model) to understand the shared vocabulary.
- Review the [signal catalog](./signals) to see how the model is applied.
- Read the [adapter contract](./adapter-contract) to understand the normalized types that provider adapters must produce.
- Use the [scope guardrails](./scope) to keep provider-specific or workflow-shaped concerns out of the core.
- Explore the [intent scenarios](./intent-scenarios) to see the Gherkin statements that anchor the MVP.

### Understanding the MVP boundaries and strategy

- Read [MVP Boundaries and Strategy](./mvp-boundaries) to understand what the flow insight MVP is and what it is not.
- Review [Implementation Strategy](./implementation-strategy) to see how multiple stacks satisfy the shared capability contract.
- Consult [Deferred Scope and Follow-On Direction](./deferred-scope) to understand what capabilities are intentionally postponed and why.

### Architecture decisions

- See [ADR-0014: MVP Flow Observation Technical Foundations](../architecture/decisions/mvp-flow-observation-technical-foundations) for the technical decision on inference approach, storage boundaries, eventing posture, fixture strategy, and cross-stack equivalence.

## Epic alignment

The flow insight MVP depends on this language before any adapter, inference engine, or UI work begins. This section is semantic only — no storage schemas, HTTP routes, MCP tools, or UI behaviors are defined here.
