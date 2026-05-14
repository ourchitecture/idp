import { fetchText, resolveBffUrl } from "../http-client.js";
export const CHECK_HEALTH_TOOL_NAME = "check_health";
export const CHECK_HEALTH_TOOL_DESCRIPTION = "Check the health and readiness status of the IDP BFF service. Returns both the IETF health check response and the readiness check response.";
export async function runCheckHealthTool() {
    const bffUrl = resolveBffUrl();
    const [healthBody, readinessBody] = await Promise.all([
        fetchText(new URL("/health", bffUrl)),
        fetchText(new URL("/readiness", bffUrl)),
    ]);
    const result = {
        health: JSON.parse(healthBody),
        readiness: JSON.parse(readinessBody),
    };
    return {
        content: [{ type: "text", text: JSON.stringify(result) }],
    };
}
export function registerCheckHealth(server) {
    server.tool(CHECK_HEALTH_TOOL_NAME, CHECK_HEALTH_TOOL_DESCRIPTION, {}, async () => runCheckHealthTool());
}
