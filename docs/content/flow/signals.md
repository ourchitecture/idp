---
sidebar_position: 3
---

# Signal Catalog (MVP)

Each signal uses only the canonical model concepts and stays provider-neutral. Fields per signal: purpose, required inputs, inference rules, explanation intent, recommended next action, confidence guidance, and a worked example.

## Blocked on review

- **Purpose:** Highlight changes stuck in human review so they can be unblocked.
- **Required inputs:** change with `review state`, assigned reviewer actors, expected review window, ownership state.
- **Inference rules:** review state is `awaiting_review` or `under_review`; elapsed time exceeds expected window; validation state is not blocking.
- **Explanation intent:** Name the pending reviewers, current review state, and elapsed waiting time.
- **Recommended next action:** Notify reviewers and accountable owner to respond or reassign.
- **Confidence guidance:** High when explicit reviewers and review timestamps are present; medium when using default review windows.
- **Worked example:** A change titled "Add payment webhook" has two assigned reviewers, has waited 36 hours beyond the team SLA, and no validation failures. The signal calls out the reviewers and overdue duration.

## Passed checks but failing trunk integration

- **Purpose:** Flag changes that cleared branch-level checks but broke integration in the trunk/default line.
- **Required inputs:** change linked to a work item, validation state for branch checks, validation state for trunk integration, integration timestamp.
- **Inference rules:** branch validation state is `passed`; trunk/default integration validation state is `failed` or `flaky` after merge; no active review blockers.
- **Explanation intent:** Show that pre-merge checks passed while post-merge integration failed, with the failing integration window.
- **Recommended next action:** Reproduce failure on trunk, roll forward with fix or roll back the change, and notify owners of impacted service.
- **Confidence guidance:** High when branch and trunk validation records are time-ordered; medium when trunk failure is inferred from latest deployment telemetry only.
- **Worked example:** A change merged after passing all branch checks, but the next trunk integration run failed in 10 minutes with a regression in the notification service. The signal highlights the mismatch between branch pass and trunk fail.

## Unclear ownership

- **Purpose:** Surface work that lacks a clear accountable owner or has conflicting ownership signals.
- **Required inputs:** work item, ownership state, associated actors or teams, service/team scope.
- **Inference rules:** ownership state is `unclear` or `missing`; no confirmed accountable owner in the current stage; conflicting owners detected across metadata.
- **Explanation intent:** State what ownership data is missing or conflicting and which scope (service/team) is affected.
- **Recommended next action:** Assign or confirm a single accountable owner and record it; if conflicting, pick one and notify the displaced owners.
- **Confidence guidance:** High when ownership data is explicit but conflicting; medium when derived from heuristics like past authorship.
- **Worked example:** A work item tied to the checkout service lists two potential owners from different teams with no confirmed accountable owner. The signal calls out the conflict and requests confirmation.

## Waiting on evidence, not effort

- **Purpose:** Distinguish work blocked by missing evidence (approvals, attestations, traceability) from work blocked by pending implementation.
- **Required inputs:** work item and change, evidence state, required evidence types, ownership state.
- **Inference rules:** evidence state is `required` or `pending`; implementation tasks are complete; review and validation states are not blocking; no active work remaining except supplying evidence.
- **Explanation intent:** Specify which evidence items are missing or stale and who is accountable for providing them.
- **Recommended next action:** Request the needed evidence from the accountable owner; provide templates or locations to attach it.
- **Confidence guidance:** High when required evidence types are enumerated; medium when derived from default policy; low if implementation completeness is inferred.
- **Worked example:** A change that passed review and validation still lacks the required security attestation and deployment trace. The signal lists the missing artifacts and the owner responsible.

## Aging work between implementation and validation

- **Purpose:** Reveal changes that have finished implementation but have not entered or completed validation within the expected window.
- **Required inputs:** change with implementation completion timestamp, validation state, expected validation start window.
- **Inference rules:** implementation is marked complete; validation state is `pending` or `running` with elapsed time beyond the expected window; no evidence blockers.
- **Explanation intent:** Show how long validation has been waiting or running and which checks are outstanding.
- **Recommended next action:** Start or prioritize validation, or reduce scope to unblock it; notify the validator or owner.
- **Confidence guidance:** High when implementation completion and validation timestamps are recorded; medium when completion is inferred from merge events.
- **Worked example:** Implementation finished three days ago, but integration tests have not started; the signal cites the three-day delay and the missing validation run.

## Risk signal by service, team, or flow stage

- **Purpose:** Aggregate risk when multiple signals cluster around a service, team, or flow stage.
- **Required inputs:** scope (service/team/stage), contributing signals, ownership state, change volume in that scope.
- **Inference rules:** multiple signals within a recent window for the same scope (for example, repeated trunk failures for one service or repeated ownership gaps for one team); severity increases with volume and recency.
- **Explanation intent:** Summarize the clustered signals, their time window, and affected scope.
- **Recommended next action:** Escalate to the accountable owner for the scope, allocate review/validation capacity, or pause incoming changes until the risk clears.
- **Confidence guidance:** High when signals share the same scope and window; medium when scope is inferred from filenames or tags.
- **Worked example:** Over the last 48 hours, three changes in the notifications service triggered trunk integration failures and two showed unclear ownership. The signal highlights the service scope and recommends a focused remediation window.
