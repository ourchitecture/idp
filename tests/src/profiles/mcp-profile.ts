import { assert, parseJsonOrThrow } from "../assertions";
import { post } from "../http";
import { parsePortalSummaryOrThrow } from "../status";
import type { ContractContext, TestCase } from "../types";

const MCP_PROTOCOL_VERSION = "2024-11-05";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
};

function mcpRequest(
  mcpBaseUrl: URL,
  payload: JsonRpcRequest,
  sessionId?: string
): ReturnType<typeof post> {
  const headers =
    sessionId === undefined
      ? undefined
      : {
          "Mcp-Session-Id": sessionId,
        };

  return post(new URL("/mcp", mcpBaseUrl), payload, headers);
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
  let sessionId: string | undefined;
  let initializeResult: Record<string, unknown> | null = null;

  function nextId(): number {
    return requestId++;
  }

  async function ensureInitialized(): Promise<Record<string, unknown>> {
    if (initializeResult !== null) {
      return initializeResult;
    }

    const initializeResponse = await mcpRequest(mcpBaseUrl, {
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
      initializeResponse.status >= 200 && initializeResponse.status < 300,
      `Expected 2xx from MCP initialize, got ${initializeResponse.status}`
    );

    const envelope = parseJsonRpcResponse(initializeResponse.body);
    assert("result" in envelope, "MCP initialize response must contain a result field");

    const result = envelope.result as Record<string, unknown>;
    assert(
      typeof result === "object" && result !== null,
      "MCP initialize result must be an object"
    );

    sessionId = initializeResponse.headers["mcp-session-id"];
    initializeResult = result;

    const initializedResponse = await mcpRequest(
      mcpBaseUrl,
      {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      },
      sessionId
    );

    assert(
      initializedResponse.status >= 200 && initializedResponse.status < 300,
      `Expected 2xx from MCP notifications/initialized, got ${initializedResponse.status}`
    );

    return result;
  }

  async function callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    await ensureInitialized();

    const response = await mcpRequest(
      mcpBaseUrl,
      {
        jsonrpc: "2.0",
        id: nextId(),
        method: "tools/call",
        params: {
          name,
          arguments: args,
        },
      },
      sessionId
    );

    assert(
      response.status >= 200 && response.status < 300,
      `Expected 2xx from MCP tools/call ${name}, got ${response.status}`
    );

    const envelope = parseJsonRpcResponse(response.body);
    assert("result" in envelope, "MCP tools/call response must contain a result field");

    return envelope.result as Record<string, unknown>;
  }

  function parseTextContent(result: Record<string, unknown>): string {
    assert(Array.isArray(result.content), "MCP tool result must contain a content array");
    const content = result.content as unknown[];
    assert(content.length > 0, "MCP tool result content must be non-empty");

    const firstItem = content[0] as Record<string, unknown>;
    assert(firstItem.type === "text", "MCP tool result content[0] must have type 'text'");
    assert(
      typeof firstItem.text === "string" && firstItem.text.length > 0,
      "MCP tool result content[0].text must be a non-empty string"
    );

    return firstItem.text as string;
  }

  return [
    {
      name: "mcp-profile:initialize returns server info and capabilities",
      run: async () => {
        const result = await ensureInitialized();
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
        await ensureInitialized();

        const response = await mcpRequest(mcpBaseUrl, {
          jsonrpc: "2.0",
          id: nextId(),
          method: "tools/list",
        }, sessionId);

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
        assert(
          toolNames.includes("list_flow_insights"),
          `MCP tools must include list_flow_insights (found: ${toolNames.join(", ")})`
        );
        assert(
          toolNames.includes("get_flow_insight"),
          `MCP tools must include get_flow_insight (found: ${toolNames.join(", ")})`
        );
        assert(
          toolNames.includes("list_my_blockers"),
          `MCP tools must include list_my_blockers (found: ${toolNames.join(", ")})`
        );
        assert(
          toolNames.includes("list_service_risk_signals"),
          `MCP tools must include list_service_risk_signals (found: ${toolNames.join(", ")})`
        );
      },
    },
    {
      name: "mcp-profile:tools/call get_portal_summary returns portal status",
      run: async () => {
        const result = await callTool("get_portal_summary");
        const text = parseTextContent(result);
        parsePortalSummaryOrThrow(parseJsonOrThrow(text));
      },
    },
    {
      name: "mcp-profile:tools/call check_health returns BFF health envelope",
      run: async () => {
        const result = await callTool("check_health");
        const health = parseJsonOrThrow(parseTextContent(result)) as Record<string, unknown>;
        assert(typeof health === "object" && health !== null, "check_health text must be valid JSON");
        assert("health" in health, "check_health result must include a health field");
        assert("readiness" in health, "check_health result must include a readiness field");

        const healthPayload = health.health as Record<string, unknown>;
        assert("status" in healthPayload, "check_health.health must include a status field");
      },
    },
    {
      name: "mcp-profile:tools/call list_flow_insights returns insights list",
      run: async () => {
        const result = await callTool("list_flow_insights");
        const payload = parseJsonOrThrow(parseTextContent(result)) as Record<string, unknown>;

        assert(typeof payload.generatedAt === "string", "list_flow_insights must include generatedAt");
        assert(Array.isArray(payload.insights), "list_flow_insights must include insights array");
        assert(typeof payload.total === "number", "list_flow_insights must include total");
        assert((payload.insights as unknown[]).length > 0, "list_flow_insights must return at least one insight");
      },
    },
    {
      name: "mcp-profile:tools/call get_flow_insight returns detailed insight",
      run: async () => {
        const listResult = await callTool("list_flow_insights");
        const listPayload = parseJsonOrThrow(parseTextContent(listResult)) as Record<string, unknown>;
        const firstInsight = (listPayload.insights as Record<string, unknown>[])[0];
        const insightId = firstInsight.insightId as string;

        assert(typeof insightId === "string" && insightId.length > 0, "list_flow_insights must provide an insightId");

        const detailResult = await callTool("get_flow_insight", { insightId });
        const detailPayload = parseJsonOrThrow(parseTextContent(detailResult)) as Record<string, unknown>;
        assert(typeof detailPayload.insight === "object", "get_flow_insight must include an insight object");
        const detail = detailPayload.insight as Record<string, unknown>;
        assert(detail.insightId === insightId, "get_flow_insight must echo the requested insightId");
        assert(typeof detail.explanation === "string" || detail.explanation === undefined, "insight explanation must be a string when present");
      },
    },
    {
      name: "mcp-profile:tools/call list_my_blockers filters by actor and blocker signals",
      run: async () => {
        const listResult = await callTool("list_flow_insights");
        const listPayload = parseJsonOrThrow(parseTextContent(listResult)) as Record<string, unknown>;
        const insights = listPayload.insights as Record<string, unknown>[];
        const blocker = insights.find((entry) => entry.signalId === "blocked_on_review");
        assert(blocker, "Fixtures must include a blocked_on_review signal for blocker coverage");

        const actorName = Array.isArray(blocker.actors) ? (blocker.actors as string[])[0] : undefined;
        assert(actorName && actorName.length > 0, "blocked_on_review insight must list at least one actor");

        const blockersResult = await callTool("list_my_blockers", { actor: actorName });
        const blockersPayload = parseJsonOrThrow(parseTextContent(blockersResult)) as Record<string, unknown>;
        const blockerInsights = blockersPayload.insights as Record<string, unknown>[];

        assert(blockerInsights.length > 0, "list_my_blockers must return at least one blocker");
        for (const entry of blockerInsights) {
          assert(
            entry.signalId === "blocked_on_review" ||
              entry.signalId === "waiting_on_evidence" ||
              entry.signalId === "aging_implementation",
            `list_my_blockers must only include blocker signals (found ${entry.signalId as string})`
          );
          const actors = entry.actors as string[] | undefined;
          assert(Array.isArray(actors) && actors.some((name) => name.toLowerCase().includes(actorName.toLowerCase())), "blocker must include the requested actor");
        }
      },
    },
    {
      name: "mcp-profile:tools/call list_service_risk_signals returns aggregated risk",
      run: async () => {
        const listResult = await callTool("list_flow_insights");
        const listPayload = parseJsonOrThrow(parseTextContent(listResult)) as Record<string, unknown>;
        const insights = listPayload.insights as Record<string, unknown>[];
        const riskInsight = insights.find((entry) => entry.signalId === "risk_aggregation");
        assert(riskInsight, "Fixtures must include a risk_aggregation signal for risk coverage");

        const service = Array.isArray(riskInsight.services) ? (riskInsight.services as string[])[0] : undefined;
        assert(typeof service === "string" && service.length > 0, "risk insight must include a service scope");

        const riskResult = await callTool("list_service_risk_signals", { service });
        const riskPayload = parseJsonOrThrow(parseTextContent(riskResult)) as Record<string, unknown>;
        const riskInsights = riskPayload.insights as Record<string, unknown>[];
        assert(riskInsights.length > 0, "list_service_risk_signals must return at least one risk signal");

        for (const entry of riskInsights) {
          assert(entry.signalId === "risk_aggregation", "risk signals list must contain only risk_aggregation entries");
          const services = entry.services as string[] | undefined;
          assert(
            Array.isArray(services) && services.some((name) => name.toLowerCase().includes(service.toLowerCase())),
            "risk signal must reference the requested service scope"
          );
        }
      },
    },
  ];
}
