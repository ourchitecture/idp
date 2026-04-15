import { AGING_WINDOW_HOURS } from "./thresholds";
import { degradeConfidence, resolvePrimaryTeam } from "./explain";
import type { ProviderAdapterInput, NormalizedValidationRun } from "../types";
import type { FlowSignal } from "./types";

function findTrunkPending(runs: NormalizedValidationRun[], changeId: string): NormalizedValidationRun | null {
  const candidates = runs.filter(
    (run) =>
      run.change_id === changeId &&
      run.scope === "trunk" &&
      (run.state === "pending" || run.state === "running"),
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => Date.parse(b.run_at) - Date.parse(a.run_at))[0];
}

export function inferAgingImplementation(
  input: ProviderAdapterInput,
  now: Date,
): FlowSignal | null {
  const mergedChange = input.changes.find((change) => change.state === "merged");
  if (!mergedChange || !mergedChange.merged_at) {
    return null;
  }

  const trunkPending = findTrunkPending(input.validation_runs, mergedChange.provider_id);
  if (!trunkPending) {
    return null;
  }

  const elapsedHours =
    (now.getTime() - Date.parse(mergedChange.merged_at)) / (1000 * 60 * 60);
  if (!Number.isFinite(elapsedHours) || elapsedHours < AGING_WINDOW_HOURS) {
    return null;
  }

  const partialFlag =
    mergedChange.is_partial === true || trunkPending.is_partial === true || input.repository.is_partial === true;
  const service = input.repository.full_name ?? input.repository.provider_id;
  const team = resolvePrimaryTeam(input.ownership_hints);

  return {
    id: "aging_implementation",
    title: "Aging between implementation and validation",
    severity: "medium",
    confidence: degradeConfidence("high", partialFlag),
    explanation: `Implementation merged ${Math.floor(elapsedHours)}h ago; trunk validation still ${trunkPending.state}.`,
    recommendedNextAction: "Start or prioritize trunk validation for the merged change.",
    relatedEntities: [service, mergedChange.provider_id],
    scope: { service, team, stage: "validation" },
    observedAt: trunkPending.run_at,
  };
}
