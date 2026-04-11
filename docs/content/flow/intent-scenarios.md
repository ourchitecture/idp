---
sidebar_position: 5
---

# Flow Intent Scenarios (Layer 1)

These Layer 1 Gherkin scenarios express the flow insight MVP in provider-neutral language. They are ground truth for the semantics and precede any Layer 2 harness (planned in issue `#229`).

Source: [`tests/features/flow-insights.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/flow-insights.feature)

## Scenario summaries

- **Blocked on review:** A change waiting beyond the expected review window is surfaced with pending reviewers and elapsed time, directing action to reviewers rather than the author.
- **Passed checks but failing trunk integration:** Branch-level validation passed, but trunk integration failed afterward; the mismatch is explained with integration timing.
- **Unclear ownership:** Ownership is missing or conflicting for a work item; the signal requests a single accountable owner for the scoped service or team.
- **Waiting on evidence, not effort:** Implementation is complete and validation is clear, but required evidence is missing or stale; the signal names the missing artifacts and responsible owner.
- **Aging work between implementation and validation:** Implementation finished, yet validation has not started or is stalled beyond the expected window; the signal cites the delay and outstanding checks.
- **Risk signal by service, team, or flow stage:** Multiple signals cluster in the same scope within a short window, elevating risk and recommending focused remediation.

## Not a conformance profile (yet)

These scenarios are Layer 1 intent only. They do not define harness steps, HTTP routes, or stack obligations. A formal profile and Layer 2 harness will follow once the canonical model is stable.
