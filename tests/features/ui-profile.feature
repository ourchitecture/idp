Feature: UI profile contract — externally observable UI behavior
  This profile is opt-in. It runs only when the stack declares
  capabilities.ui.enabled = true in its stack.json. It validates observable
  HTML output, rendered status summary behavior, and the declared rendering
  mode without asserting framework-specific internals.

  Background:
    Given the web server is running at the URL defined by IDP_WEB_URL
    And the stack declares capabilities.ui.enabled = true in stack.json

  Scenario: Web root returns a valid HTML document shell
    When the client sends GET / to the web server
    Then the response status code is in the 2xx range
    And the response Content-Type header contains "text/html"
    And the response body contains the string "<html" (case-insensitive)

  Scenario: Web document shell includes a title element
    When the client sends GET / to the web server
    Then the response status code is in the 2xx range
    And the response body contains the string "<title" (case-insensitive)

  Scenario: Web root renders live portal summary content
    Given the BFF server is running at the URL defined by IDP_BFF_URL
    When the client renders GET / in a headless browser
    Then the rendered page includes the text "System Status"
    And the rendered page includes the text "Observed Components"
    And the rendered page includes the text "IDP BFF"

  Scenario: Status route renders detailed portal summary content
    Given the BFF server is running at the URL defined by IDP_BFF_URL
    When the client renders GET /status in a headless browser
    Then the rendered page includes the text "Detailed IDP status"
    And the rendered page includes the text "Observed Components"
    And the rendered page includes the text "Publication Path"
    And the rendered page includes the text "IDP BFF"

  Scenario: UI mode declaration is one of the accepted values
    Given the stack's stack.json declares capabilities.ui.mode
    Then the declared mode is one of: "spa", "ssr", "server-rendered"
    And when capabilities.ui.mode is absent the effective mode defaults to "spa"
