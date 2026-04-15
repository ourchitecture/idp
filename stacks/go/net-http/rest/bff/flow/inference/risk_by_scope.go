package inference

import "idp-go-net-http-rest/bff/flow"

func InferRiskByScope(signals []flow.FlowSignal) (*flow.FlowSignal, bool) {
	contributing := make([]flow.FlowSignal, 0)
	for _, s := range signals {
		if s.ID != "risk_aggregation" {
			contributing = append(contributing, s)
		}
	}

	if len(contributing) < 3 {
		return nil, false
	}

	partial := false
	for _, c := range contributing {
		if c.Confidence == "medium" || c.Confidence == "low" {
			partial = true
			break
		}
	}

	related := make([]any, 0, len(contributing))
	for _, c := range contributing {
		related = append(related, c.ID)
	}

	signal := flow.FlowSignal{
		ID:         "risk_aggregation",
		Title:      "Aggregated risk by scope",
		Severity:   "high",
		Confidence: degradeConfidence("high", partial),
		Explanation: "Multiple signals within the recent window indicate elevated risk.",
		RecommendedNextAction: "Escalate to scope owner and address clustered signals before new changes.",
		RelatedEntities:      related,
	}

	return &signal, true
}
