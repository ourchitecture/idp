package inference

import "idp-go-net-http-rest/bff/flow"

func degradeConfidence(base flow.FlowSignalConfidence, isPartial bool) flow.FlowSignalConfidence {
	if !isPartial {
		return base
	}

	if base == "high" {
		return "medium"
	}

	return "low"
}
