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

  # Provider-specific and edge-case scenarios
  # These scenarios validate provider-specific paths and cross-stack equivalence.

  @github
  Scenario: GitHub blocked on review is inferred from CODEOWNERS reviewer identity
    Given a GitHub pull request has review state "awaiting_review"
    And two reviewers are assigned via CODEOWNERS with named identities
    And the Checks API reports all branch checks as passed
    And the assigned reviewers have not responded for 36 hours beyond the expected review window
    When flow insight signals are evaluated
    Then the "blocked on review" signal is inferred
    And the explanation names the assigned reviewers by display name
    And the recommended next action targets the named reviewers directly

  @gitlab
  Scenario: GitLab blocked on review is inferred when approval threshold is not met
    Given a GitLab merge request has approval rules requiring 2 approvals
    And only 0 approvals have been recorded
    And the MR pipeline reports all jobs as passed
    And the review window has been exceeded by 36 hours
    When flow insight signals are evaluated
    Then the "blocked on review" signal is inferred
    And the explanation reflects that required approvals were not met
    And the recommended next action targets the assigned approvers

  @gitlab-self-managed
  Scenario: GitLab self-managed blocked on review with partial merge actor identity
    Given a GitLab self-managed merge request has review state "awaiting_review"
    And the merge actor identity is marked partial due to a provider API gap
    And the branch legacy commit status reports all checks as passed
    And the review window has been exceeded
    When flow insight signals are evaluated
    Then the "blocked on review" signal is inferred with reduced confidence
    And the explanation acknowledges the partial reviewer identity data

  @github
  Scenario: GitHub trunk integration failure is inferred after clean Checks API pass
    Given a GitHub pull request passed all Checks API branch checks
    And the pull request was merged to the default branch
    And a trunk workflow run failed within 15 minutes of the merge commit
    When flow insight signals are evaluated
    Then the "passed checks but failing trunk integration" signal is inferred
    And the explanation references the passing branch checks and the failing trunk run
    And the recommended next action is to remediate or roll back on trunk

  @gitlab
  Scenario: GitLab trunk integration failure is inferred after passing MR pipeline
    Given a GitLab merge request passed all MR pipeline jobs
    And the merge request was merged to the default branch
    And the trunk pipeline failed within 15 minutes of the merge
    When flow insight signals are evaluated
    Then the "passed checks but failing trunk integration" signal is inferred
    And the explanation references the passing MR pipeline and the failing trunk pipeline
    And the recommended next action is to remediate or roll back on trunk

  @cross-provider
  Scenario: Blocked on review signal is inferred equivalently from GitHub and GitLab normalized inputs
    Given a GitHub normalized input with review state "awaiting_review" and reviewers overdue by 36 hours
    And a GitLab normalized input for the equivalent scenario with approval threshold not met and review overdue by 36 hours
    When flow insight signals are evaluated for both inputs
    Then the "blocked on review" signal is inferred for both inputs
    And the signal identity is the same for both inputs
    And the severity intent is equivalent for both inputs
    And the recommended-action intent is equivalent for both inputs

  @github
  Scenario: Ownership ambiguity is flagged when two teams are listed with no confirmed owner
    Given a work item scoped to the "notifications" service
    And two teams are listed as accountable owners via CODEOWNERS with no single confirmed owner
    And the ownership state is "unclear"
    When flow insight signals are evaluated
    Then the "unclear ownership" signal is inferred
    And the explanation names both conflicting teams and the affected service scope
    And the recommended next action is to confirm a single accountable owner

  @github
  Scenario: Waiting on evidence is inferred when implementation and validation are both complete
    Given a change has completed implementation and was merged
    And the validation state is "passed" for all branch checks
    And the evidence state is "pending" for security attestation and deployment trace
    And the responsible actor for supplying evidence is identified
    When flow insight signals are evaluated
    Then the "waiting on evidence, not effort" signal is inferred
    And the explanation names the pending evidence types and the responsible actor
    And the recommended next action is to supply the missing evidence rather than request more code changes

  @gitlab
  Scenario: GitLab waiting on evidence with group ownership is inferred correctly
    Given a GitLab merge request was merged and all MR pipeline jobs passed
    And the evidence state is "pending" for a compliance attestation
    And group ownership is declared for the repository scope
    And the responsible actor for supplying evidence is identified
    When flow insight signals are evaluated
    Then the "waiting on evidence, not effort" signal is inferred
    And the explanation names the pending evidence type and the responsible actor
    And the recommended next action is to supply the compliance attestation

  @github
  Scenario: Reduced confidence is applied when adapter reports partial data
    Given a GitHub pull request with is_partial set to true on the review state
    And the partial field prevents full reviewer identity resolution
    And the change is in review state "awaiting_review" with elapsed time beyond the review window
    When flow insight signals are evaluated
    Then the "blocked on review" signal is inferred
    And the signal confidence is reduced from high to medium or lower
    And the explanation acknowledges the incomplete reviewer identity data
