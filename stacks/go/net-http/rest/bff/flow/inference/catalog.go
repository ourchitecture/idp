package inference

import (
	"fmt"
	"idp-go-net-http-rest/bff/flow"
	"idp-go-net-http-rest/bff/flow/fixtures"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type InsightAudience string

const (
	AudienceOwner    InsightAudience = "owner"
	AudienceActor    InsightAudience = "actor"
	AudienceReviewer InsightAudience = "reviewer"
)

type InsightFilters struct {
	Provider string
	Repo     string
	Team     string
	Service  string
	Actor    string
	Audience InsightAudience
}

type AdapterFixture struct {
	FixtureID   string `yaml:"fixture_id"`
	Scenario    string `yaml:"scenario"`
	Provider    string `yaml:"provider"`
	Description string `yaml:"description"`
	flow.ProviderAdapterInput
}

type FlowInsightRecord struct {
	InsightID          string          `json:"insightId"`
	SignalID           string          `json:"signalId"`
	Provider           flow.Provider   `json:"provider"`
	RepositoryFullName string          `json:"repositoryFullName"`
	Service            string          `json:"service,omitempty"`
	Team               string          `json:"team,omitempty"`
	Actors             []string        `json:"actors"`
	Teams              []string        `json:"teams"`
	Services           []string        `json:"services"`
	Summary            string          `json:"summary"`
	ObservedAt         string          `json:"observedAt,omitempty"`
	Signal             flow.FlowSignal `json:"signal"`
	Source             struct {
		FixtureID   string `json:"fixtureId"`
		Scenario    string `json:"scenario,omitempty"`
		Description string `json:"description,omitempty"`
	} `json:"source"`
}

type FlowInsightSummary struct {
	InsightID  string                    `json:"insightId"`
	SignalID   string                    `json:"signalId"`
	Title      string                    `json:"title"`
	Severity   flow.FlowSignalSeverity   `json:"severity,omitempty"`
	Confidence flow.FlowSignalConfidence `json:"confidence,omitempty"`
	Provider   flow.Provider             `json:"provider"`
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
	Scope struct {
		Service string               `json:"service,omitempty"`
		Team    string               `json:"team,omitempty"`
		Stage   flow.FlowSignalStage `json:"stage,omitempty"`
	} `json:"scope,omitempty"`
	Services   []string `json:"services"`
	Teams      []string `json:"teams"`
	Actors     []string `json:"actors"`
	Summary    string   `json:"summary"`
	ObservedAt string   `json:"observedAt,omitempty"`
}

type FlowInsightDetail struct {
	FlowInsightSummary
	Explanation           string `json:"explanation,omitempty"`
	RecommendedNextAction string `json:"recommendedNextAction,omitempty"`
	RelatedEntities       []any  `json:"relatedEntities,omitempty"`
	Source                struct {
		FixtureID   string `json:"fixtureId"`
		Scenario    string `json:"scenario,omitempty"`
		Description string `json:"description,omitempty"`
	} `json:"source,omitempty"`
}

var catalog []FlowInsightRecord

func loadFixture(file string) (*AdapterFixture, error) {
	raw, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}

	var fixture AdapterFixture
	if err := yaml.Unmarshal(raw, &fixture); err != nil {
		return nil, err
	}

	if fixture.FixtureID == "" {
		fixture.FixtureID = strings.TrimSuffix(filepath.Base(file), filepath.Ext(file))
	}

	return &fixture, nil
}

func collectActorNames(actors []flow.NormalizedActor) []string {
	seen := map[string]struct{}{}
	for _, actor := range actors {
		if actor.DisplayName != "" {
			seen[actor.DisplayName] = struct{}{}
		} else if actor.ProviderLogin != "" {
			seen[actor.ProviderLogin] = struct{}{}
		}
	}
	names := make([]string, 0, len(seen))
	for name := range seen {
		names = append(names, name)
	}
	return names
}

func collectTeams(input flow.ProviderAdapterInput) []string {
	seen := map[string]struct{}{}
	for _, actor := range input.Actors {
		for _, team := range actor.TeamMemberships {
			if team != "" {
				seen[team] = struct{}{}
			}
		}
	}
	for _, hint := range input.OwnershipHints {
		for _, team := range hint.OwnerTeamNames {
			if team != "" {
				seen[team] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(seen))
	for team := range seen {
		out = append(out, team)
	}
	return out
}

func collectServices(input flow.ProviderAdapterInput, serviceFromSignal string) []string {
	seen := map[string]struct{}{}
	if serviceFromSignal != "" {
		seen[serviceFromSignal] = struct{}{}
	}
	if input.Repository.FullName != "" {
		seen[input.Repository.FullName] = struct{}{}
	}
	out := make([]string, 0, len(seen))
	for service := range seen {
		out = append(out, service)
	}
	return out
}

func summarizeForAudience(signal flow.FlowSignal, audience InsightAudience) string {
	base := signal.Explanation
	if base == "" {
		base = signal.Title
	}

	action := signal.RecommendedNextAction
	if audience == "" || action == "" {
		return base
	}

	label := "Actor focus"
	switch audience {
	case AudienceOwner:
		label = "Owner focus"
	case AudienceReviewer:
		label = "Reviewer focus"
	}

	return fmt.Sprintf("%s | %s: %s", base, label, action)
}

func buildCatalog() []FlowInsightRecord {
	files, err := os.ReadDir(fixtures.FixtureDir)
	if err != nil {
		return []FlowInsightRecord{}
	}

	records := make([]FlowInsightRecord, 0)
	engine := NewEngine()
	now := time.Now().UTC()

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".yaml") {
			continue
		}

		fixture, err := loadFixture(filepath.Join(fixtures.FixtureDir, file.Name()))
		if err != nil {
			continue
		}

		inference := engine.Infer(fixture.ProviderAdapterInput, &Context{Now: now})
		teams := collectTeams(fixture.ProviderAdapterInput)
		for _, signal := range inference.Signals {
			service := signal.Scope.Service
			if service == "" {
				if fixture.Repository.FullName != "" {
					service = fixture.Repository.FullName
				} else {
					service = fixture.Repository.ProviderID
				}
			}

			record := FlowInsightRecord{
				InsightID:          fmt.Sprintf("%s:%s", fixture.FixtureID, signal.ID),
				SignalID:           signal.ID,
				Provider:           fixture.Repository.Provider,
				RepositoryFullName: fixture.Repository.FullName,
				Service:            service,
				Team:               signal.Scope.Team,
				Actors:             collectActorNames(fixture.Actors),
				Teams:              teams,
				Services:           collectServices(fixture.ProviderAdapterInput, service),
				Summary:            summarizeForAudience(signal, ""),
				ObservedAt:         signal.ObservedAt,
				Signal:             signal,
			}

			record.Source.FixtureID = fixture.FixtureID
			record.Source.Scenario = fixture.Scenario
			record.Source.Description = fixture.Description

			records = append(records, record)
		}
	}

	return records
}

func init() {
	catalog = buildCatalog()
}

func matchesFilter(value string, filter string) bool {
	if filter == "" {
		return true
	}
	if value == "" {
		return false
	}
	return strings.Contains(strings.ToLower(value), strings.ToLower(filter))
}

func ListFlowInsights(filters InsightFilters) []FlowInsightSummary {
	audience := filters.Audience

	result := make([]FlowInsightSummary, 0)
	for _, record := range catalog {
		if !matchesFilter(string(record.Provider), filters.Provider) {
			continue
		}
		if !matchesFilter(record.RepositoryFullName, filters.Repo) {
			continue
		}
		if filters.Service != "" {
			match := false
			for _, svc := range record.Services {
				if matchesFilter(svc, filters.Service) {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}
		if filters.Team != "" {
			match := false
			for _, team := range record.Teams {
				if matchesFilter(team, filters.Team) {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}
		if filters.Actor != "" {
			match := false
			for _, actor := range record.Actors {
				if matchesFilter(actor, filters.Actor) {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}

		summary := FlowInsightSummary{
			InsightID:  record.InsightID,
			SignalID:   record.SignalID,
			Title:      record.Signal.Title,
			Severity:   record.Signal.Severity,
			Confidence: record.Signal.Confidence,
			Provider:   record.Provider,
			Services:   record.Services,
			Teams:      record.Teams,
			Actors:     record.Actors,
			Summary:    summarizeForAudience(record.Signal, audience),
			ObservedAt: record.ObservedAt,
		}
		summary.Repository.FullName = record.RepositoryFullName
		summary.Scope.Service = record.Signal.Scope.Service
		summary.Scope.Team = record.Signal.Scope.Team
		summary.Scope.Stage = record.Signal.Scope.Stage

		result = append(result, summary)
	}

	return result
}

func FindFlowInsightDetail(insightID string, audience InsightAudience) (FlowInsightDetail, bool) {
	for _, record := range catalog {
		if record.InsightID != insightID {
			continue
		}

		detail := FlowInsightDetail{
			FlowInsightSummary: FlowInsightSummary{
				InsightID:  record.InsightID,
				SignalID:   record.SignalID,
				Title:      record.Signal.Title,
				Severity:   record.Signal.Severity,
				Confidence: record.Signal.Confidence,
				Provider:   record.Provider,
				Services:   record.Services,
				Teams:      record.Teams,
				Actors:     record.Actors,
				Summary:    summarizeForAudience(record.Signal, audience),
				ObservedAt: record.ObservedAt,
			},
			Explanation:           record.Signal.Explanation,
			RecommendedNextAction: record.Signal.RecommendedNextAction,
			RelatedEntities:       record.Signal.RelatedEntities,
			Source: struct {
				FixtureID   string `json:"fixtureId"`
				Scenario    string `json:"scenario,omitempty"`
				Description string `json:"description,omitempty"`
			}{
				FixtureID:   record.Source.FixtureID,
				Scenario:    record.Source.Scenario,
				Description: record.Source.Description,
			},
		}
		detail.Repository.FullName = record.RepositoryFullName
		detail.Scope.Service = record.Signal.Scope.Service
		detail.Scope.Team = record.Signal.Scope.Team
		detail.Scope.Stage = record.Signal.Scope.Stage

		return detail, true
	}

	return FlowInsightDetail{}, false
}
