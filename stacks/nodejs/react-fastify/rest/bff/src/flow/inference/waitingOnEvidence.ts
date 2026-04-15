import { degradeConfidence, resolveActors } from "./explain";
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

  const ownerNames = resolveActors(input.actors, evidence.owner_actor_id ? [evidence.owner_actor_id] : []);
  const evidenceTypes = (evidence.required_types ?? []).join(", ");

  const partialFlag = evidence.is_partial === true;

  return {
    id: "waiting_on_evidence",
    title: "Waiting on evidence, not effort",
    severity: "medium",
    confidence: degradeConfidence("high", partialFlag),
    explanation:
      evidenceTypes.length > 0
        ? `Evidence pending: ${evidenceTypes}.`
        : "Evidence pending for this change.",
    recommendedNextAction:
      ownerNames.length > 0
        ? `Request required evidence from ${ownerNames.join(", ")}.`
        : "Request required evidence from the accountable owner.",
    relatedEntities: evidence.required_types,
  };
}
