package github

type User struct {
	ID     string   `json:"id" yaml:"id"`
	NodeID string   `json:"node_id,omitempty" yaml:"node_id,omitempty"`
	Login  string   `json:"login" yaml:"login"`
	Name   string   `json:"name,omitempty" yaml:"name,omitempty"`
	Teams  []string `json:"teams,omitempty" yaml:"teams,omitempty"`
}

type Team struct {
	ID   string `json:"id,omitempty" yaml:"id,omitempty"`
	Slug string `json:"slug" yaml:"slug"`
	Name string `json:"name,omitempty" yaml:"name,omitempty"`
}

type Repository struct {
	ID            string `json:"id" yaml:"id"`
	NodeID        string `json:"node_id,omitempty" yaml:"node_id,omitempty"`
	Name          string `json:"name" yaml:"name"`
	FullName      string `json:"full_name" yaml:"full_name"`
	DefaultBranch string `json:"default_branch" yaml:"default_branch"`
	Visibility    string `json:"visibility,omitempty" yaml:"visibility,omitempty"`
	Private       bool   `json:"private,omitempty" yaml:"private,omitempty"`
	Archived      bool   `json:"archived,omitempty" yaml:"archived,omitempty"`
}

type PullRequestRef struct {
	Ref string `json:"ref" yaml:"ref"`
	SHA string `json:"sha,omitempty" yaml:"sha,omitempty"`
}

type PullRequestNumberRef struct {
	Number int `json:"number" yaml:"number"`
}

type PullRequest struct {
	ID                 string         `json:"id" yaml:"id"`
	NodeID             string         `json:"node_id,omitempty" yaml:"node_id,omitempty"`
	Number             int            `json:"number" yaml:"number"`
	Title              string         `json:"title" yaml:"title"`
	Body               string         `json:"body,omitempty" yaml:"body,omitempty"`
	State              string         `json:"state" yaml:"state"`
	Draft              bool           `json:"draft,omitempty" yaml:"draft,omitempty"`
	MergedAt           string         `json:"merged_at,omitempty" yaml:"merged_at,omitempty"`
	ClosedAt           string         `json:"closed_at,omitempty" yaml:"closed_at,omitempty"`
	MergeCommitSHA     string         `json:"merge_commit_sha,omitempty" yaml:"merge_commit_sha,omitempty"`
	Merged             bool           `json:"merged,omitempty" yaml:"merged,omitempty"`
	User               User           `json:"user" yaml:"user"`
	CreatedAt          string         `json:"created_at" yaml:"created_at"`
	UpdatedAt          string         `json:"updated_at" yaml:"updated_at"`
	Base               PullRequestRef `json:"base" yaml:"base"`
	Head               PullRequestRef `json:"head" yaml:"head"`
	RequestedReviewers []User         `json:"requested_reviewers,omitempty" yaml:"requested_reviewers,omitempty"`
	RequestedTeams     []Team         `json:"requested_teams,omitempty" yaml:"requested_teams,omitempty"`
	MergedBy           *User          `json:"merged_by,omitempty" yaml:"merged_by,omitempty"`
}

type Review struct {
	ID          string `json:"id" yaml:"id"`
	User        User   `json:"user" yaml:"user"`
	State       string `json:"state" yaml:"state"`
	SubmittedAt string `json:"submitted_at,omitempty" yaml:"submitted_at,omitempty"`
}

type CheckRun struct {
	ID           string                 `json:"id" yaml:"id"`
	Name         string                 `json:"name" yaml:"name"`
	Status       string                 `json:"status" yaml:"status"`
	Conclusion   string                 `json:"conclusion,omitempty" yaml:"conclusion,omitempty"`
	StartedAt    string                 `json:"started_at,omitempty" yaml:"started_at,omitempty"`
	CompletedAt  string                 `json:"completed_at,omitempty" yaml:"completed_at,omitempty"`
	HTMLURL      string                 `json:"html_url,omitempty" yaml:"html_url,omitempty"`
	HeadBranch   string                 `json:"head_branch,omitempty" yaml:"head_branch,omitempty"`
	HeadSHA      string                 `json:"head_sha,omitempty" yaml:"head_sha,omitempty"`
	PullRequests []PullRequestNumberRef `json:"pull_requests,omitempty" yaml:"pull_requests,omitempty"`
}

type WorkflowRun struct {
	ID            string `json:"id" yaml:"id"`
	Name          string `json:"name" yaml:"name"`
	Status        string `json:"status" yaml:"status"`
	Conclusion    string `json:"conclusion,omitempty" yaml:"conclusion,omitempty"`
	RunStartedAt  string `json:"run_started_at,omitempty" yaml:"run_started_at,omitempty"`
	UpdatedAt     string `json:"updated_at,omitempty" yaml:"updated_at,omitempty"`
	HTMLURL       string `json:"html_url,omitempty" yaml:"html_url,omitempty"`
	HeadBranch    string `json:"head_branch,omitempty" yaml:"head_branch,omitempty"`
	HeadSHA       string `json:"head_sha,omitempty" yaml:"head_sha,omitempty"`
	Event         string `json:"event,omitempty" yaml:"event,omitempty"`
}

type Status struct {
	State     string `json:"state" yaml:"state"`
	Context   string `json:"context" yaml:"context"`
	UpdatedAt string `json:"updated_at" yaml:"updated_at"`
	TargetURL string `json:"target_url,omitempty" yaml:"target_url,omitempty"`
}

type RequiredReviewer struct {
	Type string `json:"type" yaml:"type"`
	Name string `json:"name" yaml:"name"`
	ID   string `json:"id,omitempty" yaml:"id,omitempty"`
}

type BranchProtection struct {
	RequiredApprovingReviewCount int                `json:"required_approving_review_count,omitempty" yaml:"required_approving_review_count,omitempty"`
	RequiredReviewers            []RequiredReviewer `json:"required_reviewers,omitempty" yaml:"required_reviewers,omitempty"`
}

type Issue struct {
	Number  int    `json:"number" yaml:"number"`
	Title   string `json:"title,omitempty" yaml:"title,omitempty"`
	State   string `json:"state,omitempty" yaml:"state,omitempty"`
	HTMLURL string `json:"html_url,omitempty" yaml:"html_url,omitempty"`
}

type AdapterSource struct {
	Repository            Repository
	PullRequests          []PullRequest
	ReviewsByPullNumber   map[int][]Review
	CheckRunsByPullNumber map[int][]CheckRun
	WorkflowRunsByBranch  map[string][]WorkflowRun
	StatusesByHeadSHA     map[string][]Status
	BranchProtection      *BranchProtection
	CodeownersText        string
	Issues                []Issue
	FetchedAt             string
}
