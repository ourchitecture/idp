import { REVIEW_WINDOW_HOURS } from "./thresholds";
import { degradeConfidence, resolveActors, resolvePrimaryTeam } from "./explain";
import type {
  NormalizedActor,
  NormalizedReviewState,
  ProviderAdapterInput,
} from "../types";
import type { FlowSignal } from "./types";

function hoursElapsed(from: string, now: Date): number {
  const start = Date.parse(from);
  if (!Number.isFinite(start)) {
    return 0;
  }
  return (now.getTime() - start) / (1000 * 60 * 60);
}

function selectReviewState(reviewStates: NormalizedReviewState[]): NormalizedReviewState | null {
  const candidates = reviewStates.filter((state) =>
    state.state === "awaiting_review" || state.state === "under_review"
  );
  if (candidates.length === 0) {
    return null;
  }
  // Use most recent by as_of
  return candidates.sort((a, b) => Date.parse(b.as_of) - Date.parse(a.as_of))[0];
}

function hasBlockingValidation(input: ProviderAdapterInput, changeId: string): boolean {
  return input.validation_runs.some(
    (run) =>
      run.change_id === changeId &&
      run.scope === "branch" &&
      (run.state === "failed" || run.state === "flaky"),
  );
}

export function inferBlockedOnReview(
  input: ProviderAdapterInput,
  now: Date,
): FlowSignal | null {
  const reviewState = selectReviewState(input.review_states);
  if (!reviewState) {
    return null;
  }

  const referenceTime = reviewState.last_activity_at ?? reviewState.as_of;
  const elapsedHours = hoursElapsed(referenceTime, now);
  if (elapsedHours < REVIEW_WINDOW_HOURS) {
    return null;
  }

  const changeId = reviewState.change_id;
  if (hasBlockingValidation(input, changeId)) {
    return null;
  }

  const reviewers = resolveActors(input.actors, reviewState.reviewer_actor_ids);
  const reviewerTeams = reviewState.reviewer_team_names ?? [];
  const waitingOn =
    reviewers.length > 0
      ? reviewers.join(", ")
      : reviewerTeams.length > 0
        ? reviewerTeams.join(", ")
        : "assigned reviewers";

  const baseConfidence: FlowSignal["confidence"] = "high";
  const partialFlag =
    reviewState.is_partial === true ||
    input.repository.is_partial === true ||
    input.changes.some((c) => c.provider_id === changeId && c.is_partial);

  const confidence = degradeConfidence(baseConfidence, partialFlag);
  const service = input.repository.full_name ?? input.repository.provider_id;
  const team = resolvePrimaryTeam(input.ownership_hints);
  const observedAt = reviewState.as_of ?? referenceTime ?? new Date().toISOString();

  return {
    id: "blocked_on_review",
    title: "Blocked on review",
    severity: "high",
    confidence,
    explanation: `Waiting ${Math.floor(elapsedHours)}h for review: pending ${waitingOn}.`,
    recommendedNextAction: "Notify assigned reviewers or reassess reviewer assignment.",
    relatedEntities: [service, changeId],
    scope: { service, team, stage: "review" },
    observedAt,
  };
}
