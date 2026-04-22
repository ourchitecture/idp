---
sidebar_position: 5
---

# MCP Profile

The `mcp-profile` contract validates that a Stemix IDP stack correctly exposes its capabilities
through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). MCP is a first-class
interface layer in Stemix alongside REST, CLI, and UI — it lets AI agents interact with the portal
without knowing its HTTP conventions.

## Why it exists

The IDP design principle "AI over MCP-First" means every capability should be reachable by an AI
agent through a stable, discoverable protocol. The MCP profile enforces that a conforming MCP server
can initialize, enumerate its tools, and invoke them correctly. It does not test AI reasoning — it
tests the adapter layer that connects AI agents to the portal's capabilities.

## Who must pass it

Only stacks that declare both `"mcp-profile"` in `contractProfiles` **and**
`capabilities.mcp.enabled = true` in their `stack.json` are required to pass this profile.

The profile is skipped automatically when either declaration is absent.

## Layer 1 spec

Source: [`tests/features/mcp-profile.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/mcp-profile.feature)

## Scenarios (8 total)

### MCP server responds to initialize with server info and capabilities

**Precondition:** The MCP server is running at `IDP_MCP_URL` (default: `http://localhost:8080`).

**Assertions:**

- MCP `initialize` request returns HTTP 2xx
- JSON-RPC response contains a `result` field
- `result.serverInfo` has a non-empty `name` and `version`
- `result.capabilities` is present

### tools/list returns the required tools with valid schemas

**Precondition:** The MCP server is running.

**Assertions:**

- `tools/list` returns HTTP 2xx
- `result.tools` is a non-empty array
- Each tool has a non-empty `name`, `description`, and an `inputSchema` object
- The list includes `get_portal_summary`
- The list includes `check_health`
- The list includes `list_flow_insights`
- The list includes `get_flow_insight`
- The list includes `list_my_blockers`
- The list includes `list_service_risk_signals`

### tools/call get_portal_summary returns a portal status result

**Precondition:** The MCP server is running and can reach the BFF at `IDP_BFF_URL`.

**Assertions:**

- `tools/call get_portal_summary` returns HTTP 2xx
- `result.content[0].type` is `"text"`
- `result.content[0].text` is valid JSON matching the shared portal summary status contract

### tools/call check_health returns BFF health and readiness

**Precondition:** The MCP server is running and can reach the BFF at `IDP_BFF_URL`.

**Assertions:**

- `tools/call check_health` returns HTTP 2xx
- `result.content[0].type` is `"text"`
- `result.content[0].text` is valid JSON with `health` and `readiness` fields
- `health.status` is present

### tools/call list_flow_insights returns insight list payload

**Precondition:** The MCP server is running and can reach the BFF at `IDP_BFF_URL`.

**Assertions:**

- `tools/call list_flow_insights` returns HTTP 2xx
- `result.content[0].text` parses to JSON with `generatedAt`, `total`, and an `insights` array
- At least one insight is returned

### tools/call get_flow_insight returns detailed payload

**Precondition:** The MCP server is running and can reach the BFF at `IDP_BFF_URL`.

**Assertions:**

- `tools/call get_flow_insight` returns HTTP 2xx
- `result.content[0].text` parses to JSON with an `insight` object
- `insight.insightId` matches the requested ID
- Optional `explanation` and `recommendedNextAction` fields are strings when present

### tools/call list_my_blockers filters blocker signals for an actor

**Precondition:** The MCP server is running and can reach the BFF at `IDP_BFF_URL`.

**Assertions:**

- `tools/call list_my_blockers` returns HTTP 2xx
- Response JSON contains only blocker signal IDs: `blocked_on_review`, `waiting_on_evidence`, or `aging_implementation`
- At least one returned insight includes the requested actor in `actors`

### tools/call list_service_risk_signals returns risk aggregation signals

**Precondition:** The MCP server is running and can reach the BFF at `IDP_BFF_URL`.

**Assertions:**

- `tools/call list_service_risk_signals` returns HTTP 2xx
- Response JSON contains only `risk_aggregation` signals
- Each returned insight includes the requested `service` in its `services` array

## Layer 2 harness

Source: [`tests/src/profiles/mcp-profile.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/mcp-profile.ts)

The harness sends raw JSON-RPC 2.0 POST requests to `IDP_MCP_URL/mcp` using the existing
zero-dependency HTTP client. It handles both `application/json` and `text/event-stream` (SSE)
response formats, sends the required `notifications/initialized` follow-up request, and reuses
any `Mcp-Session-Id` header returned by the server during initialization.

## Stack declarations

Stacks that expose an MCP server must declare both the profile and the capability flag:

```jsonc
{
  "contractProfiles": ["mcp-profile"],
  "capabilities": {
    "mcp": { "enabled": true }
  }
}
```

## Environment variables

| Variable      | Default                 | Description                        |
| ------------- | ----------------------- | ---------------------------------- |
| `IDP_MCP_URL` | `http://localhost:8080` | Base URL for the MCP server        |
| `IDP_BFF_URL` | `http://localhost:8000` | BFF URL the MCP server connects to |

## Running the profile

```sh
# Start the BFF for a stack, then the MCP server, then run contract tests:
IDP_MCP_URL=http://localhost:8080 \
IDP_BFF_URL=http://localhost:8000 \
IDP_STACK_PATH=tools/mcp \
npm run test:contract
```

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Core Profile](./core) — Baseline HTTP surface
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
