import type { NormalizedActor, NormalizedOwnershipHint } from "../types";
import type { FlowSignalConfidence } from "./types";

export function degradeConfidence(
  base: FlowSignalConfidence,
  isPartial: boolean,
): FlowSignalConfidence {
  if (!isPartial) {
    return base;
  }

  if (base === "high") {
    return "medium";
  }

  return "low";
}

export function resolveActors(
  actors: NormalizedActor[],
  actorIds: string[] | undefined,
): string[] {
  if (!actorIds || actorIds.length === 0) {
    return [];
  }

  const lookup = new Map(actors.map((actor) => [actor.provider_id, actor.display_name]));
  return actorIds
    .map((id) => lookup.get(id))
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0);
}

export function summarizeOwners(hints: NormalizedOwnershipHint[]): string[] {
  const owners = new Set<string>();

  for (const hint of hints) {
    for (const team of hint.owner_team_names ?? []) {
      if (team.trim().length > 0) {
        owners.add(team);
      }
    }
    for (const actor of hint.owner_actor_ids ?? []) {
      if (actor.trim().length > 0) {
        owners.add(actor);
      }
    }
  }

  return Array.from(owners).sort((a, b) => a.localeCompare(b));
}
