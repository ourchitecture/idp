Feature: Auth profile — OAuth 2.0 authentication contract
  This profile is opt-in. It runs only when the stack declares
  capabilities.auth.enabled = true in its stack.json. It validates the
  observable contract of the BFF auth endpoints when an OAuth provider is
  active. Scenarios in this profile assume the BFF is running with an OAuth
  provider configured (OUR_IDP_OAUTH_PROVIDER != "none").

  provider=none behavior is explicitly out of scope for this profile.

  Background:
    Given the BFF server is running at the URL defined by IDP_BFF_URL
    And the stack declares capabilities.auth.enabled = true in stack.json
    And the BFF is configured with an OAuth provider (OUR_IDP_OAUTH_PROVIDER != "none")

  Scenario: Me endpoint returns 401 when the request is unauthenticated
    When the client sends GET /auth/me to the BFF server without a session cookie
    Then the response status code is 401

  Scenario: Login endpoint initiates the OAuth flow
    When the client sends GET /auth/login to the BFF server
    Then the response status code is 302
    And the response Location header is present and non-empty
    And the Location header points to the configured OAuth provider authorization URL

  Scenario: Callback endpoint completes the OAuth flow
    Given the client has performed GET /auth/login and captured the state parameter from the Location header
    When the client sends GET /auth/callback with a valid code and the captured state to the BFF server
    Then the response status code is in the 3xx range
    And the response sets the idp_session cookie

  Scenario: Me endpoint returns 200 with user JSON when authenticated
    Given the client has completed the OAuth callback and holds an idp_session cookie
    When the client sends GET /auth/me to the BFF server with the session cookie
    Then the response status code is 200
    And the response body is JSON containing a login field

  Scenario: Logout endpoint accepts requests and clears the session cookie
    When the client sends POST /auth/logout to the BFF server
    Then the response status code is 204
    And the response sets the session cookie with Max-Age = 0 or an expired date
