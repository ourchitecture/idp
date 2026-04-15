package flow

type Provider string

type NormalizedRepository struct {
	Provider    Provider `json:"provider" yaml:"provider"`
	ProviderID  string   `json:"provider_id" yaml:"provider_id"`
	FullName    string   `json:"full_name" yaml:"full_name"`
	DefaultBranch string `json:"default_branch" yaml:"default_branch"`
	Visibility  string   `json:"visibility,omitempty" yaml:"visibility,omitempty"`
	Archived    bool     `json:"archived,omitempty" yaml:"archived,omitempty"`
	FetchedAt   string   `json:"fetched_at" yaml:"fetched_at"`
	IsPartial   bool     `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type NormalizedWorkItemRef struct {
	ExternalID string `json:"external_id" yaml:"external_id"`
	Title      string `json:"title,omitempty" yaml:"title,omitempty"`
	Provider   string `json:"provider,omitempty" yaml:"provider,omitempty"`
	URL        string `json:"url,omitempty" yaml:"url,omitempty"`
	State      string `json:"state,omitempty" yaml:"state,omitempty"`
}

type NormalizedChange struct {
	Provider       Provider             `json:"provider" yaml:"provider"`
	ProviderID     string               `json:"provider_id" yaml:"provider_id"`
	RepositoryID   string               `json:"repository_id" yaml:"repository_id"`
	SourceBranch   string               `json:"source_branch" yaml:"source_branch"`
	TargetBranch   string               `json:"target_branch" yaml:"target_branch"`
	State          string               `json:"state" yaml:"state"`
	AuthorActorID  string               `json:"author_actor_id" yaml:"author_actor_id"`
	CreatedAt      string               `json:"created_at" yaml:"created_at"`
	UpdatedAt      string               `json:"updated_at" yaml:"updated_at"`
	Title          string               `json:"title,omitempty" yaml:"title,omitempty"`
	IsDraft        bool                 `json:"is_draft,omitempty" yaml:"is_draft,omitempty"`
	WorkItemRefs   []NormalizedWorkItemRef `json:"work_item_refs,omitempty" yaml:"work_item_refs,omitempty"`
	MergedAt       string               `json:"merged_at,omitempty" yaml:"merged_at,omitempty"`
	ClosedAt       string               `json:"closed_at,omitempty" yaml:"closed_at,omitempty"`
	FetchedAt      string               `json:"fetched_at" yaml:"fetched_at"`
	IsPartial      bool                 `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type NormalizedActor struct {
	Provider        Provider `json:"provider" yaml:"provider"`
	ProviderID      string   `json:"provider_id" yaml:"provider_id"`
	DisplayName     string   `json:"display_name" yaml:"display_name"`
	ProviderLogin   string   `json:"provider_login,omitempty" yaml:"provider_login,omitempty"`
	TeamMemberships []string `json:"team_memberships,omitempty" yaml:"team_memberships,omitempty"`
}

type NormalizedReviewState struct {
	ChangeID          string   `json:"change_id" yaml:"change_id"`
	State             string   `json:"state" yaml:"state"`
	AsOf              string   `json:"as_of" yaml:"as_of"`
	ReviewerActorIDs  []string `json:"reviewer_actor_ids,omitempty" yaml:"reviewer_actor_ids,omitempty"`
	ReviewerTeamNames []string `json:"reviewer_team_names,omitempty" yaml:"reviewer_team_names,omitempty"`
	LastActivityAt    string   `json:"last_activity_at,omitempty" yaml:"last_activity_at,omitempty"`
	ApprovalCount     int      `json:"approval_count,omitempty" yaml:"approval_count,omitempty"`
	RequiredApprovalCount int  `json:"required_approval_count,omitempty" yaml:"required_approval_count,omitempty"`
	IsPartial         bool     `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type NormalizedValidationRun struct {
	ChangeID        string `json:"change_id" yaml:"change_id"`
	Scope           string `json:"scope" yaml:"scope"`
	State           string `json:"state" yaml:"state"`
	RunAt           string `json:"run_at" yaml:"run_at"`
	Name            string `json:"name,omitempty" yaml:"name,omitempty"`
	URL             string `json:"url,omitempty" yaml:"url,omitempty"`
	DurationSeconds int    `json:"duration_seconds,omitempty" yaml:"duration_seconds,omitempty"`
	FailureSummary  string `json:"failure_summary,omitempty" yaml:"failure_summary,omitempty"`
	IsPartial       bool   `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type NormalizedMergeEvent struct {
	ChangeID        string `json:"change_id" yaml:"change_id"`
	MergedAt        string `json:"merged_at" yaml:"merged_at"`
	TargetBranch    string `json:"target_branch" yaml:"target_branch"`
	MergedByActorID string `json:"merged_by_actor_id,omitempty" yaml:"merged_by_actor_id,omitempty"`
	MergeCommitSHA  string `json:"merge_commit_sha,omitempty" yaml:"merge_commit_sha,omitempty"`
}

type NormalizedEvidenceState struct {
	ChangeID     string   `json:"change_id" yaml:"change_id"`
	State        string   `json:"state" yaml:"state"`
	AsOf         string   `json:"as_of" yaml:"as_of"`
	RequiredTypes []string `json:"required_types,omitempty" yaml:"required_types,omitempty"`
	OwnerActorID string   `json:"owner_actor_id,omitempty" yaml:"owner_actor_id,omitempty"`
	FreshnessAt  string   `json:"freshness_at,omitempty" yaml:"freshness_at,omitempty"`
	IsPartial    bool     `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type NormalizedOwnershipHint struct {
	RepositoryID   string   `json:"repository_id" yaml:"repository_id"`
	OwnerActorIDs  []string `json:"owner_actor_ids,omitempty" yaml:"owner_actor_ids,omitempty"`
	OwnerTeamNames []string `json:"owner_team_names,omitempty" yaml:"owner_team_names,omitempty"`
	PathPattern    string   `json:"path_pattern,omitempty" yaml:"path_pattern,omitempty"`
	Source         string   `json:"source,omitempty" yaml:"source,omitempty"`
	Confidence     string   `json:"confidence,omitempty" yaml:"confidence,omitempty"`
	IsPartial      bool     `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type ProviderAdapterInput struct {
	Repository      NormalizedRepository     `json:"repository" yaml:"repository"`
	Changes         []NormalizedChange       `json:"changes" yaml:"changes"`
	Actors          []NormalizedActor        `json:"actors" yaml:"actors"`
	ReviewStates    []NormalizedReviewState  `json:"review_states" yaml:"review_states"`
	ValidationRuns  []NormalizedValidationRun `json:"validation_runs" yaml:"validation_runs"`
	MergeEvents     []NormalizedMergeEvent   `json:"merge_events" yaml:"merge_events"`
	EvidenceStates  []NormalizedEvidenceState `json:"evidence_states,omitempty" yaml:"evidence_states,omitempty"`
	OwnershipHints  []NormalizedOwnershipHint `json:"ownership_hints" yaml:"ownership_hints"`
}

type FlowSignalSeverity string
type FlowSignalConfidence string

type FlowSignal struct {
	ID                   string              `json:"id"`
	Title                string              `json:"title"`
	Severity             FlowSignalSeverity  `json:"severity,omitempty"`
	Confidence           FlowSignalConfidence `json:"confidence,omitempty"`
	Explanation          string              `json:"explanation,omitempty"`
	RecommendedNextAction string             `json:"recommendedNextAction,omitempty"`
	RelatedEntities      []any               `json:"relatedEntities,omitempty"`
}

type FlowInsightsResponse struct {
	Signals []FlowSignal `json:"signals"`
}
