import { createAgentWorkTests } from "./agent-work";
import { createAuthProfileTests } from "./auth-profile";
import { createCoreTests } from "./core";
import { createFlowInsightsTests } from "./flow-insights";
import { createMcpProfileTests } from "./mcp-profile";
import { createOperationalTests } from "./operational";
import { createStatusProfileTests } from "./status-profile";
import { createUiProfileTests } from "./ui-profile";
import type { ContractContext, ProfileName, TestCase } from "../types";

export function buildTestsForProfile(profile: ProfileName, context: ContractContext): TestCase[] {
  if (profile === "core") {
    return createCoreTests(context);
  }

  if (profile === "operational") {
    return createOperationalTests(context);
  }

  if (profile === "status-profile") {
    return createStatusProfileTests(context);
  }

  if (profile === "mcp-profile") {
    return createMcpProfileTests(context);
  }

  if (profile === "auth-profile") {
    return createAuthProfileTests(context);
  }

  if (profile === "flow-insights") {
    return createFlowInsightsTests(context);
  }

  if (profile === "agent-work") {
    return createAgentWorkTests(context);
  }

  return createUiProfileTests(context);
}
