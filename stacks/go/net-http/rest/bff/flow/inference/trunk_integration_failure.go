package inference

import (
	"fmt"
	"idp-go-net-http-rest/bff/flow"
	"sort"
	"time"
)

func findBranchPass(runs []flow.NormalizedValidationRun, changeID string) (flow.NormalizedValidationRun, bool) {
	for _, run := range runs {
		if run.ChangeID == changeID && run.Scope == "branch" && run.State == "passed" {
			return run, true
		}
	}
	return flow.NormalizedValidationRun{}, false
}

func findTrunkFailure(runs []flow.NormalizedValidationRun, changeID string) (flow.NormalizedValidationRun, bool) {
	candidates := make([]flow.NormalizedValidationRun, 0)
	for _, run := range runs {
		if run.ChangeID == changeID && run.Scope == "trunk" && (run.State == "failed" || run.State == "flaky") {
			candidates = append(candidates, run)
		}
	}
	if len(candidates) == 0 {
		return flow.NormalizedValidationRun{}, false
	}
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].RunAt > candidates[j].RunAt
	})
	return candidates[0], true
}

func InferTrunkIntegrationFailure(input flow.ProviderAdapterInput, now time.Time) (*flow.FlowSignal, bool) {
	var merged *flow.NormalizedChange
	for i := range input.Changes {
		if input.Changes[i].State == "merged" {
			merged = &input.Changes[i]
			break
		}
	}
	if merged == nil || merged.MergedAt == "" {
		return nil, false
	}

	branchPass, ok := findBranchPass(input.ValidationRuns, merged.ProviderID)
	if !ok {
		return nil, false
	}

	trunkFail, ok := findTrunkFailure(input.ValidationRuns, merged.ProviderID)
	if !ok {
		return nil, false
	}

	mergedAt, err := time.Parse(time.RFC3339, merged.MergedAt)
	if err != nil {
		return nil, false
	}

	runAt, err := time.Parse(time.RFC3339, trunkFail.RunAt)
	if err != nil {
		return nil, false
	}

	deltaMinutes := runAt.Sub(mergedAt).Minutes()
	if deltaMinutes < 0 {
		deltaMinutes = 0
	}

	withinWindow := deltaMinutes <= TrunkWindowMinutes

	partial := merged.IsPartial || branchPass.IsPartial || trunkFail.IsPartial || input.Repository.IsPartial

	signal := flow.FlowSignal{
		ID:         "trunk_integration_failure",
		Title:      "Trunk integration failed after passing branch checks",
		Severity:   "high",
		Confidence: degradeConfidence(func() flow.FlowSignalConfidence {
			if withinWindow {
				return "high"
			}
			return "medium"
		}(), partial),
		Explanation: fmt.Sprintf("Branch checks passed but trunk run '%s' failed %.0f minutes after merge.", trunkFail.Name, deltaMinutes),
		RecommendedNextAction: "Investigate trunk failure, fix forward or roll back the change on trunk.",
		RelatedEntities:      []any{merged.ProviderID, trunkFail.Name},
	}

	return &signal, true
}
