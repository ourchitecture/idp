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

## Where to start

- Read the [canonical model](./model) to understand the shared vocabulary.
- Review the [signal catalog](./signals) to see how the model is applied.
- Use the [scope guardrails](./scope) to keep provider-specific or workflow-shaped concerns out of the core.
- Explore the [intent scenarios](./intent-scenarios) to see the Gherkin statements that anchor the MVP.

## Epic alignment

The flow insight MVP depends on this language before any adapter, inference engine, or UI work begins. This section is semantic only — no storage schemas, HTTP routes, MCP tools, or UI behaviors are defined here.
