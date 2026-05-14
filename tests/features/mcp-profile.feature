Feature: MCP profile — Model Context Protocol interface contract
  A stack that declares MCP capability must expose a compliant MCP server
  accessible via the Streamable HTTP transport. These scenarios verify that
  the server implements the protocol handshake, exposes the required tools,
  and that those tools return valid, structured results.

  Only stacks that declare "mcp-profile" in contractProfiles and set
  capabilities.mcp.enabled = true are required to pass this profile.

  Background:
    Given the MCP server is running at the URL defined by IDP_MCP_URL
    And the client follows the MCP initialize and initialized handshake
    And the client reuses any "Mcp-Session-Id" header returned by the server

  Scenario: MCP server responds to initialize with server info and capabilities
    When the client sends an MCP initialize request to the MCP server
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result contains a "serverInfo" object with a non-empty "name" and "version"
    And the result contains a "capabilities" object

  Scenario: tools/list returns the required tools with valid schemas
    When the client sends an MCP tools/list request to the MCP server
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result contains a "tools" array with at least one entry
    And each tool has a non-empty "name", "description", and an "inputSchema" object
    And the tools array includes a tool named "get_portal_summary"
    And the tools array includes a tool named "check_health"
    And the tools array includes a tool named "list_flow_insights"
    And the tools array includes a tool named "get_flow_insight"
    And the tools array includes a tool named "list_my_blockers"
    And the tools array includes a tool named "list_service_risk_signals"

  Scenario: tools/call get_portal_summary returns a portal status result
    When the client calls the MCP tool "get_portal_summary" with no arguments
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON matching the portal summary status contract

  Scenario: tools/call check_health returns BFF health and readiness
    When the client calls the MCP tool "check_health" with no arguments
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing "health" and "readiness" fields
    And the "health" object contains a "status" field

  Scenario: tools/call list_flow_insights returns an insight list
    When the client calls the MCP tool "list_flow_insights" with no arguments
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing "generatedAt", "total", and an "insights" array with at least one entry

  Scenario: tools/call get_flow_insight returns a detailed insight
    Given the client retrieved a valid insightId from the "list_flow_insights" tool
    When the client calls the MCP tool "get_flow_insight" with that insightId
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing an "insight" object with the matching "insightId"

  Scenario: tools/call list_my_blockers returns blocker signals for an actor
    Given the client selected an actor from a blocked_on_review insight
    When the client calls the MCP tool "list_my_blockers" with that actor
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing only blocker signal IDs in the "insights" array
    And at least one returned insight lists the requested actor

  Scenario: tools/call list_service_risk_signals returns aggregated risk signals
    Given the client selected a service from a risk_aggregation insight
    When the client calls the MCP tool "list_service_risk_signals" with that service
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing only "risk_aggregation" signals for that service
