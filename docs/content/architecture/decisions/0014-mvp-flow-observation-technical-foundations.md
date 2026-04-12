---
status: proposed
date: 2026-04-12
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# ADR-0014: MVP Flow Observation Technical Foundations

## Context and Problem Statement

The flow insight capability must stay capability-first: one shared semantic model, thin provider adapters, and stable transports that expose the same meaning. Without a recorded foundation, the MVP can drift toward a CMDB, a workflow engine, a vendor abstraction exercise, or storage- and eventing-first designs. The work also spans multiple stacks and provider adapters (GitHub SaaS, GitLab SaaS, GitLab self-managed) plus a controlled GitLab harness used only for validation. This ADR locks the technical foundations so contributors align on “three adapters, one core model, one controlled harness” and avoid turning any single implementation, provider, or storage choice into the product contract.

### Gate Assessment

- **Cross-cutting scope** — affects the semantic core, adapter contract, inference engine, transports, fixtures, and every implementation stack.
- **Costly to reverse** — changing the inference posture, storage boundaries, or transport ownership would require coordinated updates across providers, stacks, and contract tests.
- **Contract surface** — defines the durable surface for insights, expected adapter boundaries, and transport equivalence.
- **Multi-quarter longevity** — the MVP guardrails protect all downstream flow work and future stacks.
- **Drift risk** — without an explicit foundation, contributors could reintroduce provider-shaped models, workflow control, or storage schemas as contracts.

All five gates are true. The ADR intake threshold is met.

## Decision Drivers

- One shared capability contract with multiple possible implementations.
- The semantic model is the center of gravity; provider adapters remain thin.
- The durable product surface is the shared insight contract, not any storage schema.
- The controlled GitLab harness validates boundaries and behavior but does not define truth.
- HTTP API and MCP must expose the same core model; Backstage consumes the API rather than defining it.
- Write-back automation and orchestration remain out of scope for this slice.

## Considered Options

- Leave decisions implicit and let each stack choose its own approach.
- Lock foundations around one provider or one stack and let others follow later.
- Lock provider-neutral foundations now and keep transports and stacks aligned to the same semantic core.

Chosen option: lock provider-neutral foundations now so all stacks and transports align to the same semantic core while adapters stay thin.

## Decision Outcome

### Inference approach

- Rule-based, code-first, and explainable.
- Deterministic against shared fixtures; no opaque or AI-generated logic in the MVP core.
- Runs on normalized inputs defined in the [Provider Adapter Contract](../../flow/adapter-contract).

### Storage boundaries

- Three conceptual shapes are kept separate even if they share one physical store early: raw provider observations, normalized provider-neutral flow state, and inferred insights.
- None of these shapes is the product contract; the shared insight contract is.
- Module boundaries and tests enforce the separation; storage schemas remain internal details.

### Eventing approach

- Event-informed current-state refresh.
- Not event sourcing and not broker-first; events update projections rather than becoming the long-term source of truth.
- Refresh cadence and event handlers are internal details as long as the exposed insight contract stays stable.

### Fixture strategy and controlled harness

- One shared fixture catalog rooted at `schema/fixtures/provider-adapter-input/`, extending the established patterns such as `blocked-on-review-github.yaml`.
- Provider-specific observations map into the normalized contract; expected insight outputs are owned by shared contract tests.
- A controlled GitLab CE or self-managed harness provides deterministic end-to-end validation of adapters and inference. It validates boundaries and behavior but does not define semantic truth.

### Provider strategy and adapter posture

- Three adapters (GitHub SaaS, GitLab SaaS, GitLab self-managed) feed one core model.
- Adapters remain thin normalization layers; they must not leak provider-specific concepts into the semantic core.
- Provider coverage does not define value; the normalized insight contract does.

### Cross-stack equivalence

- Semantic equivalence is required across implementations: signal meaning, identity rules, severity or priority intent, confidence intent, and recommended-action intent must match.
- Byte-for-byte equality is not required unless explicitly stated; acceptable differences (for example formatting) must be documented in shared scenarios and fixtures.
- Multiple implementation stacks can satisfy the same capability contract without shared internals.

### Transport ownership

- The shared insight contract is the durable product surface.
- HTTP API and MCP expose the same core model; transports do not redefine meaning.
- Backstage consumes the API; it must not define the domain or reshape the model.

### Deferred scope and contributor guardrails

- Deferred: write-back automation, orchestration, workflow engine behavior, broad entity modeling, heavy analytics platforming, standalone flow service decomposition unless later justified.
- Do not let storage or eventing choices become public contracts.
- Do not expand into CMDB territory or vendor-abstraction exercises.
- Do not imply that one reference stack is canonical for product meaning.

## Consequences

- Good, because contributors share one semantic center and can add providers or stacks without redefining the product surface.
- Good, because a controlled GitLab harness and shared fixtures keep adapters and inference deterministic without becoming sources of truth.
- Good, because transports stay aligned: API, MCP, and Backstage consume the same contract.
- Neutral, because maintaining fixture catalogs and semantic equivalence tests requires ongoing upkeep.
- Bad if ignored, because provider-shaped or storage-first designs would fragment the capability and increase migration cost.

## Confirmation

- Semantic anchors: [Flow Model](../../flow/model), [Signals](../../flow/signals), [Scope](../../flow/scope).
- Normalization boundary: [Provider Adapter Contract](../../flow/adapter-contract).
- Intent protection: [Intent Scenarios](../../flow/intent-scenarios) and `tests/features/flow-insights.feature`.
- Fixture catalog: `schema/fixtures/provider-adapter-input/`.

## Related Decisions

- [0001](./intent-driven-architecture) — layered intent/contract/implementation architecture.
- [0003](./contract-harness-and-runtime-port-contract) — contract harness and runtime port contract.
- [0005](./shared-capability-contract-and-conformance-profiles) — shared capability contract and conformance profiles.
- [0009](./intent-specification-format) — Gherkin Layer 1 intent specification format.
