---
sidebar_position: 1
---

# Testing

Stemix IDP uses a three-layer testing architecture that keeps intent, proof, and
implementation cleanly separated. This section documents how testing works,
how to run tests, and how to build a new compliant implementation.

## Three-layer architecture

| Layer | What it is | Where it lives |
| --- | --- | --- |
| **Layer 1 — Intent specs** | Gherkin `.feature` files that declare what the platform must do, in plain language | `tests/features/` |
| **Layer 2 — Contract harness** | TypeScript test runner that proves implementations satisfy the intent specs via HTTP | `tests/src/` |
| **Layer 3 — Implementations** | Language and framework stacks that must pass all declared profiles | `stacks/` |

The `.feature` files are the ground truth. The TypeScript harness is derived
from them. When they disagree, the `.feature` file wins.

See [ADR-0009](../architecture/decisions/intent-specification-format) for the
rationale behind using Gherkin as the Layer 1 format.

## Conformance profiles

Tests are grouped into **conformance profiles**. Each profile covers a bounded
area of expected behavior. A stack declares which profiles it must pass in its
`stack.json`.

| Profile | Required by | Tests | Description |
| --- | --- | --- | --- |
| [`core`](./profiles/core) | All stacks | 4 | Baseline HTTP surface: reachability, content-type, and field presence |
| [`operational`](./profiles/operational) | Tier 1 stacks | 3 | Runtime conventions and exact semantic values |
| [`ui-profile`](./profiles/ui-profile) | UI stacks (opt-in) | 3 | Observable HTML output and declared rendering mode |
| [`mcp-profile`](./profiles/mcp-profile) | MCP servers (opt-in) | 4 | MCP initialize, tool discovery, and tool invocation |

## Guides

| Document | Audience | Description |
| --- | --- | --- |
| [Contract Test Harness](./contract-harness) | Implementers, contributors | How the harness works, how to run it, and how to build a new compliant implementation |
| [Core Profile](./profiles/core) | Implementers | Baseline scenarios every stack must pass |
| [Operational Profile](./profiles/operational) | Implementers | Semantic correctness scenarios for Tier 1 stacks |
| [UI Profile](./profiles/ui-profile) | Implementers | Opt-in UI behavior scenarios |
