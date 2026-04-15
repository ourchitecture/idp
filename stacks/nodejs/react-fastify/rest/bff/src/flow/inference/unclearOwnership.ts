import { degradeConfidence, summarizeOwners } from "./explain";
import type { ProviderAdapterInput, NormalizedOwnershipHint } from "../types";
import type { FlowSignal } from "./types";

function isUnclear(hint: NormalizedOwnershipHint): boolean {
  const owners = (hint.owner_actor_ids ?? []).length + (hint.owner_team_names ?? []).length;
  return owners === 0;
}

function hasConflict(hints: NormalizedOwnershipHint[]): boolean {
  const ownerSets = hints.map((hint) => summarizeOwners([hint]).join(","));
  const unique = new Set(ownerSets.filter((o) => o.length > 0));
  return unique.size > 1;
}

export function inferUnclearOwnership(input: ProviderAdapterInput): FlowSignal | null {
  if (input.ownership_hints.length === 0) {
    return null;
  }

  const unclearHints = input.ownership_hints.filter(isUnclear);
  const conflict = hasConflict(input.ownership_hints);

  if (unclearHints.length === 0 && !conflict) {
    return null;
  }

  const owners = summarizeOwners(input.ownership_hints);
  const scopeDescription = owners.length > 0 ? owners.join(", ") : "no confirmed owners";

  const partialFlag = input.ownership_hints.some((hint) => hint.is_partial);
  const service = input.repository.full_name ?? input.repository.provider_id;
  const [team] = owners;

  return {
    id: "unclear_ownership",
    title: "Unclear ownership",
    severity: "medium",
    confidence: degradeConfidence("high", partialFlag),
    explanation: conflict
      ? `Conflicting owners detected: ${scopeDescription}.`
      : "No ownership signals found for this scope.",
    recommendedNextAction: "Assign or confirm a single accountable owner for the affected scope.",
    relatedEntities: [service, ...owners],
    scope: { service, team, stage: "ownership" },
    observedAt: input.repository.fetched_at,
  };
}
