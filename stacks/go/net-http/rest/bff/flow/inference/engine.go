package inference

import (
	"idp-go-net-http-rest/bff/flow"
	"time"
)

type Engine struct{}

type Context struct {
	Now time.Time
}

func NewEngine() *Engine {
	return &Engine{}
}

func (e *Engine) Infer(input flow.ProviderAdapterInput, ctx *Context) flow.FlowInsightsResponse {
	now := time.Now().UTC()
	if ctx != nil && !ctx.Now.IsZero() {
		now = ctx.Now
	}

	signals := make([]flow.FlowSignal, 0)

	if blocked, ok := InferBlockedOnReview(input, now); ok {
		signals = append(signals, *blocked)
	}

	if trunk, ok := InferTrunkIntegrationFailure(input, now); ok {
		signals = append(signals, *trunk)
	}

	if ownership, ok := InferUnclearOwnership(input); ok {
		signals = append(signals, *ownership)
	}

	if evidence, ok := InferWaitingOnEvidence(input); ok {
		signals = append(signals, *evidence)
	}

	if aging, ok := InferAgingImplementation(input, now); ok {
		signals = append(signals, *aging)
	}

	if risk, ok := InferRiskByScope(input, signals, now); ok {
		signals = append(signals, *risk)
	}

	return flow.FlowInsightsResponse{
		Signals: signals,
	}
}
