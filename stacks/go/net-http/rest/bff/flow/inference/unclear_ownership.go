package inference

import (
	"idp-go-net-http-rest/bff/flow"
	"sort"
	"strings"
)

func summarizeOwners(hints []flow.NormalizedOwnershipHint) []string {
	owners := make(map[string]struct{})
	for _, hint := range hints {
		for _, team := range hint.OwnerTeamNames {
			if team != "" {
				owners[team] = struct{}{}
			}
		}
		for _, actor := range hint.OwnerActorIDs {
			if actor != "" {
				owners[actor] = struct{}{}
			}
		}
	}
	names := make([]string, 0, len(owners))
	for name := range owners {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func hasConflict(hints []flow.NormalizedOwnershipHint) bool {
	if len(hints) < 2 {
		return false
	}
	seen := make(map[string]struct{})
	for _, hint := range hints {
		key := summarizeOwners([]flow.NormalizedOwnershipHint{hint})
		joined := strings.Join(key, ",")
		if _, ok := seen[joined]; ok && joined != "" {
			continue
		}
		seen[joined] = struct{}{}
	}
	return len(seen) > 1
}

func InferUnclearOwnership(input flow.ProviderAdapterInput) (*flow.FlowSignal, bool) {
	if len(input.OwnershipHints) == 0 {
		return nil, false
	}

	unclear := false
	for _, hint := range input.OwnershipHints {
		if len(hint.OwnerActorIDs) == 0 && len(hint.OwnerTeamNames) == 0 {
			unclear = true
			break
		}
	}

	conflict := hasConflict(input.OwnershipHints)

	if !unclear && !conflict {
		return nil, false
	}

	partial := false
	for _, hint := range input.OwnershipHints {
		if hint.IsPartial {
			partial = true
			break
		}
	}

	owners := summarizeOwners(input.OwnershipHints)

	signal := flow.FlowSignal{
		ID:         "unclear_ownership",
		Title:      "Unclear ownership",
		Severity:   "medium",
		Confidence: degradeConfidence("high", partial),
		Explanation: func() string {
			if conflict {
				return "Conflicting owners detected: " + strings.Join(owners, ", ")
			}
			return "No ownership signals found for this scope."
		}(),
		RecommendedNextAction: "Assign or confirm a single accountable owner for the affected scope.",
		RelatedEntities:      make([]any, 0),
	}
	for _, owner := range owners {
		signal.RelatedEntities = append(signal.RelatedEntities, owner)
	}

	return &signal, true
}
