package gitlab

import (
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"sort"
	"testing"

	"gopkg.in/yaml.v3"

	"idp-go-net-http-rest/bff/flow"
)

func loadFixture(t *testing.T, name string) flow.ProviderAdapterInput {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("unable to resolve caller")
	}
	base := filepath.Dir(file)
	// stacks/go/net-http/rest/bff/flow/gitlab -> repo root is seven levels up.
	path := filepath.Join(base, "..", "..", "..", "..", "..", "..", "..", "schema", "fixtures", "provider-adapter-input", name+".yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	var input flow.ProviderAdapterInput
	if err := yaml.Unmarshal(data, &input); err != nil {
		t.Fatalf("unmarshal fixture %s: %v", name, err)
	}
	if input.EvidenceStates == nil {
		input.EvidenceStates = []flow.NormalizedEvidenceState{}
	}
	if input.MergeEvents == nil {
		input.MergeEvents = []flow.NormalizedMergeEvent{}
	}
	return input
}

func sortInput(input flow.ProviderAdapterInput) flow.ProviderAdapterInput {
	out := input
	out.Changes = append([]flow.NormalizedChange(nil), input.Changes...)
	sort.SliceStable(out.Changes, func(i, j int) bool { return out.Changes[i].ProviderID < out.Changes[j].ProviderID })

	out.Actors = append([]flow.NormalizedActor(nil), input.Actors...)
	sort.SliceStable(out.Actors, func(i, j int) bool { return out.Actors[i].ProviderID < out.Actors[j].ProviderID })

	out.ReviewStates = append([]flow.NormalizedReviewState(nil), input.ReviewStates...)
	sort.SliceStable(out.ReviewStates, func(i, j int) bool { return out.ReviewStates[i].ChangeID < out.ReviewStates[j].ChangeID })

	out.ValidationRuns = append([]flow.NormalizedValidationRun(nil), input.ValidationRuns...)
	sort.SliceStable(out.ValidationRuns, func(i, j int) bool {
		a := out.ValidationRuns[i]
		b := out.ValidationRuns[j]
		if a.ChangeID != b.ChangeID {
			return a.ChangeID < b.ChangeID
		}
		if a.Scope != b.Scope {
			return a.Scope < b.Scope
		}
		return a.RunAt < b.RunAt
	})

	out.MergeEvents = append([]flow.NormalizedMergeEvent(nil), input.MergeEvents...)
	sort.SliceStable(out.MergeEvents, func(i, j int) bool { return out.MergeEvents[i].ChangeID < out.MergeEvents[j].ChangeID })

	out.OwnershipHints = append([]flow.NormalizedOwnershipHint(nil), input.OwnershipHints...)
	sort.SliceStable(out.OwnershipHints, func(i, j int) bool {
		a := out.OwnershipHints[i]
		b := out.OwnershipHints[j]
		if a.PathPattern != b.PathPattern {
			return a.PathPattern < b.PathPattern
		}
		return a.Source < b.Source
	})

	out.EvidenceStates = append([]flow.NormalizedEvidenceState(nil), input.EvidenceStates...)
	sort.SliceStable(out.EvidenceStates, func(i, j int) bool {
		a := out.EvidenceStates[i]
		b := out.EvidenceStates[j]
		if a.ChangeID != b.ChangeID {
			return a.ChangeID < b.ChangeID
		}
		return a.AsOf < b.AsOf
	})

	for i := range out.Changes {
		if out.Changes[i].WorkItemRefs == nil {
			out.Changes[i].WorkItemRefs = []flow.NormalizedWorkItemRef{}
		}
	}

	for i := range out.OwnershipHints {
		if out.OwnershipHints[i].OwnerActorIDs == nil {
			out.OwnershipHints[i].OwnerActorIDs = []string{}
		}
		if out.OwnershipHints[i].OwnerTeamNames == nil {
			out.OwnershipHints[i].OwnerTeamNames = []string{}
		}
	}

	if out.MergeEvents == nil {
		out.MergeEvents = []flow.NormalizedMergeEvent{}
	}
	if out.EvidenceStates == nil {
		out.EvidenceStates = []flow.NormalizedEvidenceState{}
	}
	return out
}

func assertProviderInputEqual(t *testing.T, got, want flow.ProviderAdapterInput) {
	t.Helper()
	gotS := sortInput(got)
	wantS := sortInput(want)
	if !reflect.DeepEqual(gotS, wantS) {
		t.Fatalf("provider input mismatch\n got: %#v\nwant: %#v", gotS, wantS)
	}
}

func TestGitLabAdapterBlockedOnReview(t *testing.T) {
	got := BuildProviderInput(blockedOnReviewSource())
	want := loadFixture(t, "blocked-on-review-gitlab")
	assertProviderInputEqual(t, got, want)
}

func TestGitLabAdapterBlockedOnReviewSelfManaged(t *testing.T) {
	got := BuildProviderInput(blockedOnReviewSelfManagedSource())
	want := loadFixture(t, "blocked-on-review-gitlab-self-managed")
	assertProviderInputEqual(t, got, want)
}

func TestGitLabAdapterTrunkIntegrationFailure(t *testing.T) {
	got := BuildProviderInput(trunkIntegrationFailureSource())
	want := loadFixture(t, "trunk-integration-failed-gitlab")
	assertProviderInputEqual(t, got, want)
}

func TestGitLabAdapterUnclearOwnership(t *testing.T) {
	got := BuildProviderInput(unclearOwnershipSource())
	want := loadFixture(t, "unclear-ownership-gitlab")
	assertProviderInputEqual(t, got, want)
}

func TestGitLabAdapterWaitingOnEvidence(t *testing.T) {
	got := BuildProviderInput(waitingOnEvidenceSource())
	want := loadFixture(t, "waiting-on-evidence-gitlab")
	assertProviderInputEqual(t, got, want)
}

func TestGitLabAdapterAgingImplementation(t *testing.T) {
	got := BuildProviderInput(agingImplementationSource())
	want := loadFixture(t, "aging-implementation-gitlab")
	assertProviderInputEqual(t, got, want)
}

func TestGitLabAdapterRiskAggregation(t *testing.T) {
	got := BuildProviderInput(riskAggregationSource())
	want := loadFixture(t, "risk-aggregation-gitlab")
	assertProviderInputEqual(t, got, want)
}
