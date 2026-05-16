"use strict";

import { buildTestsForProfile } from "./profiles";
import {
  loadStackMetadata,
  resolveBaseUrl,
  resolveRequestedProfiles,
  shouldRunProfile,
} from "./runtime";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import type { ContractContext, ProfileName, TestCase } from "./types";

type StartedProcess = {
  label: string;
  proc: ChildProcess;
};

const startedProcesses: StartedProcess[] = [];

function startProcess(label: string, command: string): ChildProcess {
  const proc = spawn(command, {
    shell: true,
    env: process.env,
    detached: true,
    stdio: "ignore",
  });

  proc.unref();

  proc.on("error", (error) => {
    console.log(
      JSON.stringify({
        level: "error",
        msg: "failed to start managed process",
        label,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  });

  startedProcesses.push({ label, proc });
  console.log(JSON.stringify({ level: "info", msg: `${label} started`, pid: proc.pid }));
  return proc;
}

function stopProcess(proc: ChildProcess, label: string): void {
  try {
    if (proc.killed || proc.pid === undefined) {
      return;
    }
    if (process.platform === "win32") {
      proc.kill();
    } else {
      // Kill the entire process group so child processes are cleaned up.
      process.kill(-(proc.pid ?? 0), "SIGTERM");
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "warn",
        msg: "failed to stop managed process",
        label,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

function cleanupStartedProcesses(): void {
  for (const { proc, label } of [...startedProcesses].reverse()) {
    stopProcess(proc, label);
  }
}

async function waitForReady(label: string, url: URL, timeoutMs: number, intervalMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url.toString(), { method: "GET" });
      if (response.ok) {
        console.log(JSON.stringify({ level: "info", msg: `${label} ready`, url: url.toString() }));
        return true;
      }
    } catch {
      // continue polling
    }

    await delay(intervalMs);
  }

  console.log(JSON.stringify({ level: "error", msg: `${label} did not become ready`, url: url.toString() }));
  return false;
}

async function ensureServersStarted(bffBaseUrl: URL): Promise<() => void> {
  const skipAutoStart = process.env.OUR_IDP_SERVERS_STARTED === "1";
  const webStart = process.env.OUR_IDP_WEB_START_CMD;
  const bffStart = process.env.OUR_IDP_BFF_START_CMD;
  const mockStart = process.env.OUR_IDP_MOCK_OAUTH_START_CMD;
  const mockUrl = process.env.OUR_IDP_MOCK_OAUTH_URL;

  if (skipAutoStart || !webStart || !bffStart) {
    return () => undefined;
  }

  const readyTimeoutMs = (parseInt(process.env.OUR_IDP_READY_TIMEOUT ?? "120", 10) || 120) * 1000;
  const readyIntervalMs = (parseInt(process.env.OUR_IDP_READY_INTERVAL ?? "1", 10) || 1) * 1000;

  process.on("exit", cleanupStartedProcesses);
  process.on("SIGINT", () => {
    cleanupStartedProcesses();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanupStartedProcesses();
    process.exit(143);
  });

  if (mockStart) {
    if (!mockUrl) {
      throw new Error("OUR_IDP_MOCK_OAUTH_URL is required when OUR_IDP_MOCK_OAUTH_START_CMD is set");
    }
    startProcess("mock-oauth", mockStart);
    const mockReady = await waitForReady(
      "mock-oauth readiness",
      new URL("/health", mockUrl),
      readyTimeoutMs,
      readyIntervalMs
    );
    if (!mockReady) {
      throw new Error("Mock OAuth server did not become ready");
    }
  }

  startProcess("web", webStart);
  startProcess("bff", bffStart);

  const bffReady = await waitForReady(
    "BFF readiness",
    new URL("/readiness", bffBaseUrl),
    readyTimeoutMs,
    readyIntervalMs
  );

  if (!bffReady) {
    cleanupStartedProcesses();
    throw new Error("BFF did not become ready");
  }

  process.env.OUR_IDP_SERVERS_STARTED = "1";
  return cleanupStartedProcesses;
}

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
  const webBaseUrl = resolveBaseUrl("OUR_IDP_WEB_URL", "http://localhost:3000");
  const bffBaseUrl = resolveBaseUrl("OUR_IDP_BFF_URL", "http://localhost:8000");
  const mcpBaseUrl = resolveBaseUrl("OUR_IDP_MCP_URL", "http://localhost:8080");

  const stackMetadata = await loadStackMetadata();
  const requestedProfiles = resolveRequestedProfiles();
  const orderedProfiles: ProfileName[] = [
    "core",
    "operational",
    "flow-insights",
    "status-profile",
    "ui-profile",
    "mcp-profile",
    "auth-profile",
    "agent-work",
  ];

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
      "No contract profiles selected. Ensure OUR_IDP_CONTRACT_PROFILE(S) or stack.json contractProfiles are configured correctly."
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
      stackPath: process.env.OUR_IDP_STACK_PATH ?? null,
    })
  );

  const cleanup = await ensureServersStarted(bffBaseUrl);

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

  cleanup();
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
