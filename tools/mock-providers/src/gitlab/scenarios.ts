// GitLab mock scenario data.
// Each scenario maps to a canonical fixture in schema/fixtures/provider-adapter-input/
// and provides provider-shaped HTTP responses for all needed endpoints.

export type GitLabUser = {
  id: number | string;
  username: string;
  name?: string | null;
  groups?: string[];
};

export type GitLabGroup = {
  id?: number | string;
  full_path?: string;
  name?: string;
};

export type GitLabProject = {
  id: number | string;
  path_with_namespace: string;
  default_branch: string;
  visibility?: "public" | "private" | "internal";
  archived?: boolean;
};

export type GitLabMergeRequest = {
  id: number | string;
  iid: number | string;
  title: string;
  description?: string | null;
  state: "opened" | "closed" | "merged" | "locked";
  draft?: boolean;
  work_in_progress?: boolean;
  merged_at?: string | null;
  closed_at?: string | null;
  merge_commit_sha?: string | null;
  source_branch: string;
  target_branch: string;
  author: GitLabUser;
  reviewers?: GitLabUser[];
  created_at: string;
  updated_at: string;
  sha?: string;
  merged_by?: GitLabUser | null;
};

export type GitLabApprovalRule = {
  name?: string;
  approvals_required?: number;
  approved_by?: Array<{ user: GitLabUser; approved_at?: string }>;
  users?: GitLabUser[];
  groups?: GitLabGroup[];
};

export type GitLabApprovalState = {
  approvals_required?: number;
  approvals_left?: number;
  approved_by?: Array<{ user: GitLabUser; approved_at?: string }>;
  suggested_approvers?: GitLabUser[];
  rules?: GitLabApprovalRule[];
  last_activity_at?: string;
  as_of?: string;
};

export type GitLabPipeline = {
  id: number | string;
  status: "running" | "pending" | "success" | "failed" | "canceled" | "skipped" | "manual";
  ref?: string;
  web_url?: string;
  duration?: number;
  updated_at?: string;
  finished_at?: string;
  started_at?: string;
  sha?: string;
  name?: string;
  failure_reason?: string | null;
  pipeline_type?: string;
};

export type GitLabCommitStatus = {
  id: number | string;
  name: string;
  status: "success" | "failed" | "pending" | "running" | "canceled";
  target_url?: string | null;
  ref?: string;
  created_at?: string;
  updated_at?: string;
};

export type GitLabIssue = {
  id: number | string;
  iid?: number | string;
  title?: string;
  state?: "opened" | "closed";
  web_url?: string;
};

export type GitLabEvidenceState = {
  state: "not_required" | "required" | "pending" | "recorded" | "stale";
  as_of: string;
  required_types?: string[];
  owner?: GitLabUser;
  freshness_at?: string;
  is_partial?: boolean;
};

export type GitLabScenario = {
  id: string;
  fixture_id: string;
  description: string;
  project: GitLabProject;
  merge_requests: GitLabMergeRequest[];
  // Approval states keyed by MR iid
  approvals: Record<string, GitLabApprovalState>;
  // Branch pipelines keyed by MR iid
  mr_pipelines: Record<string, GitLabPipeline[]>;
  // Trunk pipelines keyed by branch name
  trunk_pipelines: Record<string, GitLabPipeline[]>;
  // Commit statuses keyed by SHA
  commit_statuses: Record<string, GitLabCommitStatus[]>;
  // Evidence states keyed by MR iid
  evidence_states: Record<string, GitLabEvidenceState[]>;
  // Unowned paths keyed by MR iid
  unowned_paths: Record<string, string[]>;
  codeowners_text?: string;
  group_owners?: string[];
  issues: GitLabIssue[];
  base_url?: string;
  self_managed?: boolean;
};

export const scenarios: Record<string, GitLabScenario> = {
  "blocked-on-review": {
    id: "blocked-on-review",
    fixture_id: "blocked-on-review-gitlab",
    description:
      "A merge request waiting for two required approvals, none granted yet.",
    project: {
      id: "repo-payments-gl-001",
      path_with_namespace: "example-org/payments-service",
      default_branch: "main",
      visibility: "private",
    },
    merge_requests: [
      {
        id: "mr-789",
        iid: 789,
        title: "Add payment webhook",
        description: "Implements webhook handler. Closes #42",
        state: "opened",
        draft: false,
        merged_at: null,
        closed_at: null,
        merge_commit_sha: null,
        source_branch: "feature/add-payment-webhook",
        target_branch: "main",
        author: { id: "actor-alice-gl", username: "alice", name: "Alice", groups: ["payments-team"] },
        reviewers: [
          { id: "actor-bob-gl", username: "bob", name: "Bob", groups: ["payments-team"] },
          { id: "actor-carol-gl", username: "carol", name: "Carol", groups: ["payments-team"] },
        ],
        created_at: "2026-03-30T08:00:00Z",
        updated_at: "2026-04-01T09:00:00Z",
        sha: "sha-mr-789",
      },
    ],
    approvals: {
      "789": {
        approvals_required: 2,
        approvals_left: 2,
        approved_by: [],
        rules: [
          {
            name: "payments",
            approvals_required: 2,
            users: [
              { id: "actor-bob-gl", username: "bob", name: "Bob" },
              { id: "actor-carol-gl", username: "carol", name: "Carol" },
            ],
          },
        ],
      },
    },
    mr_pipelines: {
      "789": [
        {
          id: "pipeline-1001",
          status: "success",
          ref: "feature/add-payment-webhook",
          name: "ci / test",
          web_url: "https://gitlab.com/example-org/payments-service/-/pipelines/1001",
          duration: 150,
          finished_at: "2026-03-30T09:00:00Z",
        },
      ],
    },
    trunk_pipelines: {},
    commit_statuses: {},
    evidence_states: {},
    unowned_paths: {},
    codeowners_text: "* @example-org/payments-team",
    issues: [
      {
        id: "42",
        iid: "42",
        title: "Add payment webhook handler",
        state: "opened",
        web_url: "https://gitlab.com/example-org/payments-service/-/issues/42",
      },
    ],
    base_url: "https://gitlab.com",
  },

  "blocked-on-review-self-managed": {
    id: "blocked-on-review-self-managed",
    fixture_id: "blocked-on-review-gitlab-self-managed",
    description:
      "A self-managed GitLab MR awaiting review with legacy CI status.",
    project: {
      id: "repo-platform-sm-001",
      path_with_namespace: "platform/api-service",
      default_branch: "main",
      visibility: "private",
    },
    merge_requests: [
      {
        id: "mr-456",
        iid: 456,
        title: "Update API rate limiting",
        description: "Implements stricter rate limits. Closes #88",
        state: "opened",
        draft: false,
        merged_at: null,
        closed_at: null,
        merge_commit_sha: null,
        source_branch: "feature/rate-limiting",
        target_branch: "main",
        author: { id: "actor-sam-gl", username: "sam", name: "Sam" },
        reviewers: [
          { id: "actor-pat-gl", username: "pat", name: "Pat" },
        ],
        created_at: "2026-04-01T08:00:00Z",
        updated_at: "2026-04-02T10:00:00Z",
        sha: "sha-mr-456",
      },
    ],
    approvals: {
      "456": {
        approvals_required: 1,
        approvals_left: 1,
        approved_by: [],
        rules: [
          {
            name: "platform",
            approvals_required: 1,
            users: [{ id: "actor-pat-gl", username: "pat", name: "Pat" }],
          },
        ],
      },
    },
    mr_pipelines: {},
    trunk_pipelines: {},
    commit_statuses: {
      "sha-mr-456": [
        {
          id: "status-1",
          name: "ci / legacy-test",
          status: "success",
          ref: "feature/rate-limiting",
          updated_at: "2026-04-01T09:30:00Z",
        },
      ],
    },
    evidence_states: {},
    unowned_paths: {},
    codeowners_text: "* @platform/senior-eng",
    issues: [
      {
        id: "88",
        iid: "88",
        title: "Implement stricter rate limits",
        state: "opened",
      },
    ],
    base_url: "http://gitlab.internal",
    self_managed: true,
  },

  "trunk-integration-failure": {
    id: "trunk-integration-failure",
    fixture_id: "trunk-integration-failed-gitlab",
    description:
      "A merged MR whose post-merge trunk pipeline failed.",
    project: {
      id: "repo-observability-gl-001",
      path_with_namespace: "example-org/observability",
      default_branch: "main",
      visibility: "private",
    },
    merge_requests: [
      {
        id: "mr-1234",
        iid: 1234,
        title: "Add alerting rules",
        description: "Adds alerting for latency. Closes #105",
        state: "merged",
        merged_at: "2026-04-02T10:15:00Z",
        closed_at: null,
        merge_commit_sha: "merge-sha-1234-gl",
        source_branch: "feature/add-alerting",
        target_branch: "main",
        author: { id: "actor-dana-gl", username: "dana", name: "Dana" },
        created_at: "2026-04-01T15:00:00Z",
        updated_at: "2026-04-02T10:20:00Z",
        sha: "sha-mr-1234",
        merged_by: { id: "actor-dana-gl", username: "dana", name: "Dana" },
      },
    ],
    approvals: {
      "1234": {
        approvals_required: 2,
        approved_by: [
          { user: { id: "actor-eli-gl", username: "eli", name: "Eli" }, approved_at: "2026-04-02T10:05:00Z" },
          { user: { id: "actor-fay-gl", username: "fay", name: "Fay" }, approved_at: "2026-04-02T10:10:00Z" },
        ],
      },
    },
    mr_pipelines: {
      "1234": [
        {
          id: "pipeline-branch-1234",
          status: "success",
          ref: "feature/add-alerting",
          name: "ci / test",
          web_url: "https://gitlab.com/example-org/observability/-/pipelines/2001",
          duration: 480,
          finished_at: "2026-04-02T09:45:00Z",
        },
      ],
    },
    trunk_pipelines: {
      main: [
        {
          id: "pipeline-trunk-1234",
          status: "failed",
          ref: "main",
          name: "deploy / main",
          sha: "merge-sha-1234-gl",
          pipeline_type: "trunk",
          web_url: "https://gitlab.com/example-org/observability/-/pipelines/2002",
          duration: 900,
          finished_at: "2026-04-02T10:30:00Z",
          failure_reason: "deploy step failed",
        },
      ],
    },
    commit_statuses: {},
    evidence_states: {},
    unowned_paths: {},
    codeowners_text: "* @example-org/sre-team",
    issues: [
      {
        id: "105",
        iid: "105",
        title: "Add alerting for latency",
        state: "opened",
        web_url: "https://gitlab.com/example-org/observability/-/issues/105",
      },
    ],
    base_url: "https://gitlab.com",
  },

  "unclear-ownership": {
    id: "unclear-ownership",
    fixture_id: "unclear-ownership-gitlab",
    description:
      "A merge request touching paths without CODEOWNERS coverage.",
    project: {
      id: "repo-infra-gl-001",
      path_with_namespace: "example-org/infra",
      default_branch: "main",
      visibility: "private",
    },
    merge_requests: [
      {
        id: "mr-500",
        iid: 500,
        title: "Update infra configs",
        description: "Updates deployment configuration.",
        state: "opened",
        draft: false,
        merged_at: null,
        closed_at: null,
        merge_commit_sha: null,
        source_branch: "feat/infra-update",
        target_branch: "main",
        author: { id: "actor-kim-gl", username: "kim", name: "Kim" },
        created_at: "2026-04-05T09:00:00Z",
        updated_at: "2026-04-05T11:00:00Z",
        sha: "sha-mr-500",
      },
    ],
    approvals: {
      "500": {
        approvals_required: 0,
        approvals_left: 0,
        approved_by: [],
      },
    },
    mr_pipelines: {
      "500": [
        {
          id: "pipeline-500",
          status: "success",
          ref: "feat/infra-update",
          name: "ci / validate",
          finished_at: "2026-04-05T10:00:00Z",
        },
      ],
    },
    trunk_pipelines: {},
    commit_statuses: {},
    evidence_states: {},
    unowned_paths: {
      "500": ["deploy/k8s/new-namespace/", "scripts/migrate.sh"],
    },
    issues: [],
    base_url: "https://gitlab.com",
  },
};

export function getScenario(id: string): GitLabScenario {
  const scenario = scenarios[id];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}. Known: ${Object.keys(scenarios).join(", ")}`);
  }
  return scenario;
}

export const DEFAULT_SCENARIO = "blocked-on-review";
