package inference

import (
	"fmt"
	"idp-go-net-http-rest/bff/flow"
	"sort"
	"time"
)

func hoursElapsed(from string, now time.Time) float64 {
	parsed, err := time.Parse(time.RFC3339, from)
	if err != nil {
		return 0
	}
	return now.Sub(parsed).Hours()
}

func selectReviewState(states []flow.NormalizedReviewState) (flow.NormalizedReviewState, bool) {
	candidates := make([]flow.NormalizedReviewState, 0)
	for _, state := range states {
		if state.State == "awaiting_review" || state.State == "under_review" {
			candidates = append(candidates, state)
		}
	}
	if len(candidates) == 0 {
		return flow.NormalizedReviewState{}, false
	}
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].AsOf > candidates[j].AsOf
	})
	return candidates[0], true
}

func hasBlockingValidation(input flow.ProviderAdapterInput, changeID string) bool {
	for _, run := range input.ValidationRuns {
		if run.ChangeID == changeID && run.Scope == "branch" && (run.State == "failed" || run.State == "flaky") {
			return true
		}
	}
	return false
}

func resolveActors(actors []flow.NormalizedActor, ids []string) []string {
	if len(ids) == 0 {
		return nil
	}
	lookup := make(map[string]string, len(actors))
	for _, actor := range actors {
		lookup[actor.ProviderID] = actor.DisplayName
	}
	names := make([]string, 0, len(ids))
	for _, id := range ids {
		if name, ok := lookup[id]; ok && name != "" {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names
}

func InferBlockedOnReview(input flow.ProviderAdapterInput, now time.Time) (*flow.FlowSignal, bool) {
	reviewState, ok := selectReviewState(input.ReviewStates)
	if !ok {
		return nil, false
	}

	refTime := reviewState.LastActivityAt
	if refTime == "" {
		refTime = reviewState.AsOf
	}

	elapsed := hoursElapsed(refTime, now)
	if elapsed < ReviewWindowHours {
		return nil, false
	}

	changeID := reviewState.ChangeID
	if hasBlockingValidation(input, changeID) {
		return nil, false
	}

	reviewers := resolveActors(input.Actors, reviewState.ReviewerActorIDs)
	waitingOn := "assigned reviewers"
	if len(reviewers) > 0 {
		waitingOn = fmt.Sprintf("%s", reviewers)
	} else if len(reviewState.ReviewerTeamNames) > 0 {
		waitingOn = fmt.Sprintf("%s", reviewState.ReviewerTeamNames)
	}

	partial := reviewState.IsPartial || input.Repository.IsPartial
	for _, c := range input.Changes {
		if c.ProviderID == changeID && c.IsPartial {
			partial = true
			break
		}
	}

	signal := flow.FlowSignal{
		ID:         "blocked_on_review",
		Title:      "Blocked on review",
		Severity:   "high",
		Confidence: degradeConfidence("high", partial),
		Explanation: fmt.Sprintf("Waiting %.0fh for review: pending %s.", elapsed, waitingOn),
		RecommendedNextAction: "Notify assigned reviewers or reassess reviewer assignment.",
		RelatedEntities:      []any{changeID},
	}

	return &signal, true
}
