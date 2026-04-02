import { assert, parseJsonOrThrow } from "../assertions";
import { post } from "../http";
import type { ContractContext, TestCase } from "../types";

const MCP_PROTOCOL_VERSION = "2024-11-05";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

function mcpRequest(mcpBaseUrl: URL, payload: JsonRpcRequest): ReturnType<typeof post> {
  return post(new URL("/mcp", mcpBaseUrl), payload);
}

/**
 * Parse the JSON-RPC result from an MCP response body.
 *
 * The MCP Streamable HTTP transport may respond with either:
 * - application/json: a direct JSON-RPC response object
 * - text/event-stream: SSE stream with "data: {...}" lines
 *
 * This helper handles both formats and returns the parsed JSON-RPC envelope.
 */
function parseJsonRpcResponse(body: string): Record<string, unknown> {
  const trimmed = body.trim();

  // Try direct JSON first.
  try {
    const parsed = parseJsonOrThrow(trimmed);
    assert(typeof parsed === "object" && parsed !== null, "JSON-RPC response must be an object");
    return parsed as Record<string, unknown>;
  } catch {
    // Fall through to SSE parsing.
  }

  // Parse SSE: find the first "data: {...}" line.
  for (const line of trimmed.split("\n")) {
    const stripped = line.trim();
    if (stripped.startsWith("data: ")) {
      const data = stripped.slice(6).trim();
      if (data && data !== "[DONE]") {
        const parsed = parseJsonOrThrow(data);
        assert(typeof parsed === "object" && parsed !== null, "SSE data must be a JSON object");
        return parsed as Record<string, unknown>;
      }
    }
  }

  throw new Error(`Cannot parse MCP response body: ${body.slice(0, 200)}`);
}

function isMcpEnabled(context: ContractContext): boolean {
  return context.stackMetadata?.capabilities?.mcp?.enabled === true;
}

export function createMcpProfileTests(context: ContractContext): TestCase[] {
  if (!isMcpEnabled(context)) {
    return [];
  }

  const { mcpBaseUrl } = context;
  let requestId = 1;

  function nextId(): number {
    return requestId++;
  }

  return [
    {
      name: "mcp-profile:initialize returns server info and capabilities",
      run: async () => {
        const response = await mcpRequest(mcpBaseUrl, {
          jsonrpc: "2.0",
          id: nextId(),
          method: "initialize",
          params: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "idp-contract-test", version: "0.1.0" },
          },
        });

        assert(
          response.status >= 200 && response.status < 300,
          `Expected 2xx from MCP initialize, got ${response.status}`
        );

        const envelope = parseJsonRpcResponse(response.body);
        assert("result" in envelope, "MCP initialize response must contain a result field");

        const result = envelope.result as Record<string, unknown>;
        assert(
          typeof result === "object" && result !== null,
          "MCP initialize result must be an object"
        );
        assert(
          "serverInfo" in result,
          "MCP initialize result must contain serverInfo"
        );
        assert(
          "capabilities" in result,
          "MCP initialize result must contain capabilities"
        );

        const serverInfo = result.serverInfo as Record<string, unknown>;
        assert(
          typeof serverInfo.name === "string" && serverInfo.name.length > 0,
          "MCP serverInfo.name must be a non-empty string"
        );
        assert(
          typeof serverInfo.version === "string" && serverInfo.version.length > 0,
          "MCP serverInfo.version must be a non-empty string"
        );
      },
    },
    {
      name: "mcp-profile:tools/list returns expected tools with required fields",
      run: async () => {
        const response = await mcpRequest(mcpBaseUrl, {
          jsonrpc: "2.0",
          id: nextId(),
          method: "tools/list",
        });

        assert(
          response.status >= 200 && response.status < 300,
          `Expected 2xx from MCP tools/list, got ${response.status}`
        );

        const envelope = parseJsonRpcResponse(response.body);
        assert("result" in envelope, "MCP tools/list response must contain a result field");

        const result = envelope.result as Record<string, unknown>;
        assert(Array.isArray(result.tools), "MCP tools/list result must contain a tools array");

        const tools = result.tools as unknown[];
        assert(tools.length > 0, "MCP tools/list must return at least one tool");

        for (const tool of tools) {
          assert(typeof tool === "object" && tool !== null, "Each MCP tool must be an object");
          const t = tool as Record<string, unknown>;
          assert(typeof t.name === "string" && t.name.length > 0, "Each MCP tool must have a non-empty name");
          assert(typeof t.description === "string" && t.description.length > 0, "Each MCP tool must have a non-empty description");
          assert(typeof t.inputSchema === "object" && t.inputSchema !== null, "Each MCP tool must have an inputSchema object");
        }

        const toolNames = tools.map((t) => (t as Record<string, unknown>).name as string);
        assert(
          toolNames.includes("get_portal_summary"),
          `MCP tools must include get_portal_summary (found: ${toolNames.join(", ")})`
        );
        assert(
          toolNames.includes("check_health"),
          `MCP tools must include check_health (found: ${toolNames.join(", ")})`
        );
      },
    },
    {
      name: "mcp-profile:tools/call get_portal_summary returns portal status",
      run: async () => {
        const response = await mcpRequest(mcpBaseUrl, {
          jsonrpc: "2.0",
          id: nextId(),
          method: "tools/call",
          params: {
            name: "get_portal_summary",
            arguments: {},
          },
        });

        assert(
          response.status >= 200 && response.status < 300,
          `Expected 2xx from MCP tools/call get_portal_summary, got ${response.status}`
        );

        const envelope = parseJsonRpcResponse(response.body);
        assert("result" in envelope, "MCP tools/call response must contain a result field");

        const result = envelope.result as Record<string, unknown>;
        assert(Array.isArray(result.content), "MCP tool result must contain a content array");

        const content = result.content as unknown[];
        assert(content.length > 0, "MCP tool result content must be non-empty");

        const firstItem = content[0] as Record<string, unknown>;
        assert(firstItem.type === "text", "MCP tool result content[0] must have type 'text'");
        assert(
          typeof firstItem.text === "string" && firstItem.text.length > 0,
          "MCP tool result content[0].text must be a non-empty string"
        );

        const summary = parseJsonOrThrow(firstItem.text as string) as Record<string, unknown>;
        assert(typeof summary === "object" && summary !== null, "get_portal_summary text must be valid JSON");
        assert("status" in summary, "get_portal_summary result must include a status field");
      },
    },
    {
      name: "mcp-profile:tools/call check_health returns BFF health envelope",
      run: async () => {
        const response = await mcpRequest(mcpBaseUrl, {
          jsonrpc: "2.0",
          id: nextId(),
          method: "tools/call",
          params: {
            name: "check_health",
            arguments: {},
          },
        });

        assert(
          response.status >= 200 && response.status < 300,
          `Expected 2xx from MCP tools/call check_health, got ${response.status}`
        );

        const envelope = parseJsonRpcResponse(response.body);
        assert("result" in envelope, "MCP tools/call response must contain a result field");

        const result = envelope.result as Record<string, unknown>;
        assert(Array.isArray(result.content), "MCP tool result must contain a content array");

        const content = result.content as unknown[];
        assert(content.length > 0, "MCP tool result content must be non-empty");

        const firstItem = content[0] as Record<string, unknown>;
        assert(firstItem.type === "text", "MCP tool result content[0] must have type 'text'");

        const health = parseJsonOrThrow(firstItem.text as string) as Record<string, unknown>;
        assert(typeof health === "object" && health !== null, "check_health text must be valid JSON");
        assert("health" in health, "check_health result must include a health field");
        assert("readiness" in health, "check_health result must include a readiness field");

        const healthPayload = health.health as Record<string, unknown>;
        assert("status" in healthPayload, "check_health.health must include a status field");
      },
    },
  ];
}
