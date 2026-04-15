package inference

import (
	"fmt"
	"idp-go-net-http-rest/bff/flow"
	"time"
)

func findTrunkPending(runs []flow.NormalizedValidationRun, changeID string) (flow.NormalizedValidationRun, bool) {
	for _, run := range runs {
		if run.ChangeID == changeID && run.Scope == "trunk" && (run.State == "pending" || run.State == "running") {
			return run, true
		}
	}
	return flow.NormalizedValidationRun{}, false
}

func InferAgingImplementation(input flow.ProviderAdapterInput, now time.Time) (*flow.FlowSignal, bool) {
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

	trunkPending, ok := findTrunkPending(input.ValidationRuns, merged.ProviderID)
	if !ok {
		return nil, false
	}

	mergedAt, err := time.Parse(time.RFC3339, merged.MergedAt)
	if err != nil {
		return nil, false
	}

	elapsed := now.Sub(mergedAt).Hours()
	if elapsed < AgingWindowHours {
		return nil, false
	}

	partial := merged.IsPartial || trunkPending.IsPartial || input.Repository.IsPartial

	signal := flow.FlowSignal{
		ID:         "aging_implementation",
		Title:      "Aging between implementation and validation",
		Severity:   "medium",
		Confidence: degradeConfidence("high", partial),
		Explanation: fmt.Sprintf("Implementation merged %.0fh ago; trunk validation still %s.", elapsed, trunkPending.State),
		RecommendedNextAction: "Start or prioritize trunk validation for the merged change.",
		RelatedEntities:      []any{merged.ProviderID},
	}

	return &signal, true
}
