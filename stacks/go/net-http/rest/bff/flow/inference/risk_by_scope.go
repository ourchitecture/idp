package inference

import (
	"fmt"
	"idp-go-net-http-rest/bff/flow"
	"time"
)

func InferRiskByScope(input flow.ProviderAdapterInput, signals []flow.FlowSignal, now time.Time) (*flow.FlowSignal, bool) {
	candidates := make([]struct {
		signal     flow.FlowSignal
		service    string
		team       string
		stage      flow.FlowSignalStage
		observedAt time.Time
	}, 0)
	latestObserved := time.Time{}

	for _, s := range signals {
		if s.ID == "risk_aggregation" {
			continue
		}
		observed := now
		if s.ObservedAt != "" {
			if parsed, err := time.Parse(time.RFC3339, s.ObservedAt); err == nil {
				observed = parsed
			}
		}
		if observed.After(latestObserved) {
			latestObserved = observed
		}
		service := ""
		team := ""
		stage := flow.FlowSignalStage("")
		if s.Scope != nil {
			service = s.Scope.Service
			team = s.Scope.Team
			stage = s.Scope.Stage
		}
		if service == "" {
			service = serviceFrom(input.Repository)
		}
		if team == "" {
			team = resolvePrimaryTeam(input.OwnershipHints)
		}
		candidates = append(candidates, struct {
			signal     flow.FlowSignal
			service    string
			team       string
			stage      flow.FlowSignalStage
			observedAt time.Time
		}{
			signal:     s,
			service:    service,
			team:       team,
			stage:      stage,
			observedAt: observed,
		})
	}

	if latestObserved.IsZero() {
		latestObserved = now
	}

	windowStart := latestObserved.Add(-1 * RiskWindowHours * time.Hour)
	contributing := make([]struct {
		signal     flow.FlowSignal
		service    string
		team       string
		stage      flow.FlowSignalStage
		observedAt time.Time
	}, 0)

	for _, candidate := range candidates {
		if candidate.observedAt.Before(windowStart) {
			continue
		}
		contributing = append(contributing, candidate)
	}

	if len(contributing) < 3 {
		return nil, false
	}

	service := contributing[0].service
	teams := make(map[string]struct{})
	stageCounts := make(map[flow.FlowSignalStage]int)
	partial := false
	related := make([]any, 0)

	for _, entry := range contributing {
		if entry.signal.Confidence == "medium" || entry.signal.Confidence == "low" {
			partial = true
		}
		if entry.team != "" {
			teams[entry.team] = struct{}{}
		}
		if entry.stage != "" {
			stageCounts[entry.stage]++
		}
		related = append(related, entry.signal.RelatedEntities...)
	}

	stageSummary := ""
	first := true
	for stage, count := range stageCounts {
		if !first {
			stageSummary += ", "
		}
		stageSummary += fmt.Sprintf("%s:%d", stage, count)
		first = false
	}

	teamList := make([]string, 0, len(teams))
	for t := range teams {
		teamList = append(teamList, t)
	}

	explanation := fmt.Sprintf("%d signals within ~%dh for %s", len(contributing), RiskWindowHours, service)
	if stageSummary != "" {
		explanation += fmt.Sprintf(" | stages %s", stageSummary)
	}
	if len(teamList) > 0 {
		explanation += fmt.Sprintf(" | owners %s", teamList)
	}

	signal := flow.FlowSignal{
		ID:                    "risk_aggregation",
		Title:                 "Aggregated risk by scope",
		Severity:              "high",
		Confidence:            degradeConfidence("high", partial),
		Explanation:           explanation,
		RecommendedNextAction: "Escalate to the accountable owner for the scope and address clustered signals before new changes.",
		RelatedEntities:       append([]any{service}, related...),
		Scope: &flow.FlowSignalScope{
			Service: service,
			Team: func() string {
				if len(teamList) > 0 {
					return teamList[0]
				}
				return ""
			}(),
			Stage: flow.StageAggregate,
		},
		ObservedAt: now.Format(time.RFC3339),
	}

	return &signal, true
}
