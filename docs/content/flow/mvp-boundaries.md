---
sidebar_position: 7
---

# MVP Boundaries and Strategy

This document explains what the flow insight MVP is and what it is not, so contributors stay aligned on scope, boundaries, and strategic direction.

## What this MVP is

The flow insight MVP is:

- **One shared capability contract with multiple possible implementations** — the semantic model and insight contract are the product surface, not any single stack or storage schema.
- **A provider-neutral observation and inference capability** — it observes flow states across GitHub and GitLab, infers actionable signals, and exposes those signals through HTTP API, MCP tools, and UI consumption layers like Backstage.
- **Focused on six core signals** that change action: blocked on review, passed checks but failing trunk integration, unclear ownership, waiting on evidence (not effort), aging work between implementation and validation, and risk signals by service/team/stage.
- **Thin provider adapters feeding a shared semantic core** — adapters normalize provider-specific shapes (GitHub pull requests, GitLab merge requests) into the [provider adapter contract](./adapter-contract), and the inference engine operates only on those normalized types.
- **Fixture-driven and deterministic** — shared fixtures at `schema/fixtures/provider-adapter-input/` define the ground truth for contract testing, and every implementation stack must satisfy the same fixture-based scenarios.

## What this MVP is not

The flow insight MVP is **not**:

- **A Configuration Management Database (CMDB)** — it does not model exhaustive entity graphs, historical audit trails, or broad organizational relationships. It models only the concepts that change action for the six MVP signals.
- **A workflow engine** — it observes states and infers signals; it does not trigger transitions, schedule jobs, or own the flow progression. Write-back automation and orchestration are explicitly deferred.
- **A vendor abstraction exercise** — provider coverage is a means to an end, not the goal. The semantic model is the center of gravity, and adapters exist to normalize inputs, not to expose every provider feature.
- **A stack-specific implementation center** — no single reference stack is canonical for product meaning. All stacks must satisfy the same capability contract, and semantic equivalence is required across implementations.
- **A storage or eventing product** — storage schemas and eventing patterns are internal implementation details. The durable product surface is the shared insight contract exposed via HTTP API and MCP tools.

## Why the semantic core must stay provider-neutral

Provider-specific concepts (for example, GitHub Checks API vs. GitLab Pipelines, CODEOWNERS syntax differences) are normalized at the adapter boundary. The semantic core operates only on the provider-neutral types defined in the [provider adapter contract](./adapter-contract).

This boundary:

- Keeps the core inference logic simple and testable against shared fixtures.
- Allows new providers to be added without reshaping the semantic model.
- Prevents provider-shaped drift where GitHub assumptions leak into the signal definitions or UI.

**Contributor guardrail:** Do not reference provider-specific fields or behaviors in the semantic core, signal definitions, or contract tests. All provider-specific logic must stay inside the adapter layer.

## Why adapters exist

Adapters are thin normalization layers that:

- Fetch data from provider APIs (GitHub REST API, GitLab REST API).
- Map provider-specific shapes into the normalized types defined in the [provider adapter contract](./adapter-contract).
- Emit normalized inputs for the inference engine to consume.

Adapters **must not**:

- Perform inference or signal generation.
- Introduce provider-specific concepts into the semantic core.
- Become fat translation layers with complex logic; normalization should be straightforward.

See [Provider Adapter Contract](./adapter-contract) for the required normalized output types and normalization rules.

## Why GitLab CE or self-managed is used as a controlled harness

A controlled GitLab CE or self-managed instance provides deterministic end-to-end validation of adapters and inference:

- It allows the test harness to create known states (for example, an MR stuck in review for 36 hours) without relying on live GitHub or GitLab SaaS rate limits or variable latency.
- It validates that the GitLab adapter correctly normalizes GitLab-specific shapes into the provider-neutral contract.
- It confirms that inference logic produces the expected signals against a real provider API, not just fixture YAML.

**Important:** The controlled harness validates boundaries and behavior but **does not define truth**. The ground truth is the [canonical flow model](./model) and [signal catalog](./signals), not the GitLab harness setup.

## How GitHub SaaS, GitLab SaaS, and GitLab self-managed fit together

The MVP supports three provider configurations:

1. **GitHub SaaS** — production use case; adapters fetch from GitHub REST API and normalize pull requests, reviews, checks, and CODEOWNERS into the shared contract.
2. **GitLab SaaS** — production use case; adapters fetch from GitLab REST API and normalize merge requests, approvals, pipelines, and code owner rules into the shared contract.
3. **GitLab self-managed** — controlled harness for deterministic testing; also a production use case for organizations that self-host GitLab.

All three configurations feed the same semantic core. Adapter implementations may differ (for example, GitHub uses Checks API while GitLab uses Pipelines), but the normalized output must match the [provider adapter contract](./adapter-contract).

**Three adapters, one core model, one controlled harness.**

## How multiple implementation stacks can satisfy one shared capability contract

The IDP architecture supports multiple implementation stacks (for example, Go with net/http, Node.js with React and Fastify) that all satisfy the same capability contract.

For the flow insight MVP:

- Each stack must implement adapters for GitHub SaaS, GitLab SaaS, and GitLab self-managed that emit the normalized types defined in the [provider adapter contract](./adapter-contract).
- Each stack must implement the inference engine that consumes normalized inputs and produces the six MVP signals defined in the [signal catalog](./signals).
- Each stack must pass the same fixture-based contract tests rooted at `tests/features/flow-insights.feature` and backed by fixtures in `schema/fixtures/provider-adapter-input/`.
- Each stack must expose the insight contract via HTTP API routes and MCP tools with semantic equivalence (signal meaning, identity rules, severity intent, confidence intent, recommended action intent must match).

**Semantic equivalence is required; byte-for-byte equality is not.** Acceptable formatting differences (for example, JSON key order, timestamp precision) must be documented in shared scenarios.

See [ADR-0014: MVP Flow Observation Technical Foundations](../architecture/decisions/0014-mvp-flow-observation-technical-foundations) for the technical decision on cross-stack equivalence and fixture strategy.

## Why HTTP API and MCP expose the same core meaning

The flow insight capability is exposed through two transport layers:

- **HTTP API** — RESTful routes for querying signals, subscribing to updates, and accessing flow state.
- **MCP tools** — Model Context Protocol tools for AI-driven interaction and conversational access to flow insights.

Both transports must expose the same semantic model and signal catalog. They are consumption layers, not definition layers.

**Contributor guardrail:** Do not introduce transport-specific semantics. If a capability is valuable, it should be available in both HTTP API and MCP. If a capability only makes sense in one transport (for example, MCP-specific tool arguments for context handling), it must not diverge the signal meaning or insight contract.

## Why Backstage consumes the API rather than defining the domain

Backstage is a UI consumer of the flow insight capability. It:

- Calls the HTTP API to fetch flow signals and state.
- Renders signals in widgets, dashboards, and catalog views.
- May introduce Backstage-specific presentation choices (for example, grouping signals by service or team).

Backstage **must not**:

- Reshape the semantic model to fit Backstage's entity model or plugin conventions.
- Define signal logic or inference rules inside Backstage plugins.
- Introduce Backstage-specific flow concepts that diverge from the canonical model.

The semantic model and signal catalog are the source of truth; Backstage adapts to them, not the other way around.

## What is intentionally deferred until later

The following capabilities are explicitly deferred to post-MVP or later phases:

- **Write-back automation and change orchestration** — the MVP observes and infers; it does not auto-merge, auto-revert, or trigger workflow transitions.
- **Workflow engine behavior** — the MVP does not schedule jobs, manage queues, or own flow progression. It observes states; providers own the transitions.
- **Broad entity modeling** — the MVP models only the concepts needed by the six signals. It does not model exhaustive backlog graphs, org charts, or CMDB-style relationships.
- **Heavy analytics platforming** — the MVP provides current-state insights, not long-term trend analysis, historical audit trails, or time-series storage.
- **Standalone flow service decomposition** — the MVP is embedded within the IDP stacks. A separate flow-only service may be justified later by scale or isolation requirements, but it is not an MVP goal.

See [ADR-0014: MVP Flow Observation Technical Foundations](../architecture/decisions/0014-mvp-flow-observation-technical-foundations) for the full deferred scope list.

## What contributors must not do while extending this MVP

To keep the MVP focused and prevent predictable drift:

- **Do not expand into CMDB territory** — resist the urge to model exhaustive entities, relationships, or ownership graphs. Only model what changes action.
- **Do not introduce workflow control** — do not add triggers, transition rules, or scheduling primitives. Signals observe; they do not command.
- **Do not let provider coverage define value** — adding a new provider is useful only if it feeds the same semantic core. Do not shape the model around provider-specific features.
- **Do not let storage or eventing choices become the public product contract** — storage schemas and eventing patterns are internal. The durable contract is the insight API and MCP tools.
- **Do not make one stack canonical for product meaning** — all stacks must satisfy the same capability contract. If you add a signal or change inference rules, update the shared model and fixtures so all stacks can align.
- **Do not introduce transport-specific semantics** — if HTTP API and MCP diverge on signal meaning, one is wrong. Fix the divergence; do not document it as acceptable.

## Summary

The flow insight MVP is one shared capability contract with multiple implementations, thin provider adapters, deterministic fixture-based testing, and transport equivalence. It is **not** a CMDB, workflow engine, vendor abstraction layer, or storage product.

The semantic model and signal catalog are the center of gravity. Stacks, adapters, transports, and UIs consume them; they do not redefine them.

**Three adapters, one core model, one controlled harness.**

**Model what changes action.**
