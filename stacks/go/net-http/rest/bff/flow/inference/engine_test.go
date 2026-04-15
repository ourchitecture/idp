package inference

import (
	"idp-go-net-http-rest/bff/flow"
	"idp-go-net-http-rest/bff/flow/fixtures"
	"testing"
	"time"
)

func TestBlockedOnReviewGitHub(t *testing.T) {
	input, err := fixtures.Load("blocked-on-review-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 2, 10, 0, 0, 0, time.UTC)})
	assertSignal(t, result, "blocked_on_review")
}

func TestTrunkIntegrationFailureGitHub(t *testing.T) {
	input, err := fixtures.Load("trunk-integration-failed-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 2, 10, 30, 0, 0, time.UTC)})
	assertSignal(t, result, "trunk_integration_failure")
}

func TestUnclearOwnershipAmbiguous(t *testing.T) {
	input, err := fixtures.Load("unclear-ownership-ambiguous-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 7, 12, 0, 0, 0, time.UTC)})
	assertSignal(t, result, "unclear_ownership")
}

func TestWaitingOnEvidence(t *testing.T) {
	input, err := fixtures.Load("waiting-on-evidence-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 8, 15, 0, 0, 0, time.UTC)})
	assertSignal(t, result, "waiting_on_evidence")
}

func TestAgingImplementation(t *testing.T) {
	input, err := fixtures.Load("aging-implementation-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 10, 12, 0, 0, 0, time.UTC)})
	assertSignal(t, result, "aging_implementation")
}

func TestRiskAggregation(t *testing.T) {
	input, err := fixtures.Load("risk-aggregation-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 10, 16, 0, 0, 0, time.UTC)})
	assertSignal(t, result, "risk_aggregation")
}

func TestPartialConfidenceReduced(t *testing.T) {
	input, err := fixtures.Load("partial-data-github")
	if err != nil {
		t.Fatalf("load fixture: %v", err)
	}
	engine := NewEngine()
	result := engine.Infer(input, &Context{Now: time.Date(2026, 4, 5, 10, 0, 0, 0, time.UTC)})
	if len(result.Signals) == 0 {
		t.Fatalf("expected signals for partial data")
	}
	for _, s := range result.Signals {
		if s.Confidence == "high" {
			t.Fatalf("expected reduced confidence for signal %s", s.ID)
		}
	}
}

func assertSignal(t *testing.T, res flow.FlowInsightsResponse, id string) {
	t.Helper()
	for _, s := range res.Signals {
		if s.ID == id {
			return
		}
	}
	t.Fatalf("expected signal %s", id)
}
