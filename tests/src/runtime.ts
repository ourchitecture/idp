import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { assert } from "./assertions";
import { request } from "./http";
import type { ProfileName, StackMetadata } from "./types";

const DEFAULT_STACK = "stacks/go/net-http/rest";

function parseProfiles(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim().length === 0) {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function isProfileName(value: string): value is ProfileName {
  return (
    value === "core" ||
    value === "operational" ||
    value === "status-profile" ||
    value === "ui-profile" ||
    value === "mcp-profile" ||
    value === "auth-profile"
  );
}

export function resolveBaseUrl(envName: string, fallback: string): URL {
  const raw = process.env[envName] ?? fallback;
  try {
    return new URL(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${envName} value: ${raw} (${message})`);
  }
}

export async function ensureServiceAvailable(
  serviceName: string,
  baseUrl: URL
): Promise<void> {
  try {
    await request(new URL("/", baseUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const instructions = [
      `Unable to reach ${serviceName} at ${baseUrl.toString()}.`,
      `Error: ${message}`,
      "Start a technology stack and re-run the contract tests:",
      "  Option 1: make dev",
      "  Option 2:",
      `    make -C ${DEFAULT_STACK} run-web`,
      `    make -C ${DEFAULT_STACK} run-bff`,
    ].join("\n");

    throw new Error(instructions);
  }
}

function detectRepoRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    const makefilePath = path.join(current, "Makefile");

    try {
      const packageJsonExists = requirePathExists(packageJsonPath);
      const makefileExists = requirePathExists(makefilePath);
      if (packageJsonExists && makefileExists) {
        return current;
      }
    } catch {
      // Continue traversing upward.
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Unable to detect repository root from contract harness context");
    }

    current = parent;
  }
}

function requirePathExists(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function loadStackMetadata(
  stackPathEnv = process.env.IDP_STACK_PATH
): Promise<StackMetadata | null> {
  if (stackPathEnv === undefined || stackPathEnv.trim().length === 0) {
    return null;
  }

  const repoRoot = detectRepoRoot(process.cwd());

  const stackPath = stackPathEnv.trim();
  const metadataPath = path.join(repoRoot, stackPath, "stack.json");

  const raw = await fsPromises.readFile(metadataPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  assert(typeof parsed === "object" && parsed !== null, "stack.json must contain an object");

  const candidate = parsed as StackMetadata;
  if (candidate.contractProfiles !== undefined) {
    const invalid = candidate.contractProfiles.filter((profile) => !isProfileName(profile));
    if (invalid.length > 0) {
      throw new Error(`Invalid stack.json contractProfiles entries: ${invalid.join(", ")}`);
    }
  }

  return candidate;
}

export function resolveRequestedProfiles(
  defaultProfiles: ProfileName[] = ["core", "operational"]
): ProfileName[] {
  const requested = parseProfiles(process.env.IDP_CONTRACT_PROFILES);
  if (requested.length > 0) {
    const invalid = requested.filter((value) => !isProfileName(value));
    if (invalid.length > 0) {
      throw new Error(`Unknown contract profiles: ${invalid.join(", ")}`);
    }

    return requested as ProfileName[];
  }

  const singleProfile = process.env.IDP_CONTRACT_PROFILE;
  if (singleProfile !== undefined && singleProfile.trim().length > 0) {
    const trimmed = singleProfile.trim();
    if (!isProfileName(trimmed)) {
      throw new Error(`Unknown contract profile: ${trimmed}`);
    }

    return [trimmed];
  }

  if (process.env.IDP_STACK_PATH !== undefined && process.env.IDP_STACK_PATH.trim().length > 0) {
    return [];
  }

  return defaultProfiles;
}

export function shouldRunProfile(
  profile: ProfileName,
  requestedProfiles: ProfileName[],
  stackMetadata: StackMetadata | null
): boolean {
  if (requestedProfiles.length === 0) {
    if (stackMetadata?.contractProfiles !== undefined) {
      return stackMetadata.contractProfiles.includes(profile);
    }

    return false;
  }

  if (!requestedProfiles.includes(profile)) {
    return false;
  }

  if (stackMetadata?.contractProfiles !== undefined) {
    return stackMetadata.contractProfiles.includes(profile);
  }

  if (
    (profile === "status-profile" && stackMetadata?.capabilities?.status?.enabled !== true) ||
    (profile === "ui-profile" && stackMetadata?.capabilities?.ui?.enabled !== true) ||
    (profile === "mcp-profile" && stackMetadata?.capabilities?.mcp?.enabled !== true) ||
    (profile === "auth-profile" && stackMetadata?.capabilities?.auth?.enabled !== true)
  ) {
    return false;
  }

  return true;
}
