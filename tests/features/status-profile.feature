Feature: Status profile contract — API-first IDP status
  This profile is opt-in. It runs only when the stack declares
  capabilities.status.enabled = true in its stack.json. It validates the live
  IDP status API exposed by the BFF. The MVP is intentionally scoped to
  IDP-owned components only; plug-in and third-party system status are out of
  scope for this profile.

  Background:
    Given the BFF server is running at the URL defined by IDP_BFF_URL
    And the stack declares capabilities.status.enabled = true in stack.json

  Scenario: BFF portal summary returns the expected shape
    When the client sends GET /api/portal/summary to the BFF server
    Then the response status code is in the 2xx range
    And the response Content-Type header contains "application/json"
    And the response body is valid JSON containing:
      | field                     | expectation                                 |
      | generatedAt               | ISO-8601 timestamp                           |
      | status                    | "ok" or "degraded"                          |
      | metrics.totalComponents   | non-negative integer                         |
      | metrics.healthyComponents | non-negative integer                         |
      | metrics.degradedComponents| non-negative integer                         |
      | freshness.maxAgeSeconds   | non-negative integer                         |
      | components                | non-empty array of IDP-owned status entries |

  Scenario: Portal summary metrics are internally consistent
    When the client sends GET /api/portal/summary to the BFF server
    Then the metrics total equals the number of components
    And the healthy and degraded component counts match the component statuses
    And the top-level status matches the aggregate component state

  Scenario: Portal summary timestamps and freshness are valid
    When the client sends GET /api/portal/summary to the BFF server
    Then generatedAt is within 60 seconds of the current time
    And each component entry contains an ISO-8601 observedAt timestamp
    And freshness.maxAgeSeconds matches the oldest component observation age
