export type Provider = "github" | "gitlab";

export interface NormalizedRepository {
  provider: Provider;
  provider_id: string;
  full_name: string;
  default_branch: string;
  visibility?: "public" | "private" | "internal";
  archived?: boolean;
  fetched_at: string;
  is_partial?: boolean;
}

export interface NormalizedWorkItemRef {
  external_id: string;
  title?: string;
  provider?: string;
  url?: string;
  state?: "open" | "closed";
}

export interface NormalizedChange {
  provider: Provider;
  provider_id: string;
  repository_id: string;
  source_branch: string;
  target_branch: string;
  state: "open" | "closed" | "merged" | "locked";
  author_actor_id: string;
  created_at: string;
  updated_at: string;
  title?: string;
  is_draft?: boolean;
  work_item_refs?: NormalizedWorkItemRef[];
  merged_at?: string;
  closed_at?: string;
  fetched_at: string;
  is_partial?: boolean;
}

export interface NormalizedActor {
  provider: Provider;
  provider_id: string;
  display_name: string;
  provider_login?: string;
  team_memberships?: string[];
}

export interface NormalizedReviewState {
  change_id: string;
  state: "awaiting_review" | "under_review" | "changes_requested" | "approved" | "not_required";
  as_of: string;
  reviewer_actor_ids?: string[];
  reviewer_team_names?: string[];
  last_activity_at?: string;
  approval_count?: number;
  required_approval_count?: number;
  is_partial?: boolean;
}

export interface NormalizedValidationRun {
  change_id: string;
  scope: "branch" | "trunk";
  state: "pending" | "running" | "passed" | "failed" | "flaky" | "skipped";
  run_at: string;
  name?: string;
  url?: string;
  duration_seconds?: number;
  failure_summary?: string;
  is_partial?: boolean;
}

export interface NormalizedMergeEvent {
  change_id: string;
  merged_at: string;
  target_branch: string;
  merged_by_actor_id?: string;
  merge_commit_sha?: string;
}

export interface NormalizedEvidenceState {
  change_id: string;
  state: "not_required" | "required" | "pending" | "recorded" | "stale";
  as_of: string;
  required_types?: string[];
  owner_actor_id?: string;
  freshness_at?: string;
  is_partial?: boolean;
}

export interface NormalizedOwnershipHint {
  repository_id: string;
  owner_actor_ids?: string[];
  owner_team_names?: string[];
  path_pattern?: string;
  source?: "codeowners" | "group_membership" | "branch_protection" | "manual";
  confidence?: "declared" | "inferred";
  is_partial?: boolean;
}

export interface ProviderAdapterInput {
  repository: NormalizedRepository;
  changes: NormalizedChange[];
  actors: NormalizedActor[];
  review_states: NormalizedReviewState[];
  validation_runs: NormalizedValidationRun[];
  merge_events: NormalizedMergeEvent[];
  evidence_states?: NormalizedEvidenceState[];
  ownership_hints: NormalizedOwnershipHint[];
}
