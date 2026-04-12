---
status: proposed
date: 2026-04-11
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# ADR-0014: MVP Flow Observation Technical Foundations

## Context and Problem Statement

The flow insight capability needs a small set of firm technical decisions
before provider adapters, inference engines, API surfaces, MCP tools, or
Backstage views expand beyond the foundational semantic model and adapter
contract already established in `docs/content/flow/`.

Without these locked decisions, downstream implementation work is likely
to drift into:

- stack-first design where one reference implementation becomes the
  hidden source of truth for product meaning
- provider-shaped logic where adapter internals leak into the semantic
  core
- storage-first or eventing-first architecture where infrastructure
  choices become the product contract
- premature service decomposition before the capability proves value
  through a single shared contract
- cross-stack divergence disguised as progress, where each
  implementation invents its own interpretation of equivalence

This ADR exists to prevent those failure modes by locking the MVP
technical direction for inference, storage boundaries, eventing, fixture
strategy, cross-stack equivalence, transport ownership, and deferred
scope.

### Gate Assessment

<!-- ADR intake threshold per AGENTS.md -->

- **Cross-cutting scope** — these decisions affect every provider
  adapter, every implementation stack, every transport surface, and every
  consumer (API, MCP, Backstage).
- **Costly to reverse** — once adapters, inference engines, and fixtures
  are built against these foundations, changing them requires coordinated
  migration across stacks, tests, and documentation.
- **Contract surface** — the inference approach, storage boundary model,
  fixture contract, equivalence rules, and transport ownership define the
  boundaries between modules and between teams.
- **Multi-quarter longevity** — these foundations are expected to remain
  valid for the full lifecycle of the MVP and into subsequent capability
  expansion.
- **Drift risk** — without a codified record, each implementation stack
  and each agent will make independent assumptions about inference style,
  storage coupling, eventing shape, and equivalence expectations.

All five gates are true. Two are hard gates (costly to reverse, contract
surface). The intake threshold is met.

## Decision Drivers

- The canonical flow model (`docs/content/flow/model.md`) and signal
  catalog (`docs/content/flow/signals.md`) define the shared vocabulary;
  technical foundations must support them without reshaping them
- The provider adapter contract (`docs/content/flow/adapter-contract.md`)
  defines normalized input types; the inference engine must consume those
  types, not raw provider shapes
- The scope guardrails (`docs/content/flow/scope.md`) explicitly exclude
  storage schemas, HTTP routes, MCP tools, and UI behaviors from the
  semantic core; technical foundations must respect those boundaries
- Multiple implementation stacks must satisfy the same capability
  contract without sharing internals
- The MVP must remain read-only, explainable, and clearly bounded

## Considered Options

### Option A: Defer all technical foundations

Let each implementation stack decide independently how to handle
inference, storage, eventing, fixtures, and equivalence.

### Option B: Lock the full production architecture

Define storage engines, event brokers, deployment topology, and service
boundaries now.

### Option C: Lock the minimum viable technical foundations (chosen)

Define the inference approach, storage boundary model, eventing approach,
fixture strategy, cross-stack equivalence expectations, transport
ownership, and deferred scope — without prescribing specific
technologies, engines, or deployment shapes.

## Decision Outcome

Chosen option: "Lock the minimum viable technical foundations", because
the MVP needs enough shared direction to prevent drift and enough freedom
to allow each implementation stack to choose its own internals. The
decisions below lock the approach, not the implementation.

### 1. Inference approach

The MVP inference engine must be:

- **Rule-based** — deterministic rules that can be read, reviewed, and
  predicted by contributors.
- **Code-first** — inference logic lives in code, not in a DSL, config
  file, or external rules engine.
- **Explainable** — every inferred signal must produce a human-readable
  explanation and a recommended next action, as defined in the signal
  catalog (`docs/content/flow/signals.md`).
- **Deterministic against shared fixtures** — given the same fixture
  input, every conforming implementation must produce semantically
  equivalent output.

The inference engine must not use AI-generated, probabilistic, or opaque
decision logic in the MVP. Confidence levels in signal output reflect
data completeness and provenance quality, not model uncertainty.

The core inference logic must operate on the normalized types from the
provider adapter contract (`docs/content/flow/adapter-contract.md`), not
on raw GitHub or GitLab API shapes. Provider-specific branching inside
the semantic core is prohibited unless explicitly justified and
documented.

### 2. Storage boundaries

Three conceptual data shapes exist in the flow insight pipeline:

1. **Raw provider observations** — data as retrieved from provider APIs,
   before normalization.
2. **Normalized provider-neutral flow state** — data in the normalized
   types defined by the adapter contract
   (`docs/content/flow/adapter-contract.md`).
3. **Inferred insights** — signal outputs produced by the inference
   engine, as defined in the signal catalog
   (`docs/content/flow/signals.md`).

These three shapes must be kept conceptually separate even when they
share one physical store in the MVP. The separation is enforced at the
module boundary: no downstream consumer may depend on the internal
structure of an upstream shape.

The storage schema must never become the product contract. The durable
product surface is the shared insight contract exposed through
transports, not the internal persistence model.

### 3. Eventing approach

The MVP uses **event-informed current-state refresh**:

- Provider observations are fetched or received and used to update a
  current-state projection.
- The inference engine operates on the current-state projection, not on
  an event stream.
- Events are informational inputs, not the long-term source of truth.

The MVP is explicitly **not** event-sourced. It does not require a
message broker, event bus, or durable event log as a prerequisite. It is
not a broker-first architecture.

Implementations may use lightweight event notification internally (for
example, to trigger a refresh cycle), but the eventing mechanism is an
implementation detail, not a product contract.

### 4. Fixture strategy

One shared fixture catalog exists, rooted at
`schema/fixtures/provider-adapter-input/`. The existing
`blocked-on-review-github.yaml` fixture establishes the canonical shape.

The fixture strategy requires:

- **Provider-specific observations mapped to the normalized contract** —
  each fixture provides normalized input types as defined in the adapter
  contract (`docs/content/flow/adapter-contract.md`), not raw provider
  API responses.
- **Expected insight outputs owned by shared contract tests** — the
  `tests/` directory owns the expected signal outputs for each fixture
  scenario. Signal expectations follow the semantics defined in the
  signal catalog (`docs/content/flow/signals.md`).
- **Self-contained fixtures** — each fixture file must be usable without
  a live provider API and without referencing external resources.
- **One fixture catalog, multiple consumers** — the same fixtures are
  consumed by all implementation stacks and by contract tests. No stack
  maintains a private fixture set that diverges from the shared catalog.

### 5. Cross-stack equivalence

Semantic equivalence is required across maintained implementation stacks.

**Required equivalence:**

- Same signal meaning and identity rules
- Same severity or priority intent
- Same confidence behavior intent
- Same recommended-action intent

**Not required (unless explicitly stated):**

- Byte-for-byte identical wording in explanation text
- Identical ordering of signals or sub-fields where order is not part of
  the contract
- Identical incidental metadata not defined in the signal catalog

Allowed differences between stacks must be documented in the scenario
tests that enforce equivalence. Undocumented divergence is treated as a
defect.

### 6. Transport ownership

The shared insight contract is the durable product surface.

- HTTP API and MCP tools expose the same core model. Neither transport
  defines the model; both consume it.
- Backstage consumes the API and does not define the model. The UI
  renders insights; it does not own their shape or meaning.
- No transport surface is allowed to reshape, extend, or subset the core
  insight contract without an explicit contract change that flows back to
  the shared model.

The transport surfaces are thin adapters over the shared insight
contract, following the same thin-adapter principle that governs provider
adapters.

### 7. Deferred scope

The following are explicitly deferred from the MVP:

- **Write-back automation** — the MVP is read-only and does not modify
  upstream provider state.
- **Orchestration** — the MVP does not coordinate actions across
  providers or services.
- **Workflow engine behavior** — the MVP observes flow states but does
  not own or drive transitions between them.
- **Broad entity modeling** — the MVP models only the concepts defined in
  the canonical flow model (`docs/content/flow/model.md`); it does not
  expand into a general-purpose entity catalog.
- **Heavy analytics platforming** — the MVP produces actionable signals,
  not historical analytics, dashboards, or trend reports.
- **Standalone flow service decomposition** — the flow insight capability
  is not extracted into a standalone service unless later justified by
  operational need.

These deferrals align with the scope guardrails documented in
`docs/content/flow/scope.md`.

### Consequences

- Good, because each implementation stack has clear boundaries without
  being forced to converge on shared internals.
- Good, because the inference approach is auditable and deterministic,
  building trust in signal output from the start.
- Good, because the storage boundary model prevents the persistence layer
  from becoming the product contract, preserving freedom to change
  storage later.
- Good, because the fixture strategy enables shared contract testing
  across stacks without requiring a live provider environment.
- Good, because the equivalence rules make cross-stack drift visible and
  actionable rather than silent.
- Good, because the transport ownership rule prevents UI or API concerns
  from reshaping the semantic core.
- Neutral, because the event-informed refresh approach is simpler than
  event sourcing but may need to be revisited if the capability later
  requires historical replay or audit trails.
- Bad, because the deferred scope list may frustrate contributors who
  want to build write-back or orchestration capabilities now; the
  deferral is intentional but must be communicated clearly.

### Confirmation

The following artifacts confirm alignment with this ADR:

- `docs/content/flow/model.md` — canonical flow model vocabulary
- `docs/content/flow/signals.md` — signal catalog with inference rules
  and worked examples
- `docs/content/flow/adapter-contract.md` — normalized input types and
  normalization rules
- `docs/content/flow/scope.md` — scope guardrails preventing CMDB,
  workflow-engine, and provider-shape drift
- `docs/content/flow/intent-scenarios.md` — Layer 1 Gherkin intent
  scenarios for the MVP signals
- `tests/features/flow-insights.feature` — ground-truth Gherkin
  scenarios
- `schema/fixtures/provider-adapter-input/` — shared fixture catalog

## Pros and Cons of the Options

### Defer all technical foundations

- Good, because maximum implementation freedom for each stack
- Bad, because each stack will independently invent inference style,
  storage coupling, and equivalence interpretation
- Bad, because cross-stack drift becomes invisible until late integration
- Bad, because fixture and test strategies will diverge

### Lock the full production architecture

- Good, because complete alignment from the start
- Bad, because premature commitment to storage engines, event brokers,
  and deployment topology
- Bad, because it contradicts the capability-first principle by making
  infrastructure the center of gravity
- Bad, because it reduces implementation freedom unnecessarily for an MVP

### Lock the minimum viable technical foundations (chosen)

- Good, because locks the approach without prescribing technology choices
- Good, because preserves implementation freedom within clear boundaries
- Good, because aligns fixture and equivalence expectations early enough
  to prevent drift
- Good, because deferred scope is explicit rather than implied
- Bad, because some ambiguity remains in areas not covered by these seven
  decisions; follow-on ADRs may be needed as the capability matures

## More Information

### Guardrail summary

One shared capability contract, multiple implementations, thin adapters,
explainable inference, stable transports. This ADR exists to reduce
coordination cost, not add architecture ceremony.

### Related Decisions

- [ADR-0001](0001-intent-driven-architecture.md) — layered
  intent/contract/implementation architecture
- [ADR-0003](0003-contract-harness-and-runtime-port-contract.md) —
  contract harness mechanics and runtime port defaults
- [ADR-0005](0005-shared-capability-contract-and-conformance-profiles.md)
  — profile-based conformance model
- [ADR-0009](0009-intent-specification-format.md) — Gherkin as the
  Layer 1 intent specification format
