Feature: Core contract — baseline HTTP surface
  Every reference implementation must expose a minimal HTTP surface that is
  reachable and returns correctly shaped responses. These four scenarios are
  required by all stacks and form the lowest layer of the conformance pyramid.

  Background:
    Given the web server is running at the URL defined by IDP_WEB_URL
    And the BFF server is running at the URL defined by IDP_BFF_URL

  Scenario: Web server responds to GET /
    When the client sends GET / to the web server
    Then the response status code is in the 2xx range

  Scenario: BFF root returns a JSON status envelope
    When the client sends GET / to the BFF server
    Then the response status code is in the 2xx range
    And the response Content-Type header contains "application/json"
    And the response body is a valid JSON object
    And the JSON object contains a field named "status" of type string
    And the JSON object contains a field named "service" of type string

  Scenario: BFF health endpoint returns the expected shape
    When the client sends GET /api/health to the BFF server
    Then the response status code is in the 2xx range
    And the response body is a valid JSON object
    And the JSON object contains a field named "status"
    And the JSON object contains a field named "service"
    And the JSON object contains a field named "timestamp"

  Scenario: BFF readiness endpoint returns the expected shape
    When the client sends GET /api/readiness to the BFF server
    Then the response status code is in the 2xx range
    And the response body is a valid JSON object
    And the JSON object contains a field named "status"
    And the JSON object contains a field named "checks"
