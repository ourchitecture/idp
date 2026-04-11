---
sidebar_position: 2
---

# Canonical Flow Model

This model is the provider-neutral vocabulary for flow insights. It covers only concepts that change action for the MVP and leaves provider-specific shapes to adapters. Guardrail: **model what changes action; reference the rest.**

## Concepts

### Work item

- **Definition:** A unit of intent to change the system, visible to stakeholders (for example, a feature or defect slice).
- **Why it changes action:** It anchors ownership, review expectations, and validation scope.
- **Minimum attributes:** intent/title, current stage (implementation, review, validation), related change identifiers, accountable owner, service/team scope.
- **Not:** A full backlog ticket history or requirements document; details beyond the action-driving fields stay out of the model.

### Change

- **Definition:** A concrete, reviewable modification to code, config, or content proposed by a work item.
- **Why it changes action:** Review, validation, and integration decisions attach to the change, not to the abstract work item.
- **Minimum attributes:** change identifier, target branch/environment, linked work item, submitter actor, created timestamp.
- **Not:** A deployment record or long-term audit log; it is the proposal under review.

### Actor

- **Definition:** A person or automation that initiates, reviews, validates, or owns a change.
- **Why it changes action:** Signals must direct recommendations to the right accountable party.
- **Minimum attributes:** identity, role in the flow (author, reviewer, validator, owner), team or service affiliation.
- **Not:** A scheduler or workflow runner; those are tools, not accountable actors.

### Review state

- **Definition:** The state of human review for a change.
- **Why it changes action:** Determines whether reviewers or authors need to act.
- **States:** `awaiting_review`, `under_review`, `changes_requested`, `approved`, `not_required`.
- **Not:** An automation gate or test result; that belongs to validation state.

### Validation state

- **Definition:** The state of automated or manual checks that verify the change (tests, integration checks, policy gates).
- **Why it changes action:** Drives whether the change can advance or needs remediation.
- **States:** `pending`, `running`, `passed`, `failed`, `flaky`, `skipped`.
- **Minimum attributes:** scope (branch vs. trunk), last run timestamp, evidence link.
- **Not:** A deployment stage; deployment belongs to implementation stacks, not this model.

### Evidence state

- **Definition:** The status of required evidence (security attestations, approvals, traceability artifacts) needed for compliance or risk acceptance.
- **Why it changes action:** Work may be blocked waiting for evidence even when implementation is complete.
- **States:** `not_required`, `required`, `pending`, `recorded`, `stale`.
- **Minimum attributes:** required evidence types, owner responsible for supplying them, freshness timestamp.
- **Not:** A full document store or audit archive; only pointers and freshness matter here.

### Ownership state

- **Definition:** The clarity of accountability for a work item or change.
- **Why it changes action:** Signals need a clear escalation path when progress stalls.
- **States:** `owned`, `delegated`, `unclear`, `missing`.
- **Minimum attributes:** accountable owner, fallback team/service, last confirmation timestamp.
- **Not:** An org chart or CMDB graph; only the action-driving ownership signals are modeled.

### Risk signal

- **Definition:** A structured indicator that a flow stage, service, or team carries heightened risk based on observed states.
- **Why it changes action:** Guides prioritization and escalation across competing work.
- **Minimum attributes:** scope (service/team/stage), contributing factors, confidence, recommended action.
- **Not:** A general health score or SLA metric; it is specific to the flow insight signals.

## Illustrative provider mappings (non-contractual)

Adapters normalize provider-specific fields into the model above. Examples:

- GitHub: pull request → change; reviewers → actors; required checks → validation state; code owners → ownership state.
- GitLab: merge request → change; approvers → actors; pipelines → validation state; group or code owner rules → ownership state.

These mappings are illustrative only; the contract remains the canonical model definitions.
