Feature: Flow insight signals — canonical MVP
  Flow insights use the canonical model to surface review, validation, evidence,
  ownership, and risk signals without assuming any provider-specific shape.

  Scenario: Blocked on review is surfaced with context
    Given a change for a work item is in review state "awaiting_review"
    And the expected review window is 24 hours
    And the assigned reviewers have not responded for 36 hours
    And the validation state is not blocking the change
    When flow insight signals are evaluated
    Then the "blocked on review" signal is inferred
    And the explanation names the pending reviewers and elapsed waiting time
    And the recommended next action targets the reviewers instead of the author

  Scenario: Passed checks but failing trunk integration is highlighted
    Given a change passed branch-level validation
    And the change was integrated to the trunk line
    And trunk integration validation failed within 15 minutes of the merge
    And the review state is "approved"
    When flow insight signals are evaluated
    Then the "passed checks but failing trunk integration" signal is inferred
    And the explanation contrasts passed branch checks with failing trunk integration
    And the recommended next action is to remediate or roll back on trunk

  Scenario: Unclear ownership is flagged for resolution
    Given a work item scoped to the "notifications" service
    And the ownership state is "unclear" because two teams are listed as accountable
    When flow insight signals are evaluated
    Then the "unclear ownership" signal is inferred
    And the explanation lists the conflicting owners and the scoped service
    And the recommended next action is to confirm a single accountable owner

  Scenario: Waiting on evidence, not effort, is differentiated
    Given a change has completed implementation
    And the validation state is "passed"
    And the evidence state is "pending" for security attestation and deployment trace
    When flow insight signals are evaluated
    Then the "waiting on evidence, not effort" signal is inferred
    And the explanation lists the missing evidence items and responsible owner
    And the recommended next action is to supply the evidence instead of requesting more code changes

  Scenario: Aging work between implementation and validation is exposed
    Given implementation for a change finished 3 days ago
    And the validation state is "pending"
    And the expected validation start window is 24 hours from implementation completion
    When flow insight signals are evaluated
    Then the "aging work between implementation and validation" signal is inferred
    And the explanation cites the time since implementation completion and missing validation start
    And the recommended next action is to start or prioritize validation

  Scenario: Risk is aggregated by service from clustered signals
    Given the following signals exist for the "checkout" service within 48 hours:
      | signal                                      |
      | passed checks but failing trunk integration |
      | blocked on review                           |
      | unclear ownership                           |
    And the ownership state for the service is "owned"
    When flow insight signals are evaluated
    Then the "risk signal by service, team, or flow stage" is inferred for the "checkout" service
    And the explanation aggregates the contributing signals and the 48-hour window
    And the recommended next action is to escalate to the service owner and focus remediation before accepting new changes
