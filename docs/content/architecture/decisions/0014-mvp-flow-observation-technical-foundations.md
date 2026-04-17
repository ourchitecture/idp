---
status: accepted
date: 2026-04-17
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# ADR-0014: MVP Flow Observation Technical Foundations

## Context and Problem Statement

The flow insight MVP spans multiple implementation stacks and must decide on technical foundations for inference, storage boundaries, eventing posture, fixture strategy, and transport equivalence. Without explicit technical decisions, stacks may diverge on inference approaches (rule-based vs. ML-based), storage patterns (normalized vs. raw-only), eventing strategies (event sourcing vs. current-state refresh), or fixture ownership (stack-local vs. shared). This ADR establishes the required technical posture to keep all implementations aligned to the same capability contract while maintaining stack independence.

### Gate Assessment

- **Cross-cutting scope** — affects the semantic core, adapter contract, inference engine, transports, fixtures, and every implementation stack.
- **Costly to reverse** — changing the inference posture, storage boundaries, or transport ownership would require coordinated updates across providers, stacks, and contract tests.
- **Contract surface** — defines the durable surface for insights, expected adapter boundaries, and transport equivalence.
- **Multi-quarter longevity** — the MVP guardrails protect all downstream flow work and future stacks.
- **Drift risk** — without an explicit foundation, contributors could reintroduce provider-shaped models, workflow control, or storage schemas as contracts.

All five gates are true. The ADR intake threshold is met.

## Decision Drivers

- Implementations must share the same semantic inference posture to ensure cross-stack equivalence.
- Storage schema and eventing choices must remain internal; only the insight contract is public.
- Fixtures must be shared and provider-independent to enable deterministic testing across stacks.
- Transport layers (HTTP API, MCP) must expose equivalent capabilities without redefining the model.
- Technical decisions must preserve stack independence while enforcing semantic consistency.

## Considered Options

- **Option 1:** Leave technical decisions implicit and let each stack choose its own inference, storage, eventing, and fixture approaches independently.
- **Option 2:** Lock technical foundations around one reference stack and require other stacks to match its choices.
- **Option 3:** Establish shared technical foundations (inference posture, storage boundaries, eventing approach, fixture catalog) while preserving stack implementation independence.

**Chosen option:** Option 3, because it enforces semantic consistency and deterministic testing across stacks without dictating implementation details or tying the product surface to any single stack.

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
- Fixtures are the source of truth for contract testing; stacks must pass the same fixture-based scenarios to satisfy the shared capability contract.

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
- Backstage and other UI consumers consume the API; they must not define the domain or reshape the model.
- Transport-specific capabilities (for example, MCP-only tool arguments) must not introduce semantic divergence from the HTTP API.

### Deferred scope

Deferred to post-MVP or later capability phases:

- Write-back automation and change orchestration
- Workflow engine behavior or transition control
- Broad entity modeling beyond the six MVP signals
- Heavy analytics platforming or long-term trend storage
- Standalone flow service decomposition unless later justified by scale or isolation requirements

## Consequences

- Good, because shared technical foundations enforce semantic consistency across all stacks and providers.
- Good, because fixture-based contract testing provides deterministic validation without coupling to any provider or stack.
- Good, because transport equivalence ensures API, MCP, and UI consumers see the same capability model.
- Good, because storage and eventing remain internal, allowing stacks to evolve implementations without breaking the product contract.
- Neutral, because maintaining fixture catalogs and semantic equivalence tests requires ongoing upkeep.
- Bad if ignored, because divergent inference or storage-first designs would fragment the capability and increase cross-stack migration cost.

## Validation

- Cross-stack equivalence is validated through the shared flow insight contract tests (`tests/features/flow-insights.feature`, `tests/src/profiles/flow-insights.ts`) and the provider adapter fixtures in `schema/fixtures/provider-adapter-input/`. Documented results and harness coverage are captured in [Cross-Stack Equivalence](../../flow/cross-stack-equivalence.md).

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
