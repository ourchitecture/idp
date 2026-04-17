package gitlab

type User struct {
	ID       string   `json:"id" yaml:"id"`
	Username string   `json:"username" yaml:"username"`
	Name     string   `json:"name,omitempty" yaml:"name,omitempty"`
	Groups   []string `json:"groups,omitempty" yaml:"groups,omitempty"`
}

type Group struct {
	ID       string `json:"id,omitempty" yaml:"id,omitempty"`
	FullPath string `json:"full_path,omitempty" yaml:"full_path,omitempty"`
	Name     string `json:"name,omitempty" yaml:"name,omitempty"`
}

type Project struct {
	ID                string `json:"id" yaml:"id"`
	PathWithNamespace string `json:"path_with_namespace" yaml:"path_with_namespace"`
	DefaultBranch     string `json:"default_branch" yaml:"default_branch"`
	Visibility        string `json:"visibility,omitempty" yaml:"visibility,omitempty"`
	Archived          bool   `json:"archived,omitempty" yaml:"archived,omitempty"`
}

type MergeRequest struct {
	ID             string `json:"id" yaml:"id"`
	IID            string `json:"iid" yaml:"iid"`
	Title          string `json:"title" yaml:"title"`
	Description    string `json:"description,omitempty" yaml:"description,omitempty"`
	State          string `json:"state" yaml:"state"`
	Draft          bool   `json:"draft,omitempty" yaml:"draft,omitempty"`
	WorkInProgress bool   `json:"work_in_progress,omitempty" yaml:"work_in_progress,omitempty"`
	MergedAt       string `json:"merged_at,omitempty" yaml:"merged_at,omitempty"`
	ClosedAt       string `json:"closed_at,omitempty" yaml:"closed_at,omitempty"`
	MergeCommitSHA string `json:"merge_commit_sha,omitempty" yaml:"merge_commit_sha,omitempty"`
	SourceBranch   string `json:"source_branch" yaml:"source_branch"`
	TargetBranch   string `json:"target_branch" yaml:"target_branch"`
	Author         User   `json:"author" yaml:"author"`
	Reviewers      []User `json:"reviewers,omitempty" yaml:"reviewers,omitempty"`
	CreatedAt      string `json:"created_at" yaml:"created_at"`
	UpdatedAt      string `json:"updated_at" yaml:"updated_at"`
	SHA            string `json:"sha,omitempty" yaml:"sha,omitempty"`
	MergedBy       *User  `json:"merged_by,omitempty" yaml:"merged_by,omitempty"`
}

type ApprovalEntry struct {
	User       User   `json:"user" yaml:"user"`
	ApprovedAt string `json:"approved_at,omitempty" yaml:"approved_at,omitempty"`
}

type ApprovalRule struct {
	Name              string          `json:"name,omitempty" yaml:"name,omitempty"`
	ApprovalsRequired int             `json:"approvals_required,omitempty" yaml:"approvals_required,omitempty"`
	ApprovedBy        []ApprovalEntry `json:"approved_by,omitempty" yaml:"approved_by,omitempty"`
	Users             []User          `json:"users,omitempty" yaml:"users,omitempty"`
	Groups            []Group         `json:"groups,omitempty" yaml:"groups,omitempty"`
}

type ApprovalState struct {
	ApprovalsRequired  int             `json:"approvals_required,omitempty" yaml:"approvals_required,omitempty"`
	ApprovalsLeft      *int            `json:"approvals_left,omitempty" yaml:"approvals_left,omitempty"`
	ApprovedBy         []ApprovalEntry `json:"approved_by,omitempty" yaml:"approved_by,omitempty"`
	SuggestedApprovers []User          `json:"suggested_approvers,omitempty" yaml:"suggested_approvers,omitempty"`
	Rules              []ApprovalRule  `json:"rules,omitempty" yaml:"rules,omitempty"`
	LastActivityAt     string          `json:"last_activity_at,omitempty" yaml:"last_activity_at,omitempty"`
	AsOf               string          `json:"as_of,omitempty" yaml:"as_of,omitempty"`
}

type Pipeline struct {
	ID             string `json:"id" yaml:"id"`
	Status         string `json:"status" yaml:"status"`
	Ref            string `json:"ref,omitempty" yaml:"ref,omitempty"`
	WebURL         string `json:"web_url,omitempty" yaml:"web_url,omitempty"`
	Duration       int    `json:"duration,omitempty" yaml:"duration,omitempty"`
	UpdatedAt      string `json:"updated_at,omitempty" yaml:"updated_at,omitempty"`
	FinishedAt     string `json:"finished_at,omitempty" yaml:"finished_at,omitempty"`
	StartedAt      string `json:"started_at,omitempty" yaml:"started_at,omitempty"`
	SHA            string `json:"sha,omitempty" yaml:"sha,omitempty"`
	Name           string `json:"name,omitempty" yaml:"name,omitempty"`
	FailureReason  string `json:"failure_reason,omitempty" yaml:"failure_reason,omitempty"`
	PipelineType   string `json:"pipeline_type,omitempty" yaml:"pipeline_type,omitempty"`
}

type CommitStatus struct {
	ID        string `json:"id" yaml:"id"`
	Name      string `json:"name" yaml:"name"`
	Status    string `json:"status" yaml:"status"`
	TargetURL string `json:"target_url,omitempty" yaml:"target_url,omitempty"`
	Ref       string `json:"ref,omitempty" yaml:"ref,omitempty"`
	CreatedAt string `json:"created_at,omitempty" yaml:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty" yaml:"updated_at,omitempty"`
}

type Issue struct {
	ID     string `json:"id" yaml:"id"`
	IID    string `json:"iid,omitempty" yaml:"iid,omitempty"`
	Title  string `json:"title,omitempty" yaml:"title,omitempty"`
	State  string `json:"state,omitempty" yaml:"state,omitempty"`
	WebURL string `json:"web_url,omitempty" yaml:"web_url,omitempty"`
}

type EvidenceState struct {
	State         string   `json:"state" yaml:"state"`
	AsOf          string   `json:"as_of" yaml:"as_of"`
	RequiredTypes []string `json:"required_types,omitempty" yaml:"required_types,omitempty"`
	Owner         *User    `json:"owner,omitempty" yaml:"owner,omitempty"`
	FreshnessAt   string   `json:"freshness_at,omitempty" yaml:"freshness_at,omitempty"`
	IsPartial     bool     `json:"is_partial,omitempty" yaml:"is_partial,omitempty"`
}

type AdapterSource struct {
	Project                       Project
	MergeRequests                 []MergeRequest
	ApprovalsByMergeIID           map[string]ApprovalState
	PipelinesByMergeIID           map[string][]Pipeline
	TrunkPipelinesByBranch        map[string][]Pipeline
	CommitStatusesBySHA           map[string][]CommitStatus
	EvidenceStatesByMergeIID      map[string][]EvidenceState
	UnownedPathsByMergeIID        map[string][]string
	GroupOwners                   []string
	CodeownersText                string
	Issues                        []Issue
	BaseURL                       string
	SelfManaged                   bool
	AddTrunkValidationPlaceholder bool
	AdditionalActors              []User
	FetchedAt                     string
}
