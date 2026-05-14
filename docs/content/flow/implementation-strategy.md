---
sidebar_position: 8
---

# Implementation Strategy

This document describes how multiple implementation stacks satisfy the shared flow insight capability contract, how provider adapters are organized, and how contributors should approach implementing the MVP across different technology stacks.

## One capability contract, multiple implementations

The flow insight MVP is defined by its **capability contract**, not by any single implementation. The contract includes:

- The [canonical flow model](./model) — provider-neutral vocabulary for work items, changes, actors, and states.
- The [signal catalog](./signals) — six MVP signals with defined inference rules, explanation intent, and recommended actions.
- The [provider adapter contract](./adapter-contract) — normalized input types that adapters must produce.
- The [intent scenarios](./intent-scenarios) — Layer 1 Gherkin scenarios that express the MVP in testable form.
- Shared fixtures at `schema/fixtures/provider-adapter-input/` — YAML files that provide ground truth for contract testing.

Every implementation stack must:

1. Implement provider adapters for GitHub SaaS, GitLab SaaS, and GitLab self-managed that emit normalized types matching the [provider adapter contract](./adapter-contract).
2. Implement the inference engine that consumes normalized inputs and produces the six MVP signals.
3. Pass the same fixture-based contract tests defined in `tests/features/flow-insights.feature`.
4. Expose the insight contract via HTTP API routes and MCP tools with semantic equivalence across all stacks.

**Semantic equivalence is required.** Signal meaning, identity rules, severity intent, confidence intent, and recommended-action intent must match across stacks. Byte-for-byte equality is not required; formatting differences (for example, JSON key order, timestamp precision) must be documented in shared scenarios.

## Current implementation stacks

As of the current MVP phase, the following stacks are planned or in progress:

- **Go with net/http** — default reference implementation; REST API with Go standard library.
- **Node.js with React and Fastify** — React web UI with Fastify BFF; TypeScript throughout.

Additional stacks may be added later (for example, Java/Spring, Python/FastAPI) if they satisfy the same capability contract and pass the shared fixture-based tests.

## Stack independence and shared contract enforcement

Implementation stacks are **independent** in their internal choices:

- **Storage:** Each stack may choose its own storage layer (for example, in-memory maps, SQLite, PostgreSQL, key-value stores). Storage schemas are internal details, not part of the product contract.
- **Eventing:** Each stack may choose its own eventing approach (for example, polling, webhooks, message queues, SSE). Event handling is internal as long as the insight contract stays stable.
- **Language and framework:** Each stack uses its own language, framework, and tooling.

Implementation stacks are **constrained** by the shared capability contract:

- **Inference posture:** All stacks must use rule-based, deterministic inference. No opaque or AI-generated logic in the MVP core.
- **Fixture-based testing:** All stacks must pass the same fixtures and produce semantically equivalent signals.
- **Transport equivalence:** HTTP API and MCP tools must expose the same core model; transport-specific capabilities must not introduce semantic divergence.

See [ADR-0014: MVP Flow Observation Technical Foundations](../architecture/decisions/mvp-flow-observation-technical-foundations) for the technical decision on inference approach, storage boundaries, eventing posture, and cross-stack equivalence.

## Provider adapter organization

Provider adapters are organized by provider and stack. Each stack implements its own adapters for the three supported providers:

```text
stacks/
  go/net-http/rest/
    adapters/
      github/       — GitHub SaaS adapter (Go)
      gitlab/       — GitLab SaaS and self-managed adapter (Go)
  nodejs/react-fastify/rest/
    adapters/
      github/       — GitHub SaaS adapter (TypeScript)
      gitlab/       — GitLab SaaS and self-managed adapter (TypeScript)
```

Each adapter must:

- Fetch data from the provider API (GitHub REST API, GitLab REST API).
- Map provider-specific shapes into the normalized types defined in the [provider adapter contract](./adapter-contract).
- Emit normalized inputs for the inference engine to consume.
- Handle provider API gaps, rate limits, and authorization constraints gracefully (see missing-data and partial-data rules in the [provider adapter contract](./adapter-contract)).

Adapters **must not**:

- Perform inference or signal generation.
- Introduce provider-specific concepts into the semantic core.
- Leak provider-shaped types into the inference engine or transport layers.

### Adapter reuse across stacks

Adapters are **not shared** across stacks. Each stack implements its own adapters in its native language and framework.

This is intentional:

- It allows each stack to use idiomatic patterns and native libraries (for example, Go's `net/http` client vs. Node.js `fetch` or `axios`).
- It avoids creating a shared adapter library that would introduce cross-stack coupling and version drift.
- It enforces that adapter logic is straightforward normalization, not complex business logic worth sharing.

If adapter logic becomes complex enough to justify sharing, that is a signal to simplify the normalization rules or move complexity into the semantic core where it can be tested against shared fixtures.

## Inference engine organization

The inference engine is the core logic that:

- Consumes normalized inputs (the types defined in the [provider adapter contract](./adapter-contract)).
- Applies the inference rules defined in the [signal catalog](./signals).
- Produces the six MVP signals with explanation intent, recommended actions, and confidence levels.

Each stack implements its own inference engine:

```text
stacks/
  go/net-http/rest/
    inference/
      blocked_on_review.go
      trunk_integration_failure.go
      unclear_ownership.go
      waiting_on_evidence.go
      aging_implementation_to_validation.go
      risk_by_scope.go
  nodejs/react-fastify/rest/
    inference/
      blockedOnReview.ts
      trunkIntegrationFailure.ts
      unclearOwnership.ts
      waitingOnEvidence.ts
      agingImplementationToValidation.ts
      riskByScope.ts
```

Inference engines must:

- Be **rule-based, deterministic, and explainable.** No opaque or AI-generated logic in the MVP core.
- Pass the same fixture-based contract tests in `tests/features/flow-insights.feature`.
- Produce semantically equivalent signals across stacks (signal meaning, identity rules, severity intent, confidence intent, recommended-action intent must match).

Inference logic **must not**:

- Depend on provider-specific shapes. All inference operates on the normalized types from the provider adapter contract.
- Introduce workflow control, trigger transitions, or schedule jobs. Signals observe and recommend; they do not command.
- Leak storage or eventing choices into the signal definitions. The inference engine must be testable against fixtures without requiring a live database or message broker.

## Transport layer organization

Each stack exposes the flow insight capability through two transport layers:

1. **HTTP API** — RESTful routes for querying signals, subscribing to updates, and accessing flow state.
2. **MCP tools** — Model Context Protocol tools for AI-driven interaction and conversational access to flow insights.

Both transports must expose the same semantic model and signal catalog. Transport-specific capabilities (for example, MCP-specific tool arguments) must not introduce semantic divergence.

Example HTTP API routes (illustrative; actual routes may vary by stack):

- `GET /api/flow/signals` — list all active signals
- `GET /api/flow/signals/:signalId` — get signal details
- `GET /api/flow/repositories/:repoId/signals` — list signals scoped to a repository

Example MCP tools (illustrative; actual tools may vary by stack):

- `list_flow_insights` — list insights with optional provider/service/repo/team/actor filters
- `get_flow_insight` — get a single insight by `insightId`
- `list_my_blockers` — list blocker signals for a specific actor
- `list_service_risk_signals` — list aggregated risk signals for a service scope

See [ADR-0014: MVP Flow Observation Technical Foundations](../architecture/decisions/mvp-flow-observation-technical-foundations) for the technical decision on transport ownership and equivalence.

## Fixture-based contract testing

Shared fixtures at `schema/fixtures/provider-adapter-input/` define the ground truth for contract testing. Each fixture:

- Represents one flow insight scenario (for example, "blocked on review" with a GitHub pull request).
- Provides all normalized input types needed to trigger the signal.
- Is provider-independent (adapters translate provider-specific shapes into these normalized fixtures).

Every implementation stack must pass the same fixture-based tests. The contract test harness (TypeScript-based in `tests/src/profiles/`) loads fixtures, feeds them to each stack's inference engine via its HTTP API or MCP tools, and validates that the produced signals match the expected outcomes.

Example fixture flow:

1. Fixture YAML at `schema/fixtures/provider-adapter-input/blocked-on-review-github.yaml` provides normalized `NormalizedChange`, `NormalizedReviewState`, `NormalizedActor`, etc.
2. Contract test harness loads the fixture and calls the stack's HTTP API: `POST /api/flow/infer` with the fixture data.
3. Stack's inference engine consumes the normalized inputs, applies "blocked on review" inference rules, and returns a signal.
4. Contract test harness validates that the signal matches the expected outcome (for example, signal type is `blocked_on_review`, pending reviewers are listed, elapsed time is calculated correctly).

This flow is repeated for all six MVP signals across all provider configurations (GitHub SaaS, GitLab SaaS, GitLab self-managed).

See [Provider Adapter Contract](./adapter-contract) for the fixture YAML shape and normalization rules.

GitHub SaaS adapter normalization for the Node.js stack currently lives in
`stacks/nodejs/react-fastify/rest/bff/src/flow/github/adapter.ts` with fixtures
in `schema/fixtures/provider-adapter-input/blocked-on-review-github.yaml` and
`schema/fixtures/provider-adapter-input/trunk-integration-failed-github.yaml`.
Run `npm run test:bff` from `stacks/nodejs/react-fastify/rest` to validate the
adapter against those fixtures.

## Adding a new implementation stack

To add a new implementation stack (for example, Java/Spring, Python/FastAPI):

1. **Implement provider adapters** for GitHub SaaS, GitLab SaaS, and GitLab self-managed that emit the normalized types defined in the [provider adapter contract](./adapter-contract).
2. **Implement the inference engine** that consumes normalized inputs and produces the six MVP signals defined in the [signal catalog](./signals).
3. **Implement HTTP API routes** that expose the insight contract (for example, list signals, get signal details).
4. **Implement MCP tools** that expose the same capability via the Model Context Protocol.
5. **Pass the shared fixture-based contract tests** in `tests/features/flow-insights.feature` by running the contract test harness against your stack's HTTP API or MCP endpoint.
6. **Document any acceptable formatting differences** (for example, timestamp precision, JSON key order) in the shared scenarios and fixtures.

The new stack is considered MVP-complete when it satisfies the capability contract and passes all fixture-based tests with semantic equivalence.

## Adding a new provider adapter

To add a new provider (for example, Azure DevOps, Bitbucket):

1. **Define the normalization rules** for the new provider in the [provider adapter contract](./adapter-contract). Map the provider's concepts (for example, pull request vs. merge request) into the normalized types.
2. **Create shared fixtures** at `schema/fixtures/provider-adapter-input/` that represent the new provider's normalized inputs for all six MVP signals.
3. **Implement the adapter** in each stack (or in the stacks where the new provider is needed) following the adapter organization above.
4. **Update the contract test harness** to load the new fixtures and validate that signals are produced correctly.
5. **Document provider capability notes** in the [provider adapter contract](./adapter-contract) if the new provider has gaps or unique features.

The new provider is considered supported when all stacks that implement it satisfy the normalization rules and pass the shared fixture-based tests.

## Implementation priorities and sequencing

For the MVP, the recommended implementation sequence is:

1. **Go stack:** Implement adapters, inference engine, HTTP API, and MCP tools. Use this stack to validate the semantic model and signal catalog against shared fixtures.
2. **Node.js stack:** Implement in parallel or immediately after Go to validate cross-stack equivalence and catch semantic drift early.
3. **Controlled GitLab harness:** Set up a GitLab CE or self-managed instance for end-to-end validation of adapters and inference against a real provider API (not just fixture YAML).
4. **Additional stacks or providers:** Add as needed once the first two stacks demonstrate stable semantic equivalence.

See [MVP Boundaries and Strategy](./mvp-boundaries) for the strategic direction and contributor guardrails.

## Summary

The flow insight MVP is one capability contract with multiple implementations. Each stack:

- Implements provider adapters that normalize provider-specific shapes into the shared contract.
- Implements the inference engine that applies deterministic, rule-based logic to produce the six MVP signals.
- Exposes the insight contract via HTTP API and MCP tools with semantic equivalence.
- Passes the same fixture-based contract tests to prove semantic consistency.

Stacks are independent in their internal choices (storage, eventing, language, framework) but constrained by the shared capability contract (semantic model, signal catalog, provider adapter contract, intent scenarios, fixtures).

**One capability contract, multiple implementations.**
