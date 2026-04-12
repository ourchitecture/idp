import type { GitHubAdapterSource } from "./adapter";

export const blockedOnReviewSource: GitHubAdapterSource = {
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
      user: {
        id: "actor-alice",
        node_id: "actor-alice",
        login: "alice",
        name: "Alice",
        teams: ["payments-team"],
      },
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
  reviews_by_pull_number: {
    789: [],
  },
  check_runs_by_pull_number: {
    789: [
      {
        id: "check-1",
        name: "ci / test",
        status: "completed",
        conclusion: "success",
        started_at: "2026-03-30T08:57:38Z",
        completed_at: "2026-03-30T09:00:00Z",
        head_branch: "feature/add-payment-webhook",
        html_url: "https://github.com/example-org/payments-service/checks/1",
      },
    ],
  },
  workflow_runs_by_branch: {},
  statuses_by_head_sha: {},
  branch_protection: {
    required_approving_review_count: 1,
  },
  codeowners_text: "* @example-org/payments-team",
  issues: [
    {
      number: 42,
      title: "Add payment webhook handler",
      state: "open",
      html_url: "https://github.com/example-org/payments-service/issues/42",
    },
  ],
  fetched_at: "2026-04-01T10:00:00Z",
};

export const trunkIntegrationFailureSource: GitHubAdapterSource = {
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
      user: {
        id: "actor-dana",
        node_id: "actor-dana",
        login: "dana",
        name: "Dana",
      },
      created_at: "2026-04-01T15:00:00Z",
      updated_at: "2026-04-02T10:20:00Z",
      base: { ref: "main" },
      head: { ref: "feature/add-alerting", sha: "sha-pr-1234" },
      requested_reviewers: [
        { id: "actor-eli", node_id: "actor-eli", login: "eli", name: "Eli" },
        { id: "actor-fay", node_id: "actor-fay", login: "fay", name: "Fay" },
      ],
      merged_by: {
        id: "actor-dana",
        node_id: "actor-dana",
        login: "dana",
        name: "Dana",
      },
    },
  ],
  reviews_by_pull_number: {
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
  check_runs_by_pull_number: {
    1234: [
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
  workflow_runs_by_branch: {
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
  statuses_by_head_sha: {},
  branch_protection: {
    required_approving_review_count: 2,
  },
  codeowners_text: "* @example-org/sre-team",
  issues: [
    {
      number: 105,
      title: "Add alerting for latency",
      state: "open",
      html_url: "https://github.com/example-org/observability/issues/105",
    },
  ],
  fetched_at: "2026-04-02T12:00:00Z",
};
