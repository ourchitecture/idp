package inference

import (
	"fmt"
	"idp-go-net-http-rest/bff/flow"
	"sort"
	"strings"
)

func selectEvidence(states []flow.NormalizedEvidenceState) (flow.NormalizedEvidenceState, bool) {
	candidates := make([]flow.NormalizedEvidenceState, 0)
	for _, state := range states {
		if state.State == "required" || state.State == "pending" || state.State == "stale" {
			candidates = append(candidates, state)
		}
	}
	if len(candidates) == 0 {
		return flow.NormalizedEvidenceState{}, false
	}
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].AsOf > candidates[j].AsOf
	})
	return candidates[0], true
}

func resolveActorName(actors []flow.NormalizedActor, id string) string {
	for _, actor := range actors {
		if actor.ProviderID == id {
			return actor.DisplayName
		}
	}
	return ""
}

func InferWaitingOnEvidence(input flow.ProviderAdapterInput) (*flow.FlowSignal, bool) {
	if len(input.EvidenceStates) == 0 {
		return nil, false
	}

	evidence, ok := selectEvidence(input.EvidenceStates)
	if !ok {
		return nil, false
	}

	var change *flow.NormalizedChange
	for i := range input.Changes {
		if input.Changes[i].ProviderID == evidence.ChangeID {
			change = &input.Changes[i]
			break
		}
	}
	if change == nil || change.State != "merged" {
		return nil, false
	}

	runs := make([]flow.NormalizedValidationRun, 0)
	for _, run := range input.ValidationRuns {
		if run.ChangeID == change.ProviderID {
			runs = append(runs, run)
		}
	}

	hasPassed := false
	hasBlocking := false
	for _, run := range runs {
		if run.State == "passed" {
			hasPassed = true
		}
		if run.State == "failed" || run.State == "flaky" || run.State == "pending" || run.State == "running" {
			hasBlocking = true
		}
	}
	if !hasPassed || hasBlocking {
		return nil, false
	}

	owner := resolveActorName(input.Actors, evidence.OwnerActorID)
	types := evidence.RequiredTypes
	service := serviceFrom(input.Repository)
	desc := fmt.Sprintf("Evidence pending for %s.", service)
	if len(types) > 0 {
		desc = fmt.Sprintf("Evidence pending for %s: %s.", service, strings.Join(types, ", "))
	}

	partial := evidence.IsPartial || change.IsPartial || input.Repository.IsPartial
	for _, run := range runs {
		if run.IsPartial {
			partial = true
			break
		}
	}
	team := resolvePrimaryTeam(input.OwnershipHints)
	if team == "" {
		for _, actor := range input.Actors {
			if actor.ProviderID == evidence.OwnerActorID && len(actor.TeamMemberships) > 0 {
				team = actor.TeamMemberships[0]
				break
			}
		}
	}

	signal := flow.FlowSignal{
		ID:          "waiting_on_evidence",
		Title:       "Waiting on evidence, not effort",
		Severity:    "medium",
		Confidence:  degradeConfidence("high", partial),
		Explanation: desc,
		RecommendedNextAction: func() string {
			if owner != "" {
				return fmt.Sprintf("Request required evidence from %s.", owner)
			}
			return "Request required evidence from the accountable owner."
		}(),
		RelatedEntities: []any{service, change.ProviderID},
		Scope: &flow.FlowSignalScope{
			Service: service,
			Team:    team,
			Stage:   flow.StageEvidence,
		},
		ObservedAt: evidence.AsOf,
	}
	for _, t := range types {
		signal.RelatedEntities = append(signal.RelatedEntities, t)
	}

	return &signal, true
}
