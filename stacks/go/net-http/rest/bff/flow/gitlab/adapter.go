package gitlab

import (
	"regexp"
	"sort"
	"strings"

	"idp-go-net-http-rest/bff/flow"
	gh "idp-go-net-http-rest/bff/flow/github"
)

const providerName flow.Provider = "gitlab"

func actorID(user User) string {
	if strings.TrimSpace(user.ID) != "" {
		return user.ID
	}
	return "gitlab-user-" + user.Username
}

func displayName(user User) string {
	if strings.TrimSpace(user.Name) != "" {
		return user.Name
	}
	return user.Username
}

func repositoryURL(baseURL, path string) string {
	if baseURL == "" {
		return ""
	}
	trimmed := baseURL
	if !strings.HasSuffix(trimmed, "/") {
		trimmed += "/"
	}
	return trimmed + path
}

func issueURL(baseURL, path string, issue Issue) string {
	if issue.WebURL != "" {
		return issue.WebURL
	}
	if baseURL == "" {
		return ""
	}
	id := issue.IID
	if id == "" {
		id = issue.ID
	}
	return repositoryURL(baseURL, path) + "/-/issues/" + id
}

func normalizeRepository(project Project, fetchedAt string) flow.NormalizedRepository {
	return flow.NormalizedRepository{
		Provider:      providerName,
		ProviderID:    project.ID,
		FullName:      project.PathWithNamespace,
		DefaultBranch: project.DefaultBranch,
		Visibility:    project.Visibility,
		Archived:      project.Archived,
		FetchedAt:     fetchedAt,
	}
}

var workItemPattern = regexp.MustCompile(`(?i)\b(?:close[sd]?|closes|closed|closing|fix|fixe[sd]?|fixing|resolve[sd]?|resolving)\s+#(\d+)`)

func extractWorkItemRefs(mr MergeRequest, project Project, issues []Issue, baseURL string) ([]flow.NormalizedWorkItemRef, bool) {
	order := []string{}
	refs := map[string]*flow.NormalizedWorkItemRef{}
	text := mr.Title + "\n" + mr.Description
	for _, m := range workItemPattern.FindAllStringSubmatch(text, -1) {
		external := m[1]
		if _, ok := refs[external]; ok {
			continue
		}
		refs[external] = &flow.NormalizedWorkItemRef{
			ExternalID: external,
			Provider:   "gitlab",
		}
		order = append(order, external)
	}

	isPartial := false
	if len(issues) > 0 {
		for _, external := range order {
			ref := refs[external]
			var matched *Issue
			for i := range issues {
				candidate := issues[i].IID
				if candidate == "" {
					candidate = issues[i].ID
				}
				if candidate == external {
					matched = &issues[i]
					break
				}
			}
			if matched != nil {
				ref.Title = matched.Title
				if matched.State == "closed" {
					ref.State = "closed"
				} else {
					ref.State = "open"
				}
				ref.URL = issueURL(baseURL, project.PathWithNamespace, *matched)
			} else {
				ref.URL = issueURL(baseURL, project.PathWithNamespace, Issue{ID: external})
				isPartial = true
			}
		}
	} else if len(order) > 0 {
		for _, external := range order {
			ref := refs[external]
			ref.URL = issueURL(baseURL, project.PathWithNamespace, Issue{ID: external})
		}
		isPartial = true
	}

	out := make([]flow.NormalizedWorkItemRef, 0, len(order))
	for _, external := range order {
		out = append(out, *refs[external])
	}
	return out, isPartial
}

func normalizeChange(mr MergeRequest, project Project, fetchedAt string, issues []Issue, baseURL string) flow.NormalizedChange {
	refs, refsPartial := extractWorkItemRefs(mr, project, issues, baseURL)

	state := "open"
	switch mr.State {
	case "merged":
		state = "merged"
	case "closed":
		state = "closed"
	case "locked":
		state = "locked"
	}

	change := flow.NormalizedChange{
		Provider:      providerName,
		ProviderID:    mr.ID,
		RepositoryID:  project.ID,
		SourceBranch:  mr.SourceBranch,
		TargetBranch:  mr.TargetBranch,
		State:         state,
		AuthorActorID: actorID(mr.Author),
		CreatedAt:     mr.CreatedAt,
		UpdatedAt:     mr.UpdatedAt,
		Title:         mr.Title,
		IsDraft:       mr.Draft || mr.WorkInProgress,
		MergedAt:      mr.MergedAt,
		ClosedAt:      mr.ClosedAt,
		FetchedAt:     fetchedAt,
		IsPartial:     refsPartial,
	}
	if len(refs) > 0 {
		change.WorkItemRefs = refs
	}
	return change
}

func reviewStateFromApprovals(approvals *ApprovalState, mr MergeRequest, fetchedAt string, selfManaged bool) flow.NormalizedReviewState {
	approvalCount := 0
	if approvals != nil {
		approvalCount = len(approvals.ApprovedBy)
	}
	requiredApprovalCount := 0
	if approvals != nil {
		requiredApprovalCount = approvals.ApprovalsRequired
		if requiredApprovalCount == 0 {
			max := 0
			for _, rule := range approvals.Rules {
				if rule.ApprovalsRequired > max {
					max = rule.ApprovalsRequired
				}
			}
			requiredApprovalCount = max
		}
	}
	var approvalsLeft *int
	if approvals != nil {
		approvalsLeft = approvals.ApprovalsLeft
	}

	state := "awaiting_review"
	switch {
	case requiredApprovalCount == 0:
		state = "not_required"
	case approvalCount >= requiredApprovalCount || (approvalsLeft != nil && *approvalsLeft == 0):
		state = "approved"
	case approvalCount > 0:
		state = "under_review"
	}

	reviewerIDs := []string{}
	seenIDs := map[string]struct{}{}
	addReviewer := func(id string) {
		if id == "" {
			return
		}
		if _, ok := seenIDs[id]; ok {
			return
		}
		seenIDs[id] = struct{}{}
		reviewerIDs = append(reviewerIDs, id)
	}

	reviewerTeamsSet := map[string]struct{}{}
	reviewerTeams := []string{}
	addTeam := func(name string) {
		if name == "" {
			return
		}
		if _, ok := reviewerTeamsSet[name]; ok {
			return
		}
		reviewerTeamsSet[name] = struct{}{}
		reviewerTeams = append(reviewerTeams, name)
	}

	for _, u := range mr.Reviewers {
		addReviewer(actorID(u))
	}
	if approvals != nil {
		for _, u := range approvals.SuggestedApprovers {
			addReviewer(actorID(u))
		}
		for _, entry := range approvals.ApprovedBy {
			addReviewer(actorID(entry.User))
		}
		for _, rule := range approvals.Rules {
			for _, u := range rule.Users {
				addReviewer(actorID(u))
			}
			for _, g := range rule.Groups {
				if g.Name != "" {
					addTeam(g.Name)
				} else if g.FullPath != "" {
					parts := strings.Split(g.FullPath, "/")
					addTeam(parts[len(parts)-1])
				}
			}
			for _, entry := range rule.ApprovedBy {
				addReviewer(actorID(entry.User))
			}
		}
	}

	approvalTimes := []string{}
	if approvals != nil {
		for _, entry := range approvals.ApprovedBy {
			if entry.ApprovedAt != "" {
				approvalTimes = append(approvalTimes, entry.ApprovedAt)
			}
		}
	}
	sort.Strings(approvalTimes)
	lastApprovalTime := ""
	if len(approvalTimes) > 0 {
		lastApprovalTime = approvalTimes[len(approvalTimes)-1]
	}

	lastActivity := ""
	switch {
	case approvals != nil && approvals.LastActivityAt != "":
		lastActivity = approvals.LastActivityAt
	case lastApprovalTime != "":
		lastActivity = lastApprovalTime
	case mr.UpdatedAt != "":
		lastActivity = mr.UpdatedAt
	default:
		lastActivity = fetchedAt
	}

	asOf := ""
	switch {
	case approvals != nil && approvals.AsOf != "":
		asOf = approvals.AsOf
	case approvals != nil && approvals.LastActivityAt != "":
		asOf = approvals.LastActivityAt
	case lastApprovalTime != "":
		asOf = lastApprovalTime
	case mr.UpdatedAt != "":
		asOf = mr.UpdatedAt
	default:
		asOf = fetchedAt
	}

	isPartial := false
	if selfManaged && requiredApprovalCount > 0 && len(reviewerIDs) == 0 {
		isPartial = true
	}

	out := flow.NormalizedReviewState{
		ChangeID:              mr.ID,
		State:                 state,
		AsOf:                  asOf,
		ReviewerActorIDs:      reviewerIDs,
		LastActivityAt:        lastActivity,
		ApprovalCount:         approvalCount,
		RequiredApprovalCount: requiredApprovalCount,
		IsPartial:             isPartial,
	}
	if len(reviewerTeams) > 0 {
		out.ReviewerTeamNames = reviewerTeams
	}
	return out
}

func mapPipelineState(status string) string {
	switch status {
	case "success":
		return "passed"
	case "failed":
		return "failed"
	case "running":
		return "running"
	case "pending", "manual":
		return "pending"
	case "canceled", "skipped":
		return "skipped"
	}
	return "pending"
}

func normalizePipeline(pipeline Pipeline, scope, changeID, fetchedAt string) flow.NormalizedValidationRun {
	runAt := pipeline.FinishedAt
	if runAt == "" {
		runAt = pipeline.UpdatedAt
	}
	if runAt == "" {
		runAt = pipeline.StartedAt
	}
	if runAt == "" {
		runAt = fetchedAt
	}

	name := pipeline.Name
	if name == "" {
		name = pipeline.Ref
	}

	failureSummary := ""
	if pipeline.Status == "failed" {
		failureSummary = pipeline.FailureReason
		if failureSummary == "" {
			failureSummary = "failure"
		}
	}

	return flow.NormalizedValidationRun{
		ChangeID:        changeID,
		Scope:           scope,
		State:           mapPipelineState(pipeline.Status),
		RunAt:           runAt,
		Name:            name,
		URL:             pipeline.WebURL,
		DurationSeconds: pipeline.Duration,
		FailureSummary:  failureSummary,
	}
}

func mapStatusToState(status string) string {
	switch status {
	case "success":
		return "passed"
	case "failed":
		return "failed"
	case "running":
		return "running"
	case "pending":
		return "pending"
	case "canceled":
		return "skipped"
	}
	return "pending"
}

func normalizeCommitStatuses(statuses []CommitStatus, changeID, fetchedAt, scope string) []flow.NormalizedValidationRun {
	out := make([]flow.NormalizedValidationRun, 0, len(statuses))
	for _, s := range statuses {
		runAt := s.UpdatedAt
		if runAt == "" {
			runAt = s.CreatedAt
		}
		if runAt == "" {
			runAt = fetchedAt
		}
		out = append(out, flow.NormalizedValidationRun{
			ChangeID: changeID,
			Scope:    scope,
			State:    mapStatusToState(s.Status),
			RunAt:    runAt,
			Name:     s.Name,
			URL:      s.TargetURL,
		})
	}
	return out
}

func normalizeMergeEvent(mr MergeRequest) *flow.NormalizedMergeEvent {
	if mr.MergedAt == "" {
		return nil
	}
	event := &flow.NormalizedMergeEvent{
		ChangeID:       mr.ID,
		MergedAt:       mr.MergedAt,
		TargetBranch:   mr.TargetBranch,
		MergeCommitSHA: mr.MergeCommitSHA,
	}
	if mr.MergedBy != nil {
		event.MergedByActorID = actorID(*mr.MergedBy)
	}
	return event
}

func collectActors(
	mrs []MergeRequest,
	approvalsByMerge map[string]ApprovalState,
	evidenceByMerge map[string][]EvidenceState,
	additionalActors []User,
) []flow.NormalizedActor {
	order := []string{}
	actors := map[string]flow.NormalizedActor{}

	add := func(u *User) {
		if u == nil {
			return
		}
		if u.Username == "" && u.ID == "" {
			return
		}
		id := actorID(*u)
		if _, ok := actors[id]; ok {
			return
		}
		actors[id] = flow.NormalizedActor{
			Provider:        providerName,
			ProviderID:      id,
			DisplayName:     displayName(*u),
			ProviderLogin:   u.Username,
			TeamMemberships: u.Groups,
		}
		order = append(order, id)
	}

	for _, mr := range mrs {
		author := mr.Author
		add(&author)
		if mr.MergedBy != nil {
			mb := *mr.MergedBy
			add(&mb)
		}
		for _, r := range mr.Reviewers {
			add(&r)
		}
		if approvalsByMerge != nil {
			if approvals, ok := approvalsByMerge[mr.IID]; ok {
				for _, entry := range approvals.ApprovedBy {
					u := entry.User
					add(&u)
				}
				for _, u := range approvals.SuggestedApprovers {
					add(&u)
				}
				for _, rule := range approvals.Rules {
					for _, u := range rule.Users {
						add(&u)
					}
					for _, entry := range rule.ApprovedBy {
						u := entry.User
						add(&u)
					}
				}
			}
		}
		if evidenceByMerge != nil {
			if states, ok := evidenceByMerge[mr.IID]; ok {
				for _, state := range states {
					if state.Owner != nil {
						owner := *state.Owner
						add(&owner)
					}
				}
			}
		}
	}

	for _, u := range additionalActors {
		add(&u)
	}

	out := make([]flow.NormalizedActor, 0, len(order))
	for _, id := range order {
		out = append(out, actors[id])
	}
	return out
}

func normalizeEvidenceStates(mr MergeRequest, evidenceByMerge map[string][]EvidenceState) []flow.NormalizedEvidenceState {
	states := evidenceByMerge[mr.IID]
	out := make([]flow.NormalizedEvidenceState, 0, len(states))
	for _, state := range states {
		entry := flow.NormalizedEvidenceState{
			ChangeID:      mr.ID,
			State:         state.State,
			AsOf:          state.AsOf,
			RequiredTypes: state.RequiredTypes,
			FreshnessAt:   state.FreshnessAt,
			IsPartial:     state.IsPartial,
		}
		if state.Owner != nil {
			entry.OwnerActorID = actorID(*state.Owner)
		}
		out = append(out, entry)
	}
	return out
}

func normalizeOwnershipHints(
	project Project,
	codeownersText string,
	groupOwners []string,
	actors []flow.NormalizedActor,
	unownedPaths map[string][]string,
	selfManaged bool,
) []flow.NormalizedOwnershipHint {
	repositoryID := project.ID
	hints := []flow.NormalizedOwnershipHint{}

	actorByLogin := map[string]string{}
	actorByID := map[string]struct{}{}
	for _, a := range actors {
		if a.ProviderLogin != "" {
			actorByLogin[strings.ToLower(a.ProviderLogin)] = a.ProviderID
		}
		actorByID[a.ProviderID] = struct{}{}
	}

	if len(groupOwners) > 0 {
		hints = append(hints, flow.NormalizedOwnershipHint{
			RepositoryID:   repositoryID,
			OwnerTeamNames: groupOwners,
			PathPattern:    "*",
			Source:         "group_membership",
			Confidence:     "declared",
		})
	}

	if codeownersText != "" {
		for _, entry := range gh.ParseCodeowners(codeownersText) {
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
						ownerActorIDs = append(ownerActorIDs, "gitlab-user-"+token)
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
					IsPartial:    isPartial || selfManaged,
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

	if len(unownedPaths) > 0 {
		unique := []string{}
		seen := map[string]struct{}{}
		mergeKeys := make([]string, 0, len(unownedPaths))
		for key := range unownedPaths {
			mergeKeys = append(mergeKeys, key)
		}
		sort.Strings(mergeKeys)
		for _, key := range mergeKeys {
			for _, p := range unownedPaths[key] {
				if _, ok := seen[p]; ok {
					continue
				}
				seen[p] = struct{}{}
				unique = append(unique, p)
			}
		}
		for _, p := range unique {
			hints = append(hints, flow.NormalizedOwnershipHint{
				RepositoryID:   repositoryID,
				OwnerActorIDs:  []string{},
				OwnerTeamNames: []string{},
				PathPattern:    p,
				Source:         "codeowners",
				Confidence:     "inferred",
				IsPartial:      selfManaged,
			})
		}
	}

	if len(hints) == 0 {
		hints = append(hints, flow.NormalizedOwnershipHint{
			RepositoryID:   repositoryID,
			OwnerActorIDs:  []string{},
			OwnerTeamNames: []string{},
			PathPattern:    "*",
			Confidence:     "inferred",
		})
	}

	return hints
}

// BuildProviderInput converts a GitLab adapter source into the normalized
// provider adapter input contract shared across stacks.
func BuildProviderInput(source GitLabAdapterSource) flow.ProviderAdapterInput {
	repo := normalizeRepository(source.Project, source.FetchedAt)

	changes := make([]flow.NormalizedChange, 0, len(source.MergeRequests))
	for _, mr := range source.MergeRequests {
		changes = append(changes, normalizeChange(mr, source.Project, source.FetchedAt, source.Issues, source.BaseURL))
	}

	mergeEvents := []flow.NormalizedMergeEvent{}
	for _, mr := range source.MergeRequests {
		if event := normalizeMergeEvent(mr); event != nil {
			mergeEvents = append(mergeEvents, *event)
		}
	}

	actors := collectActors(source.MergeRequests, source.ApprovalsByMergeIID, source.EvidenceStatesByMergeIID, source.AdditionalActors)

	reviewStates := make([]flow.NormalizedReviewState, 0, len(source.MergeRequests))
	for _, mr := range source.MergeRequests {
		var approvals *ApprovalState
		if source.ApprovalsByMergeIID != nil {
			if a, ok := source.ApprovalsByMergeIID[mr.IID]; ok {
				approvals = &a
			}
		}
		reviewStates = append(reviewStates, reviewStateFromApprovals(approvals, mr, source.FetchedAt, source.SelfManaged))
	}

	validationRuns := []flow.NormalizedValidationRun{}
	for _, mr := range source.MergeRequests {
		changeID := mr.ID
		branchPipelines := source.PipelinesByMergeIID[mr.IID]
		for _, pipeline := range branchPipelines {
			validationRuns = append(validationRuns, normalizePipeline(pipeline, "branch", changeID, source.FetchedAt))
		}

		if mr.SHA != "" {
			if statuses, ok := source.CommitStatusesBySHA[mr.SHA]; ok && len(statuses) > 0 {
				validationRuns = append(validationRuns, normalizeCommitStatuses(statuses, changeID, source.FetchedAt, "branch")...)
			}
		}

		trunkPipelines := source.TrunkPipelinesByBranch[mr.TargetBranch]
		trunkMatches := []Pipeline{}
		for _, pipeline := range trunkPipelines {
			switch {
			case mr.MergeCommitSHA != "" && pipeline.SHA != "":
				if pipeline.SHA == mr.MergeCommitSHA {
					trunkMatches = append(trunkMatches, pipeline)
				}
			case mr.State == "merged":
				if pipeline.PipelineType == "trunk" || pipeline.Ref == mr.TargetBranch {
					trunkMatches = append(trunkMatches, pipeline)
				}
			}
		}
		for _, pipeline := range trunkMatches {
			validationRuns = append(validationRuns, normalizePipeline(pipeline, "trunk", changeID, source.FetchedAt))
		}

		if source.AddTrunkValidationPlaceholder && mr.MergedAt != "" && len(trunkMatches) == 0 {
			validationRuns = append(validationRuns, flow.NormalizedValidationRun{
				ChangeID:       changeID,
				Scope:          "trunk",
				State:          "pending",
				RunAt:          source.FetchedAt,
				Name:           "post-merge-validation",
				IsPartial:      true,
				FailureSummary: "post-merge validation evidence not available",
			})
		}
	}

	evidenceStates := []flow.NormalizedEvidenceState{}
	for _, mr := range source.MergeRequests {
		evidenceStates = append(evidenceStates, normalizeEvidenceStates(mr, source.EvidenceStatesByMergeIID)...)
	}

	ownershipHints := normalizeOwnershipHints(source.Project, source.CodeownersText, source.GroupOwners, actors, source.UnownedPathsByMergeIID, source.SelfManaged)

	out := flow.ProviderAdapterInput{
		Repository:     repo,
		Changes:        changes,
		Actors:         actors,
		ReviewStates:   reviewStates,
		ValidationRuns: validationRuns,
		MergeEvents:    mergeEvents,
		OwnershipHints: ownershipHints,
	}
	if len(evidenceStates) > 0 {
		out.EvidenceStates = evidenceStates
	}
	return out
}
