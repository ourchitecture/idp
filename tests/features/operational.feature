Feature: Operational contract — runtime and semantic stability
  Beyond the baseline shape checks, Tier 1 stacks must prove that runtime
  conventions are honored and that response payloads carry the correct semantic
  values. These three scenarios validate exact enum values, exact string
  identity, and ISO-8601 timestamp format.

  Background:
    Given the web server is running at the URL defined by IDP_WEB_URL
    And the BFF server is running at the URL defined by IDP_BFF_URL

  Scenario: Web server honors the override-aware runtime port contract
    When the client sends GET / to the web server
    Then the response status code is in the 2xx range

  Scenario: BFF health payload semantics are stable
    When the client sends GET /api/health to the BFF server
    Then the response status code is in the 2xx range
    And the response body is a valid JSON object
    And the JSON field "status" is exactly "ok" or exactly "degraded"
    And the JSON field "service" is exactly "idp-bff"
    And the JSON field "timestamp" is a non-empty ISO-8601 compatible string

  Scenario: BFF readiness contract semantics are stable
    When the client sends GET /api/readiness to the BFF server
    Then the response status code is in the 2xx range
    And the response body is a valid JSON object
    And the JSON field "status" is exactly "ready"
    And the JSON field "checks" is an object that contains the key "bff"
    And the JSON field "checks" is an object that contains the key "routing"
    And the JSON field "timestamp" is a non-empty ISO-8601 compatible string
