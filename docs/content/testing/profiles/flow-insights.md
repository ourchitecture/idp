---
sidebar_position: 7
---

# Flow Insights Profile

The `flow-insights` profile proves that a stack can infer the six canonical MVP
flow insight signals from normalized provider adapter inputs, produce
human-readable explanations and recommended next actions, and maintain
semantic equivalence across GitHub and GitLab normalized inputs.

## Why it exists

The MVP depends on consistent interpretation across multiple providers, multiple
implementation stacks, and multiple transport surfaces. Without shared scenarios
and expected outcomes, implementations will drift even when each local
implementation appears correct. This profile makes semantic drift visible and
unacceptable across stacks.

## Layer 1 spec

Source: [`tests/features/flow-insights.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/flow-insights.feature)

## Scenarios (16 total)

### Provider-neutral core scenarios

These six scenarios define the canonical signal semantics regardless of
provider. They are provider-neutral and must pass for any conforming stack.

| Scenario | What is checked |
| --- | --- |
| Blocked on review is surfaced with context | `awaiting_review` change past expected window; explanation names reviewers; action targets reviewers |
| Passed checks but failing trunk integration is highlighted | Branch `passed`, trunk `failed`; explanation contrasts both; action is remediate or roll back |
| Unclear ownership is flagged for resolution | Ownership `unclear`; explanation lists conflicting owners; action confirms single owner |
| Waiting on evidence, not effort, is differentiated | Evidence `pending`; explanation lists missing items; action is supply evidence |
| Aging work between implementation and validation is exposed | Trunk validation `pending` past expected window; explanation cites delay |
| Risk is aggregated by service from clustered signals | Three signals in 48 hours for one service; explanation aggregates contributing signals |

### Provider-specific scenarios

| Scenario | Tag | What is checked |
| --- | --- | --- |
| GitHub blocked on review via CODEOWNERS reviewer identity | `@github` | Named reviewers from CODEOWNERS; action targets them by name |
| GitLab blocked on review via approval threshold not met | `@gitlab` | Approval count 0 of required 2; explanation reflects threshold |
| GitLab self-managed blocked on review with partial identity | `@gitlab-self-managed` | `is_partial: true` on review state; confidence reduced |
| GitHub trunk failure after clean Checks API pass | `@github` | Checks API `passed`, trunk `failed`; explanation references both |
| GitLab trunk failure after passing MR pipeline | `@gitlab` | MR pipeline `passed`, trunk pipeline `failed` |
| Ownership ambiguity with two conflicting teams | `@github` | Two CODEOWNERS entries; explanation names both teams |
| GitHub waiting on evidence with identified responsible actor | `@github` | Evidence `pending`; actor named in explanation |
| GitLab waiting on evidence with group ownership | `@gitlab` | Compliance attestation `pending`; group owner context |
| Reduced confidence from partial data | `@github` | `is_partial: true` on review state reduces confidence to `medium` or lower |

### Cross-provider equivalence scenarios

| Scenario | Tag | What is checked |
| --- | --- | --- |
| Blocked on review inferred equivalently from GitHub and GitLab | `@cross-provider` | Same signal `id`, same severity intent, same confidence tier |

## Cross-stack equivalence rules

These rules are enforced by the Layer 2 harness. They apply to every
implementation stack that declares `capabilities.flowInsights.enabled = true`.

### Required to be equivalent across stacks

- **Signal identity:** the same `id` value must be returned for the same
  inferred condition (e.g., `blocked_on_review`).
- **Severity / priority intent:** if `blocked_on_review` is `high`, it must be
  `high` across all stacks.
- **Confidence behavior:** the same inputs must produce the same confidence tier.
  Partial inputs (`is_partial: true`) must reduce confidence on all stacks.
- **Recommended-action intent:** the action category must be equivalent across
  stacks. "Notify reviewers" and "ping assigned reviewers" are equivalent.
  "Close the change" is not equivalent to "notify reviewers" for a
  `blocked_on_review` signal.

### Not required to be identical

- Exact wording of `explanation` — semantic content must match; phrasing may differ.
- Exact wording of `recommendedNextAction` — intent must match; wording may vary.
- Ordering of signals when multiple are returned.
- Incidental metadata fields not explicitly part of the contract.

### Allowed differences

Provider capability gaps may cause GitHub and GitLab to produce slightly
different signal shapes for the same scenario. Any such difference must be
documented in this section.

| Signal | Provider | Allowed difference | Reason |
| --- | --- | --- | --- |
| `blocked_on_review` | GitLab self-managed (pre-14.x) | `confidence: medium` instead of `high` | Reviewer identity is `is_partial: true` when the API version does not expose individual reviewer assignments |

## Fixture catalog

All fixtures are in `schema/fixtures/provider-adapter-input/`. The table below
maps each fixture to its targeted signal and provider.

| Fixture file | Signal | Provider |
| --- | --- | --- |
| `blocked-on-review-github.yaml` | `blocked_on_review` | GitHub |
| `blocked-on-review-gitlab.yaml` | `blocked_on_review` | GitLab SaaS |
| `blocked-on-review-gitlab-self-managed.yaml` | `blocked_on_review` | GitLab self-managed |
| `trunk-integration-failed-github.yaml` | `trunk_integration_failure` | GitHub |
| `trunk-integration-failed-gitlab.yaml` | `trunk_integration_failure` | GitLab SaaS |
| `unclear-ownership-github.yaml` | `unclear_ownership` | GitHub (no owners) |
| `unclear-ownership-ambiguous-github.yaml` | `unclear_ownership` | GitHub (two conflicting teams) |
| `unclear-ownership-gitlab.yaml` | `unclear_ownership` | GitLab SaaS |
| `waiting-on-evidence-github.yaml` | `waiting_on_evidence` | GitHub |
| `waiting-on-evidence-gitlab.yaml` | `waiting_on_evidence` | GitLab SaaS |
| `aging-implementation-github.yaml` | `aging_implementation` | GitHub |
| `aging-implementation-gitlab.yaml` | `aging_implementation` | GitLab SaaS |
| `risk-aggregation-github.yaml` | `risk_aggregation` | GitHub |
| `risk-aggregation-gitlab.yaml` | `risk_aggregation` | GitLab SaaS |
| `partial-data-github.yaml` | `partial_evidence` | GitHub (partial data) |
| `changes-requested-github.yaml` | `changes_requested` | GitHub |
| `review-not-required-github.yaml` | `review_not_required` | GitHub |

## Layer 2 harness

Source: [`tests/src/profiles/flow-insights.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/flow-insights.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative (ADR-0009).

## Stack declarations

Stacks that expose the flow insights capability must declare both the profile
and the capability flag in `stack.json`:

```jsonc
{
  "contractProfiles": ["core", "operational", "flow-insights"],
  "capabilities": {
    "flowInsights": {
      "enabled": true
    }
  }
}
```

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Flow Intent Scenarios](../../flow/intent-scenarios) — Layer 1 source
- [Signal Catalog](../../flow/signals) — Canonical signal definitions
- [Provider Adapter Contract](../../flow/adapter-contract) — Normalized input types
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
