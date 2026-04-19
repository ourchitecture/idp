// GitHub mock scenario data.
// Each scenario maps to a canonical fixture in schema/fixtures/provider-adapter-input/
// and provides provider-shaped HTTP responses for all needed endpoints.

export type GitHubUser = {
  id: number | string;
  node_id?: string;
  login: string;
  name?: string | null;
  teams?: string[];
};

export type GitHubTeam = {
  id?: number | string;
  slug: string;
  name?: string;
};

export type GitHubRepository = {
  id: number | string;
  node_id?: string;
  name: string;
  full_name: string;
  default_branch: string;
  visibility?: "public" | "private" | "internal";
  private?: boolean;
  archived?: boolean;
};

export type GitHubPullRequest = {
  id: number | string;
  node_id?: string;
  number: number;
  title: string;
  body?: string | null;
  state: "open" | "closed";
  draft?: boolean;
  merged_at?: string | null;
  closed_at?: string | null;
  merge_commit_sha?: string | null;
  merged?: boolean;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  base: { ref: string };
  head: { ref: string; sha?: string };
  requested_reviewers?: GitHubUser[];
  requested_teams?: GitHubTeam[];
  merged_by?: GitHubUser | null;
};

export type GitHubReview = {
  id: number | string;
  user: GitHubUser;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "DISMISSED";
  submitted_at?: string;
};

export type GitHubCheckRun = {
  id: number | string;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | "startup_failure"
    | null;
  started_at?: string | null;
  completed_at?: string | null;
  html_url?: string | null;
  head_branch?: string | null;
  head_sha?: string | null;
  pull_requests?: Array<{ number: number }>;
};

export type GitHubWorkflowRun = {
  id: number | string;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "startup_failure"
    | null;
  run_started_at?: string;
  updated_at?: string;
  html_url?: string;
  head_branch?: string;
  head_sha?: string;
  event?: string;
};

export type GitHubStatus = {
  state: "success" | "failure" | "error" | "pending";
  context: string;
  updated_at: string;
  target_url?: string;
};

export type GitHubBranchProtection = {
  required_approving_review_count?: number;
  required_reviewers?: Array<{ type: "User" | "Team"; name: string; id?: string }>;
};

export type GitHubIssue = {
  number: number;
  title?: string;
  state?: "open" | "closed";
  html_url?: string;
};

export type GitHubScenario = {
  id: string;
  fixture_id: string;
  description: string;
  repository: GitHubRepository;
  pull_requests: GitHubPullRequest[];
  // Reviews keyed by PR number
  reviews: Record<number, GitHubReview[]>;
  // Check runs keyed by commit SHA (PR head SHA)
  check_runs: Record<string, GitHubCheckRun[]>;
  // Workflow runs keyed by branch name
  workflow_runs: Record<string, GitHubWorkflowRun[]>;
  // Commit statuses keyed by SHA
  statuses: Record<string, GitHubStatus[]>;
  branch_protection?: GitHubBranchProtection;
  // Raw CODEOWNERS file content
  codeowners_text?: string;
  // Issues in the repository
  issues: GitHubIssue[];
};

export const scenarios: Record<string, GitHubScenario> = {
  "blocked-on-review": {
    id: "blocked-on-review",
    fixture_id: "blocked-on-review-github",
    description:
      "A change waiting 36 hours past the expected review window with two assigned reviewers who have not responded.",
    repository: {
      id: "repo-payments-001",
      node_id: "repo-payments-001",
      name: "payments-service",
      full_name: "example-org/payments-service",
      default_branch: "main",
      visibility: "private",
      archived: false,
    },
    pull_requests: [
      {
        id: "pr-789",
        node_id: "pr-789",
        number: 789,
        title: "Add payment webhook",
        body: "Implements webhook handler. Closes #42",
        state: "open",
        draft: false,
        merged_at: null,
        closed_at: null,
        merge_commit_sha: null,
        merged: false,
        user: { id: "actor-alice", node_id: "actor-alice", login: "alice", name: "Alice", teams: ["payments-team"] },
        created_at: "2026-03-30T08:00:00Z",
        updated_at: "2026-04-01T09:00:00Z",
        base: { ref: "main" },
        head: { ref: "feature/add-payment-webhook", sha: "sha-pr-789" },
        requested_reviewers: [
          { id: "actor-bob", node_id: "actor-bob", login: "bob", name: "Bob", teams: ["payments-team"] },
          { id: "actor-carol", node_id: "actor-carol", login: "carol", name: "Carol", teams: ["payments-team"] },
        ],
      },
    ],
    reviews: { 789: [] },
    check_runs: {
      "sha-pr-789": [
        {
          id: "check-1",
          name: "ci / test",
          status: "completed",
          conclusion: "success",
          started_at: "2026-03-30T08:57:38Z",
          completed_at: "2026-03-30T09:00:00Z",
          head_branch: "feature/add-payment-webhook",
          html_url: "https://github.com/example-org/payments-service/checks/1",
          pull_requests: [{ number: 789 }],
        },
      ],
    },
    workflow_runs: {},
    statuses: {},
    branch_protection: { required_approving_review_count: 1 },
    codeowners_text: "* @example-org/payments-team",
    issues: [
      {
        number: 42,
        title: "Add payment webhook handler",
        state: "open",
        html_url: "https://github.com/example-org/payments-service/issues/42",
      },
    ],
  },

  "trunk-integration-failure": {
    id: "trunk-integration-failure",
    fixture_id: "trunk-integration-failed-github",
    description: "A merged change whose post-merge trunk pipeline failed.",
    repository: {
      id: "repo-observability-001",
      node_id: "repo-observability-001",
      name: "observability",
      full_name: "example-org/observability",
      default_branch: "main",
      visibility: "private",
      archived: false,
    },
    pull_requests: [
      {
        id: "pr-1234",
        node_id: "pr-1234",
        number: 1234,
        title: "Add alerting rules",
        body: "Adds alerting for latency. Resolves #105",
        state: "closed",
        draft: false,
        merged_at: "2026-04-02T10:15:00Z",
        closed_at: "2026-04-02T10:15:00Z",
        merge_commit_sha: "merge-sha-1234",
        merged: true,
        user: { id: "actor-dana", node_id: "actor-dana", login: "dana", name: "Dana" },
        created_at: "2026-04-01T15:00:00Z",
        updated_at: "2026-04-02T10:20:00Z",
        base: { ref: "main" },
        head: { ref: "feature/add-alerting", sha: "sha-pr-1234" },
        requested_reviewers: [
          { id: "actor-eli", node_id: "actor-eli", login: "eli", name: "Eli" },
          { id: "actor-fay", node_id: "actor-fay", login: "fay", name: "Fay" },
        ],
        merged_by: { id: "actor-dana", node_id: "actor-dana", login: "dana", name: "Dana" },
      },
    ],
    reviews: {
      1234: [
        {
          id: "review-1",
          user: { id: "actor-eli", node_id: "actor-eli", login: "eli", name: "Eli" },
          state: "APPROVED",
          submitted_at: "2026-04-02T10:05:00Z",
        },
        {
          id: "review-2",
          user: { id: "actor-fay", node_id: "actor-fay", login: "fay", name: "Fay" },
          state: "APPROVED",
          submitted_at: "2026-04-02T10:10:00Z",
        },
      ],
    },
    check_runs: {
      "sha-pr-1234": [
        {
          id: "check-branch",
          name: "ci / test",
          status: "completed",
          conclusion: "success",
          started_at: "2026-04-02T09:37:00Z",
          completed_at: "2026-04-02T09:45:00Z",
          head_branch: "feature/add-alerting",
          pull_requests: [{ number: 1234 }],
        },
      ],
    },
    workflow_runs: {
      main: [
        {
          id: "trunk-run",
          name: "deploy / main",
          status: "completed",
          conclusion: "failure",
          run_started_at: "2026-04-02T10:10:00Z",
          updated_at: "2026-04-02T10:25:00Z",
          html_url: "https://github.com/example-org/observability/actions/runs/5002",
          head_branch: "main",
          head_sha: "merge-sha-1234",
          event: "push",
        },
      ],
    },
    statuses: {},
    branch_protection: { required_approving_review_count: 2 },
    codeowners_text: "* @example-org/sre-team",
    issues: [
      {
        number: 105,
        title: "Add alerting for latency",
        state: "open",
        html_url: "https://github.com/example-org/observability/issues/105",
      },
    ],
  },

  "changes-requested": {
    id: "changes-requested",
    fixture_id: "changes-requested-github",
    description: "A change with changes requested by a reviewer.",
    repository: {
      id: "repo-config-001",
      node_id: "repo-config-001",
      name: "config-service",
      full_name: "example-org/config-service",
      default_branch: "main",
      visibility: "private",
      archived: false,
    },
    pull_requests: [
      {
        id: "pr-321",
        node_id: "pr-321",
        number: 321,
        title: "Tighten config validation",
        body: "Fixes #210",
        state: "open",
        draft: false,
        merged_at: null,
        closed_at: null,
        merge_commit_sha: null,
        merged: false,
        user: { id: "actor-ivy", node_id: "actor-ivy", login: "ivy", name: "Ivy", teams: ["config-team"] },
        created_at: "2026-04-03T10:30:00Z",
        updated_at: "2026-04-03T12:02:00Z",
        base: { ref: "main" },
        head: { ref: "feature/config", sha: "sha-pr-321" },
        requested_reviewers: [
          { id: "actor-gary", node_id: "actor-gary", login: "gary", name: "Gary", teams: ["config-team"] },
        ],
      },
    ],
    reviews: {
      321: [
        {
          id: "review-1",
          user: { id: "actor-gary", node_id: "actor-gary", login: "gary", name: "Gary" },
          state: "CHANGES_REQUESTED",
          submitted_at: "2026-04-03T12:00:00Z",
        },
      ],
    },
    check_runs: {
      "sha-pr-321": [
        {
          id: "check-config",
          name: "ci / lint",
          status: "completed",
          conclusion: "failure",
          started_at: "2026-04-03T11:55:00Z",
          completed_at: "2026-04-03T12:00:00Z",
          head_branch: "feature/config",
          html_url: "https://github.com/example-org/config-service/checks/42",
        },
      ],
    },
    workflow_runs: {},
    statuses: {
      "sha-pr-321": [
        {
          state: "failure",
          context: "legacy-ci",
          updated_at: "2026-04-03T12:02:00Z",
          target_url: "https://github.com/example-org/config-service/status/1",
        },
      ],
    },
    branch_protection: { required_approving_review_count: 1 },
    codeowners_text: "* @example-org/config-team",
    issues: [
      {
        number: 210,
        title: "Improve config validation",
        state: "open",
        html_url: "https://github.com/example-org/config-service/issues/210",
      },
    ],
  },

  "partial-data": {
    id: "partial-data",
    fixture_id: "partial-data-github",
    description:
      "A merged change where post-merge trunk validation evidence is not available (partial data).",
    repository: {
      id: "repo-frontend-001",
      node_id: "repo-frontend-001",
      name: "frontend",
      full_name: "example-org/frontend",
      default_branch: "main",
      visibility: "private",
      archived: false,
    },
    pull_requests: [
      {
        id: "pr-888",
        node_id: "pr-888",
        number: 888,
        title: "Refactor header layout",
        body: "Refactors header layout. Closes #77",
        state: "closed",
        draft: false,
        merged_at: "2026-04-04T09:10:00Z",
        closed_at: "2026-04-04T09:10:00Z",
        merge_commit_sha: "merge-sha-888",
        merged: true,
        user: { id: "actor-henry", node_id: "actor-henry", login: "henry", name: "Henry" },
        created_at: "2026-04-03T18:00:00Z",
        updated_at: "2026-04-04T09:12:00Z",
        base: { ref: "main" },
        head: { ref: "feature/header-refactor", sha: "sha-pr-888" },
        requested_reviewers: [],
        requested_teams: [{ id: "team-frontend", slug: "frontend-team", name: "Frontend Team" }],
        merged_by: { id: "actor-henry", node_id: "actor-henry", login: "henry", name: "Henry" },
      },
    ],
    reviews: { 888: [] },
    check_runs: {
      "sha-pr-888": [
        {
          id: "check-ui",
          name: "ci / ui",
          status: "completed",
          conclusion: "success",
          started_at: "2026-04-04T08:40:00Z",
          completed_at: "2026-04-04T08:50:00Z",
          head_branch: "feature/header-refactor",
          head_sha: "sha-pr-888",
          html_url: "https://github.com/example-org/frontend/checks/88",
        },
      ],
    },
    workflow_runs: {
      main: [
        {
          id: "trunk-run-1",
          name: "deploy / main",
          status: "completed",
          conclusion: "failure",
          run_started_at: "2026-04-04T09:20:00Z",
          updated_at: "2026-04-04T09:35:00Z",
          html_url: "https://github.com/example-org/frontend/actions/runs/9001",
          head_branch: "main",
          head_sha: "other-commit",
          event: "push",
        },
      ],
    },
    statuses: {
      "sha-pr-888": [
        {
          state: "success",
          context: "legacy-ui",
          updated_at: "2026-04-04T08:52:00Z",
          target_url: "https://github.com/example-org/frontend/status/42",
        },
      ],
    },
    branch_protection: {
      required_approving_review_count: 1,
      required_reviewers: [{ type: "Team", name: "frontend-team" }],
    },
    codeowners_text: "* @example-org/frontend-team @octocat",
    issues: [],
  },
};

export function getScenario(id: string): GitHubScenario {
  const scenario = scenarios[id];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}. Known: ${Object.keys(scenarios).join(", ")}`);
  }
  return scenario;
}

export const DEFAULT_SCENARIO = "blocked-on-review";
