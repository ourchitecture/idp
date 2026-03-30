import { createCoreTests } from "./core";
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

  return createUiProfileTests(context);
}
