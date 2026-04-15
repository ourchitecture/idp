import { TRUNK_WINDOW_MINUTES } from "./thresholds";
import { degradeConfidence, resolvePrimaryTeam } from "./explain";
import type { ProviderAdapterInput, NormalizedValidationRun } from "../types";
import type { FlowSignal } from "./types";

function findBranchPass(runs: NormalizedValidationRun[], changeId: string): NormalizedValidationRun | null {
  return (
    runs.find((run) => run.change_id === changeId && run.scope === "branch" && run.state === "passed") ??
    null
  );
}

function findTrunkFailure(
  runs: NormalizedValidationRun[],
  changeId: string,
): NormalizedValidationRun | null {
  const candidates = runs.filter(
    (run) =>
      run.change_id === changeId &&
      run.scope === "trunk" &&
      (run.state === "failed" || run.state === "flaky"),
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => Date.parse(b.run_at) - Date.parse(a.run_at))[0];
}

export function inferTrunkIntegrationFailure(
  input: ProviderAdapterInput,
  now: Date,
): FlowSignal | null {
  const mergedChange = input.changes.find((change) => change.state === "merged");
  if (!mergedChange) {
    return null;
  }

  const branchPass = findBranchPass(input.validation_runs, mergedChange.provider_id);
  const trunkFail = findTrunkFailure(input.validation_runs, mergedChange.provider_id);

  if (!branchPass || !trunkFail) {
    return null;
  }

  const mergedAt = mergedChange.merged_at ?? mergedChange.updated_at;
  if (!mergedAt) {
    return null;
  }

  const deltaMinutes =
    (Date.parse(trunkFail.run_at) - Date.parse(mergedAt)) / (1000 * 60);
  if (!Number.isFinite(deltaMinutes)) {
    return null;
  }
  const withinWindow = deltaMinutes <= TRUNK_WINDOW_MINUTES;

  const partialFlag =
    mergedChange.is_partial === true ||
    branchPass.is_partial === true ||
    trunkFail.is_partial === true ||
    input.repository.is_partial === true;
  const service = input.repository.full_name ?? input.repository.provider_id;
  const team = resolvePrimaryTeam(input.ownership_hints);

  return {
    id: "trunk_integration_failure",
    title: "Trunk integration failed after passing branch checks",
    severity: "high",
    confidence: degradeConfidence(withinWindow ? "high" : "medium", partialFlag),
    explanation: `Branch checks passed but trunk run '${trunkFail.name ?? "trunk"}' failed ${Math.ceil(deltaMinutes)} minutes after merge.`,
    recommendedNextAction: "Investigate trunk failure, fix forward or roll back the change on trunk.",
    relatedEntities: [service, mergedChange.provider_id, trunkFail.name ?? "trunk"],
    scope: { service, team, stage: "validation" },
    observedAt: input.repository.fetched_at ?? trunkFail.run_at ?? mergedChange.updated_at ?? mergedAt,
  };
}
