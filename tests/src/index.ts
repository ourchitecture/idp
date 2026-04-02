"use strict";

import { buildTestsForProfile } from "./profiles";
import {
  loadStackMetadata,
  resolveBaseUrl,
  resolveRequestedProfiles,
  shouldRunProfile,
} from "./runtime";
import type { ContractContext, ProfileName, TestCase } from "./types";

async function runTest(test: TestCase): Promise<void> {
  try {
    await test.run();
    console.log(JSON.stringify({
      level: "info",
      msg: "contract test passed",
      test: test.name,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
      level: "error",
      msg: "contract test failed",
      test: test.name,
      error: message,
    }));
    throw error;
  }
}

async function main(): Promise<void> {
  const webBaseUrl = resolveBaseUrl("IDP_WEB_URL", "http://localhost:3000");
  const bffBaseUrl = resolveBaseUrl("IDP_BFF_URL", "http://localhost:8000");
  const mcpBaseUrl = resolveBaseUrl("IDP_MCP_URL", "http://localhost:8080");

  const stackMetadata = await loadStackMetadata();
  const requestedProfiles = resolveRequestedProfiles();
  const orderedProfiles: ProfileName[] = ["core", "operational", "ui-profile", "mcp-profile"];

  const context: ContractContext = {
    webBaseUrl,
    bffBaseUrl,
    mcpBaseUrl,
    stackMetadata,
  };

  const selectedProfiles = orderedProfiles.filter((profile) =>
    shouldRunProfile(profile, requestedProfiles, stackMetadata)
  );

  if (selectedProfiles.length === 0) {
    throw new Error(
      "No contract profiles selected. Ensure IDP_CONTRACT_PROFILE(S) or stack.json contractProfiles are configured correctly."
    );
  }

  const tests = selectedProfiles.flatMap((profile) => buildTestsForProfile(profile, context));

  if (tests.length === 0) {
    throw new Error(
      "Selected contract profiles produced no tests. Check stack metadata capability flags and profile selection."
    );
  }

  console.log(
    JSON.stringify({
      level: "info",
      msg: "contract profiles selected",
      profiles: selectedProfiles,
      stackPath: process.env.IDP_STACK_PATH ?? null,
    })
  );

  let failures = 0;
  for (const test of tests) {
    try {
      await runTest(test);
    } catch {
      failures += 1;
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({
    level: "error",
    msg: "contract test runner failed",
    error: message,
  }));
  process.exitCode = 1;
});
