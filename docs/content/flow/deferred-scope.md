---
sidebar_position: 9
---

# Deferred Scope and Follow-On Direction

This document identifies capabilities that are **intentionally deferred** to post-MVP phases or later capability development. It explains why each item is deferred, what follow-on work would be required, and how contributors should avoid premature expansion while building the MVP.

## Why defer scope

The flow insight MVP is focused on **observation and inference** across six core signals. Deferring scope allows the MVP to:

- Stay small, testable, and shippable within a reasonable timeline.
- Validate the semantic model and signal catalog against real use cases before expanding.
- Avoid premature complexity in storage, eventing, workflow control, or broad entity modeling.
- Prevent drift toward CMDB, workflow engine, or vendor abstraction exercises.

Deferred capabilities are not rejected; they are postponed until the MVP proves the core value and stability of the semantic model, provider adapters, and transport layers.

## Deferred capabilities

### Write-back automation and change orchestration

**What it is:**

- Automatically merging pull requests or merge requests when signals indicate readiness.
- Auto-reverting changes when trunk integration fails.
- Triggering provider-side actions (for example, assigning reviewers, adding labels, closing stale PRs) based on signal logic.

**Why deferred:**

- The MVP is **observation and inference only.** It surfaces signals and recommends actions; it does not execute those actions automatically.
- Write-back automation introduces risk: bugs in inference logic could auto-merge broken changes or auto-revert valid work.
- The MVP needs to prove that signal inference is accurate, explainable, and trustworthy before allowing it to drive automated decisions.

**Follow-on direction:**

- Post-MVP, introduce an optional **action layer** that consumes signals and executes write-back operations with explicit user approval or policy-driven automation.
- Action layer must be sandboxed, auditable, and reversible. No action should execute without a recorded decision trail.
- Action layer is not part of the core capability contract; it is an extension that adapts to the insight contract.

**Contributor guardrail:**

Do not add auto-merge, auto-revert, or provider-side mutation logic to the MVP. If you find yourself calling provider write APIs (for example, GitHub's `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge`), stop and surface it as a post-MVP capability.

---

### Workflow engine behavior and transition control

**What it is:**

- Defining workflow states and allowed transitions (for example, "a change can only move from 'under review' to 'approved' if all reviewers have responded").
- Triggering state transitions based on events or timers.
- Scheduling background jobs, managing queues, or orchestrating multi-step flows.

**Why deferred:**

- The MVP **observes states; it does not own the transitions.** Providers (GitHub, GitLab) own the workflow; the flow insight capability infers signals from observed states.
- Introducing workflow control would turn the flow insight capability into a workflow engine, which is a different product with different scope, risk, and complexity.
- Workflow engine behavior requires durable state machines, transaction guarantees, and failure recovery patterns that are out of scope for the observation-focused MVP.

**Follow-on direction:**

- If workflow control is needed later, it should be a separate capability (for example, a workflow orchestration service) that consumes flow signals as one input among many.
- Workflow control must not be embedded in the flow insight inference engine. Keep the concerns separate.

**Contributor guardrail:**

Do not introduce state transition rules, trigger logic, or job scheduling into the flow insight capability. If you need to model a transition, model it as an **observed event** (for example, `NormalizedMergeEvent`), not as a controlled transition.

---

### Broad entity modeling beyond the six MVP signals

**What it is:**

- Modeling exhaustive backlog entities (for example, every issue, epic, milestone).
- Modeling organizational graphs (for example, teams, reporting lines, budget allocations).
- Modeling service catalogs, CMDB relationships, or dependency graphs.
- Modeling deployment pipelines, infrastructure resources, or runtime telemetry.

**Why deferred:**

- The MVP models **only the concepts that change action for the six MVP signals.** It does not model everything in the development lifecycle; it models the narrow slice needed for flow insight.
- Expanding into broad entity modeling increases storage complexity, maintenance cost, and coupling to provider-specific schemas.
- Broad entity modeling risks turning the flow insight capability into a CMDB, which is a different product with different goals.

**Follow-on direction:**

- If additional entities are needed for new signals (for example, "stale backlog item" or "unassigned incident"), add them incrementally with the same discipline: model only what changes action, reference the rest.
- If a full CMDB or service catalog is needed, that should be a separate capability with its own ownership and product surface. The flow insight capability can consume CMDB data as a reference source, but it should not reimplement CMDB logic.

**Contributor guardrail:**

Do not add entities, relationships, or attributes to the [canonical flow model](./model) unless they are required by a new signal that changes action. If you cannot identify the signal that needs the entity, defer it.

---

### Heavy analytics platforming and long-term trend storage

**What it is:**

- Storing historical signal data for trend analysis (for example, "how many trunk integration failures did we have last quarter?").
- Building dashboards, reports, or visualizations for long-term metrics.
- Providing query-heavy analytics over flow events, aggregations, or time-series data.

**Why deferred:**

- The MVP provides **current-state insights.** It answers "what is stuck right now?" not "what was stuck three months ago?"
- Historical trend analysis requires different storage patterns (for example, time-series databases, data warehouses), different query APIs, and different retention policies.
- Adding heavy analytics to the MVP increases storage cost, query complexity, and coupling to specific database technologies.

**Follow-on direction:**

- Post-MVP, introduce an optional **analytics layer** that:
  - Subscribes to flow signal events (for example, via webhook or message queue).
  - Stores historical snapshots in a time-series database or data warehouse.
  - Exposes trend queries, reports, and dashboards as a separate capability.
- The analytics layer is a consumer of the flow insight contract; it does not reshape the semantic model or inference logic.

**Contributor guardrail:**

Do not add long-term storage, trend queries, or historical aggregations to the MVP. If you need to answer "how many times has this happened?", focus on current state and recent window (for example, "in the last 48 hours"). Leave long-term trends to a post-MVP analytics layer.

---

### Standalone flow service decomposition

**What it is:**

- Extracting the flow insight capability into a standalone service that runs separately from the IDP BFF or web stacks.
- Introducing microservice patterns (for example, dedicated flow service with its own database, API gateway, and deployment pipeline).

**Why deferred:**

- The MVP is **embedded within the IDP stacks.** Adapters, inference engine, and transport layers are part of the Go and Node.js stacks, not separate services.
- Standalone service decomposition is justified by scale, isolation, or multi-tenancy requirements that do not exist in the MVP phase.
- Adding microservice complexity to the MVP increases deployment cost, operational overhead, and debugging difficulty without proven scale or isolation needs.

**Follow-on direction:**

- Post-MVP, if scale or isolation requirements emerge (for example, "we need to run flow inference for 1000 repositories concurrently" or "we need to isolate flow state from auth state"), introduce a standalone flow service.
- The standalone service must satisfy the same capability contract, pass the same fixture-based tests, and expose the same HTTP API and MCP tools. It is an implementation choice, not a semantic change.

**Contributor guardrail:**

Do not decompose the flow insight capability into a standalone service during the MVP phase. Keep it embedded in the BFF layer, and let scale or isolation requirements drive decomposition later.

---

## What happens when deferred scope is needed

If a contributor identifies a need for deferred scope during the MVP phase:

1. **Surface it as a follow-on issue.** Do not block MVP delivery on deferred capabilities.
2. **Document the use case.** Explain why the deferred capability is needed, what problem it solves, and how it fits with the MVP.
3. **Validate against the semantic model.** If the deferred capability requires changes to the canonical flow model or signal catalog, validate that those changes are backward-compatible and do not reshape the MVP.
4. **Plan the extension path.** Identify whether the deferred capability is:
   - An optional extension layer (for example, action layer, analytics layer) that consumes the insight contract.
   - A new signal that fits within the existing semantic model.
   - A separate capability (for example, CMDB, workflow engine) that should not be embedded in the flow insight contract.

Deferred capabilities should be added **incrementally and intentionally**, not reactively or as scope creep.

## Follow-on capability roadmap (illustrative)

The following capabilities are likely candidates for post-MVP phases. This is not a commitment or priority order; it is a guide to what might come next if the MVP succeeds.

### Phase 2: Action layer and write-back automation

- Introduce an optional action layer that consumes signals and executes write-back operations (for example, auto-merge, auto-revert, assign reviewers).
- Action layer is sandboxed, auditable, and reversible.
- Actions require explicit user approval or policy-driven automation; no silent auto-execution.

### Phase 3: Analytics and trend insights

- Introduce an analytics layer that subscribes to signal events and stores historical snapshots.
- Expose trend queries, dashboards, and reports as a separate capability.
- Analytics layer consumes the flow insight contract; it does not reshape the semantic model.

### Phase 4: Additional signals and providers

- Add new signals based on validated use cases (for example, "stale backlog item," "unassigned incident").
- Add new provider adapters (for example, Azure DevOps, Bitbucket).
- Maintain semantic equivalence across all signals and providers.

### Phase 5: Workflow control and orchestration

- If workflow control is needed, introduce it as a separate capability (for example, a workflow orchestration service) that consumes flow signals as input.
- Workflow control must not be embedded in the flow insight inference engine.

### Phase 6: Standalone service decomposition

- If scale or isolation requirements emerge, decompose the flow insight capability into a standalone service.
- Standalone service must satisfy the same capability contract and pass the same fixture-based tests.

These phases are illustrative. Actual follow-on work will depend on validated use cases, user feedback, and operational requirements.

## Summary

The flow insight MVP is intentionally small and focused on observation and inference. Deferred capabilities include:

- Write-back automation and change orchestration.
- Workflow engine behavior and transition control.
- Broad entity modeling beyond the six MVP signals.
- Heavy analytics platforming and long-term trend storage.
- Standalone flow service decomposition.

Deferred capabilities are not rejected; they are postponed until the MVP proves the core value and stability of the semantic model, provider adapters, and transport layers.

Contributors should avoid premature expansion and keep the MVP focused on the six core signals, rule-based inference, and provider-neutral observation.

**Model what changes action. Reference the rest.**

See [MVP Boundaries and Strategy](./mvp-boundaries) for the strategic direction and contributor guardrails.
