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

	owner := resolveActorName(input.Actors, evidence.OwnerActorID)
	types := evidence.RequiredTypes
	desc := "Evidence pending for this change."
	if len(types) > 0 {
		desc = fmt.Sprintf("Evidence pending: %s.", strings.Join(types, ", "))
	}

	partial := evidence.IsPartial

	signal := flow.FlowSignal{
		ID:         "waiting_on_evidence",
		Title:      "Waiting on evidence, not effort",
		Severity:   "medium",
		Confidence: degradeConfidence("high", partial),
		Explanation: desc,
		RecommendedNextAction: func() string {
			if owner != "" {
				return fmt.Sprintf("Request required evidence from %s.", owner)
			}
			return "Request required evidence from the accountable owner."
		}(),
	}
	for _, t := range types {
		signal.RelatedEntities = append(signal.RelatedEntities, t)
	}

	return &signal, true
}
