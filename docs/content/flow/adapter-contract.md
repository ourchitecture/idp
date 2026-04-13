---
sidebar_position: 6
---

# Provider Adapter Contract

The provider adapter contract defines the normalized output that every source
control and CI provider adapter must produce. The signal inference engine
consumes these normalized types and never interacts with raw provider shapes.

This contract is not the semantic core, not the API contract, and not the
storage schema. It is the boundary that keeps adapters thin and the core
provider-neutral.

## Position in the architecture

```text
Provider API (GitHub / GitLab)
        │
        ▼
   Provider Adapter
   (normalizes to this contract)
        │
        ▼
   Normalized Input Types  ← defined here
        │
        ▼
   Signal Inference Engine
        │
        ▼
   HTTP API / MCP Tools
```

Every type in this contract maps to one or more concepts from the
[canonical flow model](./model). No type introduces a concept not needed by at
least one of the six MVP signals in the [signal catalog](./signals).

## Normalized input types

### NormalizedRepository

Maps to: work item scope, ownership context.

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `provider` | yes | enum: `github`, `gitlab` | Identifies the provider system |
| `provider_id` | yes | string | Provider-scoped stable identifier |
| `full_name` | yes | string | e.g. `org/repo` |
| `default_branch` | yes | string | Trunk branch name |
| `visibility` | no | enum: `public`, `private`, `internal` | |
| `archived` | no | boolean | |
| `fetched_at` | yes | ISO 8601 timestamp | When data was retrieved from the provider API |

### NormalizedChange

Maps to: Change (the reviewable modification under proposal).

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `provider` | yes | enum | |
| `provider_id` | yes | string | |
| `repository_id` | yes | string | Matches `NormalizedRepository.provider_id` for the same provider |
| `source_branch` | yes | string | |
| `target_branch` | yes | string | |
| `state` | yes | enum: `open`, `closed`, `merged`, `locked` | |
| `author_actor_id` | yes | string | Matches `NormalizedActor.provider_id` |
| `created_at` | yes | ISO 8601 timestamp | |
| `updated_at` | yes | ISO 8601 timestamp | |
| `title` | no | string | |
| `is_draft` | no | boolean | GitHub draft PR or GitLab draft MR |
| `work_item_refs` | no | `NormalizedWorkItemRef[]` | Empty array when none detected; never `null` |
| `merged_at` | no | ISO 8601 timestamp | Present only when `state` is `merged` |
| `closed_at` | no | ISO 8601 timestamp | Present only when `state` is `closed` |
| `fetched_at` | yes | ISO 8601 timestamp | |

### NormalizedActor

Maps to: Actor (a person or automation accountable in the flow).

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `provider` | yes | enum | |
| `provider_id` | yes | string | |
| `display_name` | yes | string | Best-effort human-readable name |
| `provider_login` | no | string | Username as shown in the provider UI |
| `team_memberships` | no | string[] | Team or group slugs |

### NormalizedReviewState

Maps to: Review state (human review status for a change).

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `change_id` | yes | string | Matches `NormalizedChange.provider_id` |
| `state` | yes | enum: `awaiting_review`, `under_review`, `changes_requested`, `approved`, `not_required` | |
| `as_of` | yes | ISO 8601 timestamp | When this state was last computed |
| `reviewer_actor_ids` | no | string[] | Actors assigned or who have responded |
| `reviewer_team_names` | no | string[] | Requested review teams or groups |
| `last_activity_at` | no | ISO 8601 timestamp | Most recent review action |
| `approval_count` | no | integer | |
| `required_approval_count` | no | integer | |
| `is_partial` | no | boolean | True when review requirements or reviewer identity are incomplete |

### NormalizedValidationRun

Maps to: Validation state (automated checks or manual gates).

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `change_id` | yes | string | |
| `scope` | yes | enum: `branch`, `trunk` | `branch` = pre-merge; `trunk` = post-merge integration |
| `state` | yes | enum: `pending`, `running`, `passed`, `failed`, `flaky`, `skipped` | |
| `run_at` | yes | ISO 8601 timestamp | When the run was recorded or last updated |
| `name` | no | string | Check name or pipeline name |
| `url` | no | string | Link to run details |
| `duration_seconds` | no | integer | |
| `failure_summary` | no | string | Brief failure description; no stack traces |
| `is_partial` | no | boolean | True when the run record is incomplete or association is ambiguous |

### NormalizedMergeEvent

Maps to: Change stage transition (implementation complete; feeds aging and trunk
validation signals).

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `change_id` | yes | string | |
| `merged_at` | yes | ISO 8601 timestamp | |
| `target_branch` | yes | string | |
| `merged_by_actor_id` | no | string | Absent when the provider does not expose the merge actor |
| `merge_commit_sha` | no | string | |

### NormalizedOwnershipHint

Maps to: Ownership state (clarity of accountability for a scope).

At least one of `owner_actor_ids` or `owner_team_names` must be present when
the hint represents a known owner. An empty-owner hint with `confidence:
inferred` signals that ownership data could not be found.

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `repository_id` | yes | string | |
| `owner_actor_ids` | no | string[] | |
| `owner_team_names` | no | string[] | Team or group slugs |
| `path_pattern` | no | string | Glob pattern from CODEOWNERS; absent means repository-level hint |
| `source` | no | enum: `codeowners`, `group_membership`, `branch_protection`, `manual` | How the hint was derived |
| `confidence` | no | enum: `declared`, `inferred` | `declared` when from an explicit file or rule |
| `is_partial` | no | boolean | True when owner identities could not be fully resolved |

### NormalizedWorkItemRef

Maps to: Work item (reference only; not a full work item record).

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `external_id` | yes | string | As seen in the provider (issue number, ticket key) |
| `title` | no | string | Best-effort from PR/MR body or linked issue |
| `provider` | no | string | Source system if known |
| `url` | no | string | |
| `state` | no | string | Coarse state if fetchable: `open` or `closed` |

## Normalization rules

### Review state

| Provider signal | Normalized state |
| --- | --- |
| GitHub: no reviewer assigned | `awaiting_review` |
| GitHub: reviewer assigned, no response yet | `awaiting_review` |
| GitHub: reviewer has commented but not approved or requested changes | `under_review` |
| GitHub: `CHANGES_REQUESTED` from any reviewer | `changes_requested` |
| GitHub: required approvals met | `approved` |
| GitHub: review bypass rule active or review not required | `not_required` |
| GitLab: approvals required > 0, not met | `awaiting_review` |
| GitLab: at least one reviewer has responded without approving | `under_review` |
| GitLab: blocking note without approval | `changes_requested` |
| GitLab: required approvals met | `approved` |
| GitLab: approval rules disabled or MR locked | `not_required` |

### Validation state

Scope assignment: a validation run is `branch` scope if it ran before merge
(triggered on the PR or MR). It is `trunk` scope if it ran after merge on the
default branch or trunk integration line.

| Provider signal | Normalized state |
| --- | --- |
| GitHub Checks API: `success` | `passed` |
| GitHub Checks API: `failure` or `error` | `failed` |
| GitHub Checks API: `in_progress` | `running` |
| GitHub Checks API: `queued` or `waiting` | `pending` |
| GitHub Checks API: `neutral` or `skipped` | `skipped` |
| GitHub legacy commit status: `success` | `passed` |
| GitHub legacy commit status: `failure` or `error` | `failed` |
| GitHub legacy commit status: `pending` | `running` |
| GitLab Pipeline: `success` | `passed` |
| GitLab Pipeline: `failed` | `failed` |
| GitLab Pipeline: `running` | `running` |
| GitLab Pipeline: `pending` or `created` | `pending` |
| GitLab Pipeline: `canceled`, `skipped`, or `manual` | `skipped` |
| Same scope alternates `passed`/`failed` across recent runs | `flaky` |

### Ownership hints

| Provider signal | `source` | `confidence` |
| --- | --- | --- |
| GitHub CODEOWNERS file entry | `codeowners` | `declared` |
| GitLab Code Owners file entry | `codeowners` | `declared` |
| GitLab group owner membership | `group_membership` | `declared` |
| GitHub branch protection required reviewers | `branch_protection` | `declared` |
| Derived from past PR/MR author history | omit | `inferred` |
| No ownership data found | emit hint with empty owner lists | `inferred` |

### Work item references

Adapters must extract work item references from PR/MR title and description
using provider-standard patterns, for example `closes #123` or `fixes #123`
for GitHub and `Closes #123` or `Related to #456` for GitLab. If no references
are detected, `work_item_refs` must be an empty array. Adapters must not infer
work items from branch name patterns alone.

## Provenance

Every normalized type carries `provider` and `fetched_at`. These fields:

- Identify which provider system the data came from.
- Enable staleness detection in the inference engine.
- Support audit and debugging without requiring full raw event storage.

Adapters must record `fetched_at` as the time data was retrieved from the
provider API, not the time of the underlying provider event.

The optional `is_partial` flag (boolean) must be set to `true` on any type
where the adapter could not retrieve all required fields due to a provider API
gap or authorization constraint. Signal inference must treat partial inputs as
reduced-confidence.

## Deferred GitHub semantics in the MVP slice

The current GitHub adapter intentionally defers some provider nuances:

- Stale approvals after new commits and dismissed reviews are not expanded into reviewer identity changes.
- Requested review teams are surfaced as team names; individual team members are not expanded.
- Branch protection rules that require specific code owners are represented as partial ownership when identities cannot be resolved.
- Post-merge validation is attached only when a run matches the merge commit SHA; missing evidence is marked partial instead of over-associating.

## Provider capability notes

| Capability | GitHub SaaS | GitLab SaaS | GitLab self-managed |
| --- | --- | --- | --- |
| CODEOWNERS file | yes | yes | yes |
| Checks API (check suites and runs) | yes | no — use Pipelines | no — use Pipelines |
| Legacy commit statuses | yes (deprecated path) | yes | yes |
| Pipeline per MR | no — PR checks only | yes | yes |
| Merge actor identity | yes | yes | yes (≥ 14.x) |
| Approval rule count | via branch protection | via approval rules | via approval rules |
| Work item cross-references | via linked issues | via related issues | via related issues |
| Group-level ownership | no | yes | yes |
| Draft or WIP state | yes — draft PR | yes — draft MR | yes |

Adapters for providers with gaps must map to the closest normalized concept and
set `is_partial: true` when the gap affects a required field.

## Missing-data and partial-data rules

| Absent or ambiguous field | Required behavior |
| --- | --- |
| `reviewer_actor_ids` absent on an open change | Set `state` to `awaiting_review` |
| `work_item_refs` is empty | Do not infer work item context; signals that depend on work item scope must degrade gracefully |
| No `NormalizedOwnershipHint` for the repository | Downstream ownership state resolves to `missing`; signals must handle `missing` explicitly |
| `validation_runs` absent for an open change | Treat as `pending`; do not treat as `passed` |
| `merged_by_actor_id` absent on a merge event | Record the merge event without the actor; do not block inference |
| Any timestamp absent | Signals relying on elapsed time must reduce confidence or skip time-based inference |
| `is_partial: true` on any type | Downstream inference reduces confidence for signals that depend on that partial type |
| Provider API error retrieving an optional field | Set `is_partial: true`; do not fail the entire normalized output |
| `approval_count` absent when `required_approval_count` is present | Treat approval count as zero |
| `required_approval_count` absent | Do not infer an approval threshold; use `not_required` only when the provider explicitly signals no review is needed |
| No pipeline or check data after a merge event | Emit a `trunk`-scoped `NormalizedValidationRun` with `state: pending` |
| Conflicting ownership hints for the same path | Emit all hints and set `confidence: inferred` on each; the inference engine resolves conflicts |

## Fixture shape

Fixtures used in scenario tests follow this canonical YAML shape. Each fixture
file provides all normalized types needed by the targeted flow insight signals.
Fixtures must be self-contained and must not reference external resources or
depend on a live provider API.

```yaml
fixture_id: "string — unique identifier"
scenario: "string — flow insight signal this fixture targets"
provider: "github | gitlab"
description: "string — what this fixture represents"

repository:
  provider: "github | gitlab"
  provider_id: "string"
  full_name: "string"
  default_branch: "string"
  fetched_at: "ISO 8601"

changes:
  - provider: "github | gitlab"
    provider_id: "string"
    repository_id: "string"
    source_branch: "string"
    target_branch: "string"
    state: "open | closed | merged | locked"
    author_actor_id: "string"
    created_at: "ISO 8601"
    updated_at: "ISO 8601"
    work_item_refs: []
    fetched_at: "ISO 8601"

actors:
  - provider: "github | gitlab"
    provider_id: "string"
    display_name: "string"

review_states:
  - change_id: "string"
    state: "awaiting_review | under_review | changes_requested | approved | not_required"
    as_of: "ISO 8601"

validation_runs:
  - change_id: "string"
    scope: "branch | trunk"
    state: "pending | running | passed | failed | flaky | skipped"
    run_at: "ISO 8601"

merge_events:
  - change_id: "string"
    merged_at: "ISO 8601"
    target_branch: "string"

ownership_hints:
  - repository_id: "string"
    owner_team_names: []
    source: "codeowners | group_membership | branch_protection | manual"
    confidence: "declared | inferred"
```

See `schema/fixtures/provider-adapter-input/blocked-on-review-github.yaml` for
a worked example aligned with the "blocked on review" signal scenario.
