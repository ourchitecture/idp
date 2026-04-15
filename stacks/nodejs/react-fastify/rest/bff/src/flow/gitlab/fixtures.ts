import type { GitLabAdapterSource } from "./adapter";

export const blockedOnReviewSource: GitLabAdapterSource = {
  project: {
    id: "repo-payments-gl-001",
    path_with_namespace: "example-org/payments-service",
    default_branch: "main",
    visibility: "private",
  },
  base_url: "https://gitlab.com",
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
  approvals_by_merge_iid: {
    789: {
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
  pipelines_by_merge_iid: {
    789: [
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
  issues: [
    {
      id: "42",
      iid: "42",
      title: "Add payment webhook handler",
      state: "opened",
      web_url: "https://gitlab.com/example-org/payments-service/-/issues/42",
    },
  ],
  codeowners_text: "* @example-org/payments-team",
  fetched_at: "2026-04-01T10:00:00Z",
};

export const trunkIntegrationFailureSource: GitLabAdapterSource = {
  project: {
    id: "repo-observability-gl-001",
    path_with_namespace: "example-org/observability",
    default_branch: "main",
    visibility: "private",
  },
  base_url: "https://gitlab.com",
  merge_requests: [
    {
      id: "mr-1234",
      iid: 1234,
      title: "Add alerting rules",
      description: "Adds alerting for latency. Resolves #105",
      state: "merged",
      draft: false,
      merged_at: "2026-04-02T10:15:00Z",
      closed_at: "2026-04-02T10:15:00Z",
      merge_commit_sha: "merge-sha-gl-1234",
      source_branch: "feature/add-alerting",
      target_branch: "main",
      author: { id: "actor-dana-gl", username: "dana", name: "Dana" },
      reviewers: [
        { id: "actor-eli-gl", username: "eli", name: "Eli" },
        { id: "actor-fay-gl", username: "fay", name: "Fay" },
      ],
      created_at: "2026-04-01T15:00:00Z",
      updated_at: "2026-04-02T10:20:00Z",
      sha: "sha-mr-1234",
      merged_by: { id: "actor-dana-gl", username: "dana", name: "Dana" },
    },
  ],
  approvals_by_merge_iid: {
    1234: {
      approvals_required: 2,
      approvals_left: 0,
      approved_by: [
        { user: { id: "actor-eli-gl", username: "eli", name: "Eli" }, approved_at: "2026-04-02T10:05:00Z" },
        { user: { id: "actor-fay-gl", username: "fay", name: "Fay" }, approved_at: "2026-04-02T10:10:00Z" },
      ],
      last_activity_at: "2026-04-02T10:10:00Z",
      rules: [
        {
          name: "sre",
          approvals_required: 2,
          approved_by: [
            { user: { id: "actor-eli-gl", username: "eli", name: "Eli" }, approved_at: "2026-04-02T10:05:00Z" },
            { user: { id: "actor-fay-gl", username: "fay", name: "Fay" }, approved_at: "2026-04-02T10:10:00Z" },
          ],
        },
      ],
    },
  },
  pipelines_by_merge_iid: {
    1234: [
      {
        id: "pipeline-branch-2001",
        status: "success",
        ref: "feature/add-alerting",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/observability/-/pipelines/2001",
        duration: 480,
        finished_at: "2026-04-02T09:45:00Z",
      },
    ],
  },
  trunk_pipelines_by_branch: {
    main: [
      {
        id: "pipeline-trunk-2002",
        status: "failed",
        ref: "main",
        sha: "merge-sha-gl-1234",
        name: "deploy / main",
        web_url: "https://gitlab.com/example-org/observability/-/pipelines/2002",
        duration: 600,
        finished_at: "2026-04-02T10:25:00Z",
        failure_reason: "failure",
      },
    ],
  },
  issues: [
    {
      id: "105",
      iid: "105",
      title: "Add alerting for latency",
      state: "opened",
      web_url: "https://gitlab.com/example-org/observability/-/issues/105",
    },
  ],
  codeowners_text: "* @example-org/sre-team",
  fetched_at: "2026-04-02T12:00:00Z",
};

export const blockedOnReviewSelfManagedSource: GitLabAdapterSource = {
  project: {
    id: "repo-infra-sm-001",
    path_with_namespace: "example-org/infra",
    default_branch: "main",
    visibility: "private",
  },
  merge_requests: [
    {
      id: "mr-512",
      iid: 512,
      title: "Update network policy",
      description: "Closes #99",
      state: "opened",
      draft: false,
      merged_at: null,
      closed_at: null,
      merge_commit_sha: null,
      source_branch: "feature/update-network-policy",
      target_branch: "main",
      author: { id: "actor-peter-sm", username: "peter", name: "Peter", groups: ["infra-team"] },
      created_at: "2026-04-03T10:00:00Z",
      updated_at: "2026-04-05T13:00:00Z",
      sha: "sha-mr-512",
    },
  ],
  approvals_by_merge_iid: {
    512: {
      approvals_required: 1,
      approvals_left: 1,
      approved_by: [],
      last_activity_at: "2026-04-05T13:00:00Z",
      rules: [
        {
          name: "infra",
          approvals_required: 1,
          groups: [{ full_path: "example-org/infra-team" }],
        },
      ],
    },
  },
  pipelines_by_merge_iid: {
    512: [
      {
        id: "pipeline-legacy-1",
        status: "success",
        ref: "feature/update-network-policy",
        name: "legacy-ci",
        duration: 200,
        finished_at: "2026-04-03T11:00:00Z",
      },
    ],
  },
  issues: [
    {
      id: "99",
      iid: "99",
      title: "Update firewall policy for prod",
      state: "opened",
    },
  ],
  codeowners_text: "* @example-org/infra-team",
  self_managed: true,
  additional_actors: [{ id: "actor-quinn-sm", username: "quinn", name: "Quinn", groups: ["infra-team"] }],
  fetched_at: "2026-04-05T14:00:00Z",
};

export const unclearOwnershipSource: GitLabAdapterSource = {
  project: {
    id: "repo-notifications-gl-001",
    path_with_namespace: "example-org/notifications-service",
    default_branch: "main",
    visibility: "private",
  },
  base_url: "https://gitlab.com",
  merge_requests: [
    {
      id: "mr-400",
      iid: 400,
      title: "Add push notification support",
      description: "Implements push notifications. Resolves #88",
      state: "opened",
      draft: false,
      merged_at: null,
      closed_at: null,
      merge_commit_sha: null,
      source_branch: "feature/add-push-notifications",
      target_branch: "main",
      author: { id: "actor-marcus-gl", username: "marcus", name: "Marcus" },
      created_at: "2026-04-05T08:00:00Z",
      updated_at: "2026-04-06T08:30:00Z",
      sha: "sha-mr-400",
    },
  ],
  approvals_by_merge_iid: {
    400: {
      approvals_required: 1,
      approvals_left: 1,
      approved_by: [],
    },
  },
  pipelines_by_merge_iid: {
    400: [
      {
        id: "pipeline-3001",
        status: "success",
        ref: "feature/add-push-notifications",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/notifications-service/-/pipelines/3001",
        duration: 120,
        finished_at: "2026-04-05T09:00:00Z",
      },
    ],
  },
  issues: [
    {
      id: "88",
      iid: "88",
      title: "Implement push notifications",
      state: "opened",
      web_url: "https://gitlab.com/example-org/notifications-service/-/issues/88",
    },
  ],
  // No CODEOWNERS entry covers the paths; ownership will be inferred.
  codeowners_text: undefined,
  unowned_paths_by_merge_iid: { 400: ["*"] },
  fetched_at: "2026-04-06T09:00:00Z",
};

export const waitingOnEvidenceSource: GitLabAdapterSource = {
  project: {
    id: "repo-payments-gl-003",
    path_with_namespace: "example-org/payments-service",
    default_branch: "main",
    visibility: "private",
  },
  base_url: "https://gitlab.com",
  merge_requests: [
    {
      id: "mr-600",
      iid: 600,
      title: "PCI compliance update",
      description: "Implements compliance changes. Closes #130",
      state: "merged",
      draft: false,
      merged_at: "2026-04-08T11:45:00Z",
      closed_at: "2026-04-08T11:45:00Z",
      merge_commit_sha: "merge-sha-gl-600",
      source_branch: "feature/pci-compliance-update",
      target_branch: "main",
      author: { id: "actor-olivia-gl", username: "olivia", name: "Olivia", groups: ["payments-team"] },
      reviewers: [{ id: "actor-sam-gl", username: "sam", name: "Sam", groups: ["security-team"] }],
      created_at: "2026-04-06T09:00:00Z",
      updated_at: "2026-04-08T12:00:00Z",
      sha: "sha-mr-600",
      merged_by: { id: "actor-olivia-gl", username: "olivia", name: "Olivia" },
    },
  ],
  approvals_by_merge_iid: {
    600: {
      approvals_required: 1,
      approvals_left: 0,
      approved_by: [{ user: { id: "actor-sam-gl", username: "sam", name: "Sam" }, approved_at: "2026-04-08T11:30:00Z" }],
      last_activity_at: "2026-04-08T11:30:00Z",
      rules: [
        {
          name: "security",
          approvals_required: 1,
          approved_by: [{ user: { id: "actor-sam-gl", username: "sam", name: "Sam" }, approved_at: "2026-04-08T11:30:00Z" }],
        },
      ],
    },
  },
  pipelines_by_merge_iid: {
    600: [
      {
        id: "pipeline-4001",
        status: "success",
        ref: "feature/pci-compliance-update",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/payments-service/-/pipelines/4001",
        duration: 320,
        finished_at: "2026-04-07T10:00:00Z",
      },
    ],
  },
  issues: [
    {
      id: "130",
      iid: "130",
      title: "Implement PCI DSS compliance changes",
      state: "opened",
      web_url: "https://gitlab.com/example-org/payments-service/-/issues/130",
    },
  ],
  evidence_states_by_merge_iid: {
    600: [
      {
        state: "pending",
        as_of: "2026-04-08T14:00:00Z",
        required_types: ["compliance attestation"],
        owner: { id: "actor-sam-gl", username: "sam", name: "Sam" },
      },
    ],
  },
  group_owners: ["payments-team"],
  fetched_at: "2026-04-08T14:00:00Z",
};

export const agingImplementationSource: GitLabAdapterSource = {
  project: {
    id: "repo-auth-gl-001",
    path_with_namespace: "example-org/auth-service",
    default_branch: "main",
    visibility: "private",
  },
  base_url: "https://gitlab.com",
  merge_requests: [
    {
      id: "mr-700",
      iid: 700,
      title: "Add OAuth refresh token support",
      description: "Adds refresh token support. Closes #55",
      state: "merged",
      draft: false,
      merged_at: "2026-04-07T15:00:00Z",
      closed_at: "2026-04-07T15:00:00Z",
      merge_commit_sha: "merge-sha-gl-700",
      source_branch: "feature/oauth-refresh-token",
      target_branch: "main",
      author: { id: "actor-rachel-gl", username: "rachel", name: "Rachel", groups: ["auth-team"] },
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-07T15:00:00Z",
      sha: "sha-mr-700",
      merged_by: { id: "actor-rachel-gl", username: "rachel", name: "Rachel" },
    },
  ],
  approvals_by_merge_iid: {
    700: {
      approvals_required: 1,
      approvals_left: 0,
      approved_by: [{ user: { id: "actor-rachel-gl", username: "rachel", name: "Rachel" }, approved_at: "2026-04-07T14:45:00Z" }],
      last_activity_at: "2026-04-07T14:45:00Z",
    },
  },
  pipelines_by_merge_iid: {
    700: [
      {
        id: "pipeline-5001",
        status: "success",
        ref: "feature/oauth-refresh-token",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/auth-service/-/pipelines/5001",
        duration: 260,
        finished_at: "2026-04-07T12:00:00Z",
      },
    ],
  },
  trunk_pipelines_by_branch: {
    main: [
      {
        id: "pipeline-5002",
        status: "pending",
        ref: "main",
        sha: "merge-sha-gl-700",
        name: "integration / main",
        web_url: "https://gitlab.com/example-org/auth-service/-/pipelines/5002",
        updated_at: "2026-04-10T09:00:00Z",
      },
    ],
  },
  issues: [
    {
      id: "55",
      iid: "55",
      title: "Implement OAuth 2.0 refresh tokens",
      state: "opened",
      web_url: "https://gitlab.com/example-org/auth-service/-/issues/55",
    },
  ],
  codeowners_text: "* @example-org/auth-team",
  fetched_at: "2026-04-10T09:00:00Z",
};

export const riskAggregationSource: GitLabAdapterSource = {
  project: {
    id: "repo-checkout-gl-001",
    path_with_namespace: "example-org/checkout-service",
    default_branch: "main",
    visibility: "private",
  },
  merge_requests: [
    {
      id: "mr-801",
      iid: 801,
      title: "Add payment retry logic",
      description: "Closes #200",
      state: "merged",
      draft: false,
      merged_at: "2026-04-08T14:30:00Z",
      closed_at: "2026-04-08T14:30:00Z",
      merge_commit_sha: "merge-sha-gl-801",
      source_branch: "feature/payment-retry",
      target_branch: "main",
      author: { id: "actor-tom-gl", username: "tom", name: "Tom", groups: ["checkout-team"] },
      reviewers: [{ id: "actor-uma-gl", username: "uma", name: "Uma", groups: ["checkout-team"] }],
      created_at: "2026-04-08T09:00:00Z",
      updated_at: "2026-04-08T14:30:00Z",
      sha: "sha-mr-801",
      merged_by: { id: "actor-tom-gl", username: "tom", name: "Tom" },
    },
    {
      id: "mr-802",
      iid: 802,
      title: "Refactor discount engine",
      description: "Closes #201",
      state: "opened",
      draft: false,
      merged_at: null,
      closed_at: null,
      merge_commit_sha: null,
      source_branch: "feature/discount-engine",
      target_branch: "main",
      author: { id: "actor-uma-gl", username: "uma", name: "Uma", groups: ["checkout-team"] },
      reviewers: [{ id: "actor-tom-gl", username: "tom", name: "Tom", groups: ["checkout-team"] }],
      created_at: "2026-04-08T10:00:00Z",
      updated_at: "2026-04-09T15:00:00Z",
      sha: "sha-mr-802",
    },
    {
      id: "mr-803",
      iid: 803,
      title: "Add cart persistence",
      description: "Implements cart persistence. Fixes #202",
      state: "opened",
      draft: false,
      merged_at: null,
      closed_at: null,
      merge_commit_sha: null,
      source_branch: "feature/cart-persistence",
      target_branch: "main",
      author: { id: "actor-victor-gl", username: "victor", name: "Victor", groups: ["checkout-team"] },
      created_at: "2026-04-09T08:00:00Z",
      updated_at: "2026-04-09T15:30:00Z",
      sha: "sha-mr-803",
    },
  ],
  approvals_by_merge_iid: {
    801: {
      approvals_required: 1,
      approvals_left: 0,
      approved_by: [{ user: { id: "actor-uma-gl", username: "uma", name: "Uma" }, approved_at: "2026-04-08T14:00:00Z" }],
      last_activity_at: "2026-04-08T14:00:00Z",
      as_of: "2026-04-08T14:00:00Z",
    },
    802: {
      approvals_required: 1,
      approvals_left: 1,
      approved_by: [],
      last_activity_at: "2026-04-08T10:00:00Z",
      as_of: "2026-04-09T15:00:00Z",
      suggested_approvers: [{ id: "actor-tom-gl", username: "tom", name: "Tom" }],
    },
    803: {
      approvals_required: 1,
      approvals_left: 1,
      approved_by: [],
      last_activity_at: "2026-04-09T08:00:00Z",
      as_of: "2026-04-09T15:30:00Z",
    },
  },
  pipelines_by_merge_iid: {
    801: [
      {
        id: "pipeline-6001",
        status: "success",
        ref: "feature/payment-retry",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/checkout-service/-/pipelines/6001",
        duration: 185,
        finished_at: "2026-04-08T12:00:00Z",
      },
    ],
    802: [
      {
        id: "pipeline-6003",
        status: "success",
        ref: "feature/discount-engine",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/checkout-service/-/pipelines/6003",
        duration: 192,
        finished_at: "2026-04-08T11:00:00Z",
      },
    ],
    803: [
      {
        id: "pipeline-6004",
        status: "success",
        ref: "feature/cart-persistence",
        name: "ci / test",
        web_url: "https://gitlab.com/example-org/checkout-service/-/pipelines/6004",
        duration: 198,
        finished_at: "2026-04-09T09:00:00Z",
      },
    ],
  },
  trunk_pipelines_by_branch: {
    main: [
      {
        id: "pipeline-6002",
        status: "failed",
        ref: "main",
        sha: "merge-sha-gl-801",
        name: "deploy / main",
        web_url: "https://gitlab.com/example-org/checkout-service/-/pipelines/6002",
        duration: 520,
        finished_at: "2026-04-08T15:00:00Z",
        failure_reason: "failure",
      },
    ],
  },
  issues: [
    { id: "200", iid: "200", state: "opened" },
    { id: "201", iid: "201", state: "opened" },
    { id: "202", iid: "202", state: "opened" },
  ],
  codeowners_text: "* @example-org/checkout-team\nsrc/cart/*",
  unowned_paths_by_merge_iid: {
    803: ["src/cart/*"],
  },
  fetched_at: "2026-04-09T16:00:00Z",
};
