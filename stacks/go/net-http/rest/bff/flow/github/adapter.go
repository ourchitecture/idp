package github

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"idp-go-net-http-rest/bff/flow"
)

const providerName flow.Provider = "github"

func actorID(user User) string {
	if user.NodeID != "" {
		return user.NodeID
	}
	id := user.ID
	if id == "" {
		id = user.Login
	}
	return "github-user-" + id
}

func displayName(user User) string {
	if strings.TrimSpace(user.Name) != "" {
		return user.Name
	}
	return user.Login
}

func repoProviderID(repo Repository) string {
	if repo.NodeID != "" {
		return repo.NodeID
	}
	return repo.ID
}

func prProviderID(pr PullRequest) string {
	if pr.NodeID != "" {
		return pr.NodeID
	}
	return pr.ID
}

func normalizeRepository(repo Repository, fetchedAt string) flow.NormalizedRepository {
	visibility := repo.Visibility
	if visibility == "" {
		if repo.Private {
			visibility = "private"
		} else {
			visibility = "public"
		}
	}
	return flow.NormalizedRepository{
		Provider:      providerName,
		ProviderID:    repoProviderID(repo),
		FullName:      repo.FullName,
		DefaultBranch: repo.DefaultBranch,
		Visibility:    visibility,
		Archived:      repo.Archived,
		FetchedAt:     fetchedAt,
	}
}

var workItemPattern = regexp.MustCompile(`(?i)\b(?:close[sd]?|closes|closed|closing|fix|fixe[sd]?|fixing|resolve[sd]?|resolving)\s+#(\d+)`)

func extractWorkItemRefs(pr PullRequest, repo Repository, issues []Issue) ([]flow.NormalizedWorkItemRef, bool) {
	order := []string{}
	refs := map[string]*flow.NormalizedWorkItemRef{}
	text := pr.Title + "\n" + pr.Body
	for _, m := range workItemPattern.FindAllStringSubmatch(text, -1) {
		external := m[1]
		if _, ok := refs[external]; ok {
			continue
		}
		refs[external] = &flow.NormalizedWorkItemRef{
			ExternalID: external,
			Provider:   "github",
		}
		order = append(order, external)
	}

	isPartial := false
	if len(issues) > 0 {
		for _, external := range order {
			ref := refs[external]
			var matched *Issue
			for i := range issues {
				if fmt.Sprintf("%d", issues[i].Number) == external {
					matched = &issues[i]
					break
				}
			}
			if matched != nil {
				ref.Title = matched.Title
				ref.State = matched.State
				if matched.HTMLURL != "" {
					ref.URL = matched.HTMLURL
				} else {
					ref.URL = fmt.Sprintf("https://github.com/%s/issues/%d", repo.FullName, matched.Number)
				}
			} else {
				ref.URL = fmt.Sprintf("https://github.com/%s/issues/%s", repo.FullName, external)
				isPartial = true
			}
		}
	} else if len(order) > 0 {
		for _, external := range order {
			ref := refs[external]
			if ref.URL == "" {
				ref.URL = fmt.Sprintf("https://github.com/%s/issues/%s", repo.FullName, external)
			}
		}
		isPartial = true
	}

	out := make([]flow.NormalizedWorkItemRef, 0, len(order))
	for _, external := range order {
		out = append(out, *refs[external])
	}
	return out, isPartial
}

func normalizeChange(pr PullRequest, repo Repository, fetchedAt string, issues []Issue) flow.NormalizedChange {
	refs, isPartialRefs := extractWorkItemRefs(pr, repo, issues)

	state := "open"
	if pr.State == "closed" {
		if pr.MergedAt != "" {
			state = "merged"
		} else {
			state = "closed"
		}
	}

	return flow.NormalizedChange{
		Provider:      providerName,
		ProviderID:    prProviderID(pr),
		RepositoryID:  repoProviderID(repo),
		SourceBranch:  pr.Head.Ref,
		TargetBranch:  pr.Base.Ref,
		State:         state,
		AuthorActorID: actorID(pr.User),
		CreatedAt:     pr.CreatedAt,
		UpdatedAt:     pr.UpdatedAt,
		Title:         pr.Title,
		IsDraft:       pr.Draft,
		WorkItemRefs:  refs,
		MergedAt:      pr.MergedAt,
		ClosedAt:      pr.ClosedAt,
		FetchedAt:     fetchedAt,
		IsPartial:     isPartialRefs,
	}
}

type reviewerState struct {
	state       string
	submittedAt string
	reviewer    User
}

func mapReviewState(pr PullRequest, reviews []Review, protection *BranchProtection, fetchedAt string) flow.NormalizedReviewState {
	requiredApprovalCount := 0
	requiredUserIDs := []string{}
	protectionTeamNames := []string{}
	if protection != nil {
		requiredApprovalCount = protection.RequiredApprovingReviewCount
		for _, r := range protection.RequiredReviewers {
			switch r.Type {
			case "User":
				id := r.ID
				if id == "" {
					id = r.Name
				}
				requiredUserIDs = append(requiredUserIDs, actorID(User{ID: id, Login: r.Name}))
			case "Team":
				if r.Name != "" {
					protectionTeamNames = append(protectionTeamNames, r.Name)
				}
			}
		}
	}

	requestedTeamNames := []string{}
	for _, t := range pr.RequestedTeams {
		name := t.Slug
		if name == "" {
			name = t.Name
		}
		if name != "" {
			requestedTeamNames = append(requestedTeamNames, name)
		}
	}

	teamSet := map[string]struct{}{}
	reviewerTeamNames := []string{}
	for _, n := range append(append([]string{}, requestedTeamNames...), protectionTeamNames...) {
		if _, ok := teamSet[n]; ok {
			continue
		}
		teamSet[n] = struct{}{}
		reviewerTeamNames = append(reviewerTeamNames, n)
	}

	reviewerStates := map[string]reviewerState{}
	reviewerOrder := []string{}
	for _, review := range reviews {
		key := actorID(review.User)
		existing, ok := reviewerStates[key]
		if !ok {
			reviewerOrder = append(reviewerOrder, key)
			reviewerStates[key] = reviewerState{state: review.State, submittedAt: review.SubmittedAt, reviewer: review.User}
			continue
		}
		// later submission wins (mirroring TS: when current >= existing).
		var existingTime int64
		if existing.submittedAt != "" {
			if t, err := time.Parse(time.RFC3339, existing.submittedAt); err == nil {
				existingTime = t.UnixNano()
			}
		}
		var currentTime int64
		if review.SubmittedAt != "" {
			if t, err := time.Parse(time.RFC3339, review.SubmittedAt); err == nil {
				currentTime = t.UnixNano()
			}
		} else {
			currentTime = 1<<62 - 1
		}
		if currentTime >= existingTime {
			reviewerStates[key] = reviewerState{state: review.State, submittedAt: review.SubmittedAt, reviewer: review.User}
		}
	}

	approvalCount := 0
	changesRequestedCount := 0
	underReviewCount := 0
	for _, key := range reviewerOrder {
		s := reviewerStates[key]
		switch s.state {
		case "APPROVED":
			approvalCount++
		case "CHANGES_REQUESTED":
			changesRequestedCount++
		case "COMMENTED", "DISMISSED":
			underReviewCount++
		}
	}

	requestedReviewerIDs := []string{}
	for _, u := range pr.RequestedReviewers {
		requestedReviewerIDs = append(requestedReviewerIDs, actorID(u))
	}

	idSet := map[string]struct{}{}
	reviewerIDs := []string{}
	for _, id := range requestedReviewerIDs {
		if _, ok := idSet[id]; !ok {
			idSet[id] = struct{}{}
			reviewerIDs = append(reviewerIDs, id)
		}
	}
	for _, id := range requiredUserIDs {
		if _, ok := idSet[id]; !ok {
			idSet[id] = struct{}{}
			reviewerIDs = append(reviewerIDs, id)
		}
	}
	for _, id := range reviewerOrder {
		if _, ok := idSet[id]; !ok {
			idSet[id] = struct{}{}
			reviewerIDs = append(reviewerIDs, id)
		}
	}

	submitted := []string{}
	for _, key := range reviewerOrder {
		if reviewerStates[key].submittedAt != "" {
			submitted = append(submitted, reviewerStates[key].submittedAt)
		}
	}
	sort.Strings(submitted)
	lastActivity := ""
	if len(submitted) > 0 {
		lastActivity = submitted[len(submitted)-1]
	}
	if lastActivity == "" {
		lastActivity = pr.UpdatedAt
	}

	state := "awaiting_review"
	if pr.Draft {
		state = "not_required"
	} else {
		switch {
		case changesRequestedCount > 0:
			state = "changes_requested"
		case requiredApprovalCount > 0 && approvalCount >= requiredApprovalCount:
			state = "approved"
		case approvalCount > 0 || underReviewCount > 0:
			state = "under_review"
		case len(reviewerIDs) == 0 && requiredApprovalCount == 0:
			state = "not_required"
		}
	}

	asOf := lastActivity
	if asOf == "" {
		asOf = fetchedAt
	}

	out := flow.NormalizedReviewState{
		ChangeID:              prProviderID(pr),
		State:                 state,
		AsOf:                  asOf,
		ReviewerActorIDs:      reviewerIDs,
		LastActivityAt:        lastActivity,
		ApprovalCount:         approvalCount,
		RequiredApprovalCount: requiredApprovalCount,
	}
	if len(reviewerTeamNames) > 0 {
		out.ReviewerTeamNames = reviewerTeamNames
		out.IsPartial = true
	}
	return out
}

func mapCheckState(status, conclusion string) string {
	if conclusion != "" {
		switch conclusion {
		case "success":
			return "passed"
		case "failure", "timed_out", "action_required", "startup_failure":
			return "failed"
		case "neutral", "skipped", "cancelled":
			return "skipped"
		}
	}
	switch status {
	case "queued":
		return "pending"
	case "in_progress":
		return "running"
	case "completed":
		return "running"
	}
	return "pending"
}

func normalizeCheckRuns(pr PullRequest, fetchedAt string, runs []CheckRun) []flow.NormalizedValidationRun {
	out := make([]flow.NormalizedValidationRun, 0, len(runs))
	for _, run := range runs {
		scope := "branch"
		if run.HeadSHA != "" && pr.MergeCommitSHA != "" && run.HeadSHA == pr.MergeCommitSHA {
			scope = "trunk"
		} else if len(run.PullRequests) > 0 || run.HeadBranch == pr.Head.Ref {
			scope = "branch"
		}

		duration := 0
		if run.StartedAt != "" && run.CompletedAt != "" {
			start, errStart := time.Parse(time.RFC3339, run.StartedAt)
			end, errEnd := time.Parse(time.RFC3339, run.CompletedAt)
			if errStart == nil && errEnd == nil {
				secs := int(end.Sub(start).Seconds())
				if secs < 0 {
					secs = 0
				}
				duration = secs
			}
		}

		runAt := run.CompletedAt
		if runAt == "" {
			runAt = run.StartedAt
		}
		if runAt == "" {
			runAt = fetchedAt
		}

		failureSummary := ""
		if run.Conclusion != "" && run.Conclusion != "success" {
			failureSummary = run.Conclusion
		}

		out = append(out, flow.NormalizedValidationRun{
			ChangeID:        prProviderID(pr),
			Scope:           scope,
			State:           mapCheckState(run.Status, run.Conclusion),
			RunAt:           runAt,
			Name:            run.Name,
			URL:             run.HTMLURL,
			DurationSeconds: duration,
			FailureSummary:  failureSummary,
		})
	}
	return out
}

func normalizeStatuses(pr PullRequest, fetchedAt string, statuses []Status, scope string, ambiguous bool) []flow.NormalizedValidationRun {
	out := make([]flow.NormalizedValidationRun, 0, len(statuses))
	for _, s := range statuses {
		state := "failed"
		switch s.State {
		case "success":
			state = "passed"
		case "pending":
			state = "running"
		}
		runAt := s.UpdatedAt
		if runAt == "" {
			runAt = fetchedAt
		}
		failureSummary := ""
		if state == "failed" {
			failureSummary = s.State
		}
		out = append(out, flow.NormalizedValidationRun{
			ChangeID:       prProviderID(pr),
			Scope:          scope,
			State:          state,
			RunAt:          runAt,
			Name:           s.Context,
			URL:            s.TargetURL,
			FailureSummary: failureSummary,
			IsPartial:      ambiguous,
		})
	}
	return out
}

func normalizeWorkflowRuns(pr PullRequest, fetchedAt string, runs []WorkflowRun, scope string, partial bool) []flow.NormalizedValidationRun {
	out := make([]flow.NormalizedValidationRun, 0, len(runs))
	for _, run := range runs {
		runAt := run.UpdatedAt
		if runAt == "" {
			runAt = run.RunStartedAt
		}
		if runAt == "" {
			runAt = fetchedAt
		}

		duration := 0
		if run.RunStartedAt != "" && run.UpdatedAt != "" {
			start, errStart := time.Parse(time.RFC3339, run.RunStartedAt)
			end, errEnd := time.Parse(time.RFC3339, run.UpdatedAt)
			if errStart == nil && errEnd == nil {
				secs := int(end.Sub(start).Seconds())
				if secs < 0 {
					secs = 0
				}
				duration = secs
			}
		}

		var state string
		switch {
		case run.Conclusion == "success":
			state = "passed"
		case run.Conclusion == "failure" || run.Conclusion == "startup_failure" || run.Conclusion == "timed_out":
			state = "failed"
		case run.Status == "in_progress":
			state = "running"
		case run.Status == "queued":
			state = "pending"
		case run.Conclusion == "cancelled" || run.Conclusion == "skipped":
			state = "skipped"
		default:
			state = "running"
		}

		failureSummary := ""
		if state == "failed" {
			if run.Conclusion != "" {
				failureSummary = run.Conclusion
			} else {
				failureSummary = "failed"
			}
		}

		out = append(out, flow.NormalizedValidationRun{
			ChangeID:        prProviderID(pr),
			Scope:           scope,
			State:           state,
			RunAt:           runAt,
			Name:            run.Name,
			URL:             run.HTMLURL,
			DurationSeconds: duration,
			FailureSummary:  failureSummary,
			IsPartial:       partial,
		})
	}
	return out
}

func collectActors(prs []PullRequest, reviewsByPullNumber map[int][]Review, protection *BranchProtection) []flow.NormalizedActor {
	order := []string{}
	actors := map[string]flow.NormalizedActor{}
	add := func(user User) {
		if user.Login == "" && user.ID == "" && user.NodeID == "" {
			return
		}
		id := actorID(user)
		if _, ok := actors[id]; ok {
			return
		}
		actors[id] = flow.NormalizedActor{
			Provider:        providerName,
			ProviderID:      id,
			DisplayName:     displayName(user),
			ProviderLogin:   user.Login,
			TeamMemberships: user.Teams,
		}
		order = append(order, id)
	}

	for _, pr := range prs {
		add(pr.User)
		if pr.MergedBy != nil {
			add(*pr.MergedBy)
		}
		for _, r := range pr.RequestedReviewers {
			add(r)
		}
		for _, r := range reviewsByPullNumber[pr.Number] {
			add(r.User)
		}
	}

	if protection != nil {
		for _, r := range protection.RequiredReviewers {
			if r.Type == "User" {
				id := r.ID
				if id == "" {
					id = r.Name
				}
				add(User{ID: id, Login: r.Name})
			}
		}
	}

	out := make([]flow.NormalizedActor, 0, len(order))
	for _, id := range order {
		out = append(out, actors[id])
	}
	return out
}

func normalizeOwnershipHints(repo Repository, codeownersText string, protection *BranchProtection, actors []flow.NormalizedActor) []flow.NormalizedOwnershipHint {
	repositoryID := repoProviderID(repo)
	hints := []flow.NormalizedOwnershipHint{}

	actorByLogin := map[string]string{}
	actorByID := map[string]struct{}{}
	for _, a := range actors {
		if a.ProviderLogin != "" {
			actorByLogin[strings.ToLower(a.ProviderLogin)] = a.ProviderID
		}
		actorByID[a.ProviderID] = struct{}{}
	}

	if codeownersText != "" {
		for _, entry := range ParseCodeowners(codeownersText) {
			ownerActorIDs := []string{}
			ownerTeamNames := []string{}
			isPartial := false
			for _, owner := range entry.Owners {
				if !strings.HasPrefix(owner, "@") {
					continue
				}
				token := owner[1:]
				if strings.Contains(token, "/") {
					parts := strings.Split(token, "/")
					ownerTeamNames = append(ownerTeamNames, parts[len(parts)-1])
				} else {
					normalized := strings.ToLower(token)
					if id, ok := actorByLogin[normalized]; ok {
						ownerActorIDs = append(ownerActorIDs, id)
					} else if _, ok := actorByID[token]; ok {
						ownerActorIDs = append(ownerActorIDs, token)
					} else {
						ownerActorIDs = append(ownerActorIDs, "github-user-"+token)
						isPartial = true
					}
				}
			}
			if len(ownerActorIDs) > 0 || len(ownerTeamNames) > 0 {
				hint := flow.NormalizedOwnershipHint{
					RepositoryID: repositoryID,
					PathPattern:  entry.Pattern,
					Source:       "codeowners",
					Confidence:   "declared",
					IsPartial:    isPartial,
				}
				if len(ownerActorIDs) > 0 {
					hint.OwnerActorIDs = ownerActorIDs
				}
				if len(ownerTeamNames) > 0 {
					hint.OwnerTeamNames = ownerTeamNames
				}
				hints = append(hints, hint)
			}
		}
	}

	if protection != nil && len(protection.RequiredReviewers) > 0 {
		users := []string{}
		teams := []string{}
		isPartial := false
		for _, r := range protection.RequiredReviewers {
			if r.Type == "User" {
				normalized := strings.ToLower(r.Name)
				if id, ok := actorByLogin[normalized]; ok {
					users = append(users, id)
				} else if _, ok := actorByID[r.Name]; ok {
					users = append(users, r.Name)
				} else {
					users = append(users, "github-user-"+r.Name)
					isPartial = true
				}
			} else if r.Type == "Team" {
				teams = append(teams, r.Name)
			}
		}
		if len(users) > 0 || len(teams) > 0 {
			hint := flow.NormalizedOwnershipHint{
				RepositoryID: repositoryID,
				Source:       "branch_protection",
				Confidence:   "declared",
				IsPartial:    isPartial,
			}
			if len(users) > 0 {
				hint.OwnerActorIDs = users
			}
			if len(teams) > 0 {
				hint.OwnerTeamNames = teams
			}
			hints = append(hints, hint)
		}
	}

	if len(hints) == 0 {
		hints = append(hints, flow.NormalizedOwnershipHint{
			RepositoryID:   repositoryID,
			OwnerActorIDs:  []string{},
			OwnerTeamNames: []string{},
			Confidence:     "inferred",
		})
	}

	return hints
}

func normalizeMergeEvent(pr PullRequest) *flow.NormalizedMergeEvent {
	if pr.MergedAt == "" {
		return nil
	}
	event := &flow.NormalizedMergeEvent{
		ChangeID:       prProviderID(pr),
		MergedAt:       pr.MergedAt,
		TargetBranch:   pr.Base.Ref,
		MergeCommitSHA: pr.MergeCommitSHA,
	}
	if pr.MergedBy != nil {
		event.MergedByActorID = actorID(*pr.MergedBy)
	}
	return event
}

// BuildProviderInput converts a GitHub adapter source into the normalized
// provider adapter input contract shared across stacks.
func BuildProviderInput(source AdapterSource) flow.ProviderAdapterInput {
	repo := normalizeRepository(source.Repository, source.FetchedAt)

	changes := make([]flow.NormalizedChange, 0, len(source.PullRequests))
	for _, pr := range source.PullRequests {
		changes = append(changes, normalizeChange(pr, source.Repository, source.FetchedAt, source.Issues))
	}

	mergeEvents := []flow.NormalizedMergeEvent{}
	for _, pr := range source.PullRequests {
		if event := normalizeMergeEvent(pr); event != nil {
			mergeEvents = append(mergeEvents, *event)
		}
	}

	reviewStates := make([]flow.NormalizedReviewState, 0, len(source.PullRequests))
	for _, pr := range source.PullRequests {
		reviewStates = append(reviewStates, mapReviewState(pr, source.ReviewsByPullNumber[pr.Number], source.BranchProtection, source.FetchedAt))
	}

	actors := collectActors(source.PullRequests, source.ReviewsByPullNumber, source.BranchProtection)

	validationRuns := []flow.NormalizedValidationRun{}
	for _, pr := range source.PullRequests {
		validationRuns = append(validationRuns, normalizeCheckRuns(pr, source.FetchedAt, source.CheckRunsByPullNumber[pr.Number])...)

		if pr.Head.SHA != "" {
			if statuses, ok := source.StatusesByHeadSHA[pr.Head.SHA]; ok && len(statuses) > 0 {
				validationRuns = append(validationRuns, normalizeStatuses(pr, source.FetchedAt, statuses, "branch", false)...)
			}
		}

		if pr.MergeCommitSHA != "" {
			if statuses, ok := source.StatusesByHeadSHA[pr.MergeCommitSHA]; ok && len(statuses) > 0 {
				validationRuns = append(validationRuns, normalizeStatuses(pr, source.FetchedAt, statuses, "trunk", false)...)
			}
		}

		branchRuns := source.WorkflowRunsByBranch[pr.Head.Ref]
		if len(branchRuns) == 0 {
			branchRuns = source.WorkflowRunsByBranch["refs/heads/"+pr.Head.Ref]
		}
		if len(branchRuns) > 0 {
			validationRuns = append(validationRuns, normalizeWorkflowRuns(pr, source.FetchedAt, branchRuns, "branch", false)...)
		}

		var trunkRuns []WorkflowRun
		if pr.MergeCommitSHA != "" {
			for _, run := range source.WorkflowRunsByBranch[source.Repository.DefaultBranch] {
				if run.HeadSHA == pr.MergeCommitSHA {
					trunkRuns = append(trunkRuns, run)
				}
			}
		}
		if len(trunkRuns) > 0 {
			validationRuns = append(validationRuns, normalizeWorkflowRuns(pr, source.FetchedAt, trunkRuns, "trunk", false)...)
		}

		hasMergeStatuses := false
		if pr.MergeCommitSHA != "" {
			if statuses, ok := source.StatusesByHeadSHA[pr.MergeCommitSHA]; ok && len(statuses) > 0 {
				hasMergeStatuses = true
			}
		}

		if pr.MergedAt != "" && pr.MergeCommitSHA != "" && !hasMergeStatuses && len(trunkRuns) == 0 {
			validationRuns = append(validationRuns, flow.NormalizedValidationRun{
				ChangeID:       prProviderID(pr),
				Scope:          "trunk",
				State:          "pending",
				RunAt:          source.FetchedAt,
				Name:           "post-merge-validation",
				IsPartial:      true,
				FailureSummary: "post-merge validation evidence not available",
			})
		}
	}

	ownershipHints := normalizeOwnershipHints(source.Repository, source.CodeownersText, source.BranchProtection, actors)

	return flow.ProviderAdapterInput{
		Repository:     repo,
		Changes:        changes,
		Actors:         actors,
		ReviewStates:   reviewStates,
		ValidationRuns: validationRuns,
		MergeEvents:    mergeEvents,
		OwnershipHints: ownershipHints,
	}
}
