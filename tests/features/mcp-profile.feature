Feature: MCP profile — Model Context Protocol interface contract
  A stack that declares MCP capability must expose a compliant MCP server
  accessible via the Streamable HTTP transport. These scenarios verify that
  the server implements the protocol handshake, exposes the required tools,
  and that those tools return valid, structured results.

  Only stacks that declare "mcp-profile" in contractProfiles and set
  capabilities.mcp.enabled = true are required to pass this profile.

  Background:
    Given the MCP server is running at the URL defined by IDP_MCP_URL

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

  Scenario: tools/call get_portal_summary returns a portal status result
    When the client calls the MCP tool "get_portal_summary" with no arguments
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing a "status" field

  Scenario: tools/call check_health returns BFF health and readiness
    When the client calls the MCP tool "check_health" with no arguments
    Then the response status code is in the 2xx range
    And the JSON-RPC response contains a result field
    And the result content is a non-empty array of content items
    And content item 0 has type "text" and a non-empty text field
    And the text is valid JSON containing "health" and "readiness" fields
    And the "health" object contains a "status" field
