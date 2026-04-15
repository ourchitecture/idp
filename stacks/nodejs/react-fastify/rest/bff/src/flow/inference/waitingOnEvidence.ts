import { degradeConfidence, resolveActors, resolvePrimaryTeam } from "./explain";
import type { ProviderAdapterInput, NormalizedEvidenceState } from "../types";
import type { FlowSignal } from "./types";

function selectEvidence(evidenceStates: NormalizedEvidenceState[]): NormalizedEvidenceState | null {
  const candidates = evidenceStates.filter((evidence) =>
    evidence.state === "required" || evidence.state === "pending" || evidence.state === "stale"
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => Date.parse(b.as_of) - Date.parse(a.as_of))[0];
}

export function inferWaitingOnEvidence(input: ProviderAdapterInput): FlowSignal | null {
  if (!input.evidence_states || input.evidence_states.length === 0) {
    return null;
  }

  const evidence = selectEvidence(input.evidence_states);
  if (!evidence) {
    return null;
  }

  const change = input.changes.find((c) => c.provider_id === evidence.change_id);
  if (!change || change.state !== "merged") {
    return null;
  }

  const runsForChange = input.validation_runs.filter((run) => run.change_id === change.provider_id);
  const hasPassedValidation = runsForChange.some((run) => run.state === "passed");
  const hasBlockingValidation = runsForChange.some((run) =>
    run.state === "failed" || run.state === "flaky" || run.state === "pending" || run.state === "running",
  );

  if (!hasPassedValidation || hasBlockingValidation) {
    return null;
  }

  const ownerNames = resolveActors(input.actors, evidence.owner_actor_id ? [evidence.owner_actor_id] : []);
  const evidenceTypes = (evidence.required_types ?? []).join(", ");
  const service = input.repository.full_name ?? input.repository.provider_id;
  const ownerActor = input.actors.find((actor) => actor.provider_id === evidence.owner_actor_id);
  const team = ownerActor?.team_memberships?.[0] ?? resolvePrimaryTeam(input.ownership_hints);

  const partialFlag =
    evidence.is_partial === true ||
    change.is_partial === true ||
    input.repository.is_partial === true ||
    runsForChange.some((run) => run.is_partial);

  return {
    id: "waiting_on_evidence",
    title: "Waiting on evidence, not effort",
    severity: "medium",
    confidence: degradeConfidence("high", partialFlag),
    explanation:
      evidenceTypes.length > 0
        ? `Evidence pending for ${service}: ${evidenceTypes}.`
        : `Evidence pending for ${service}.`,
    recommendedNextAction:
      ownerNames.length > 0
        ? `Request required evidence from ${ownerNames.join(", ")}.`
        : "Request required evidence from the accountable owner.",
    relatedEntities: [service, change.provider_id, ...(evidence.required_types ?? [])],
    scope: { service, team, stage: "evidence" },
    observedAt: evidence.as_of ?? change.updated_at ?? input.repository.fetched_at,
  };
}
