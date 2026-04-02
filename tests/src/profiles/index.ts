import { createCoreTests } from "./core";
import { createMcpProfileTests } from "./mcp-profile";
import { createOperationalTests } from "./operational";
import { createUiProfileTests } from "./ui-profile";
import type { ContractContext, ProfileName, TestCase } from "../types";

export function buildTestsForProfile(profile: ProfileName, context: ContractContext): TestCase[] {
  if (profile === "core") {
    return createCoreTests(context);
  }

  if (profile === "operational") {
    return createOperationalTests(context);
  }

  if (profile === "mcp-profile") {
    return createMcpProfileTests(context);
  }

  return createUiProfileTests(context);
}
