package github

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
	// stacks/go/net-http/rest/bff/flow/github -> repo root is six levels up.
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

func TestGitHubAdapterBlockedOnReview(t *testing.T) {
	got := BuildProviderInput(blockedOnReviewSource())
	want := loadFixture(t, "blocked-on-review-github")
	assertProviderInputEqual(t, got, want)
}

func TestGitHubAdapterChangesRequested(t *testing.T) {
	got := BuildProviderInput(changesRequestedSource())
	want := loadFixture(t, "changes-requested-github")
	assertProviderInputEqual(t, got, want)
}

func TestGitHubAdapterReviewNotRequired(t *testing.T) {
	got := BuildProviderInput(reviewNotRequiredSource())
	want := loadFixture(t, "review-not-required-github")
	assertProviderInputEqual(t, got, want)
}

func TestGitHubAdapterTrunkIntegrationFailure(t *testing.T) {
	got := BuildProviderInput(trunkIntegrationFailureSource())
	want := loadFixture(t, "trunk-integration-failed-github")
	assertProviderInputEqual(t, got, want)
}

func TestGitHubAdapterPartialEvidence(t *testing.T) {
	got := BuildProviderInput(partialEvidenceSource())
	want := loadFixture(t, "partial-data-github")
	assertProviderInputEqual(t, got, want)
}
