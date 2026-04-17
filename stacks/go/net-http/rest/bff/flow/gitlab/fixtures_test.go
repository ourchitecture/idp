package gitlab

// Fixture helpers used by adapter_test.go. Mirrors
// stacks/nodejs/react-fastify/rest/bff/src/flow/gitlab/fixtures.ts so the Go
// adapter normalizes equivalent inputs to the shared fixture catalog under
// schema/fixtures/provider-adapter-input/.

func intPtr(n int) *int { return &n }

func blockedOnReviewSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-payments-gl-001",
			PathWithNamespace: "example-org/payments-service",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		BaseURL: "https://gitlab.com",
		MergeRequests: []MergeRequest{{
			ID:           "mr-789",
			IID:          "789",
			Title:        "Add payment webhook",
			Description:  "Implements webhook handler. Closes #42",
			State:        "opened",
			SourceBranch: "feature/add-payment-webhook",
			TargetBranch: "main",
			Author:       User{ID: "actor-alice-gl", Username: "alice", Name: "Alice", Groups: []string{"payments-team"}},
			Reviewers: []User{
				{ID: "actor-bob-gl", Username: "bob", Name: "Bob", Groups: []string{"payments-team"}},
				{ID: "actor-carol-gl", Username: "carol", Name: "Carol", Groups: []string{"payments-team"}},
			},
			CreatedAt: "2026-03-30T08:00:00Z",
			UpdatedAt: "2026-04-01T09:00:00Z",
			SHA:       "sha-mr-789",
		}},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"789": {
				ApprovalsRequired: 2,
				ApprovalsLeft:     intPtr(2),
				ApprovedBy:        []ApprovalEntry{},
				Rules: []ApprovalRule{{
					Name:              "payments",
					ApprovalsRequired: 2,
					Users: []User{
						{ID: "actor-bob-gl", Username: "bob", Name: "Bob"},
						{ID: "actor-carol-gl", Username: "carol", Name: "Carol"},
					},
				}},
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"789": {{
				ID:         "pipeline-1001",
				Status:     "success",
				Ref:        "feature/add-payment-webhook",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/payments-service/-/pipelines/1001",
				Duration:   150,
				FinishedAt: "2026-03-30T09:00:00Z",
			}},
		},
		Issues: []Issue{{
			ID:     "42",
			IID:    "42",
			Title:  "Add payment webhook handler",
			State:  "opened",
			WebURL: "https://gitlab.com/example-org/payments-service/-/issues/42",
		}},
		CodeownersText: "* @example-org/payments-team",
		FetchedAt:      "2026-04-01T10:00:00Z",
	}
}

func trunkIntegrationFailureSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-observability-gl-001",
			PathWithNamespace: "example-org/observability",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		BaseURL: "https://gitlab.com",
		MergeRequests: []MergeRequest{{
			ID:             "mr-1234",
			IID:            "1234",
			Title:          "Add alerting rules",
			Description:    "Adds alerting for latency. Resolves #105",
			State:          "merged",
			MergedAt:       "2026-04-02T10:15:00Z",
			ClosedAt:       "2026-04-02T10:15:00Z",
			MergeCommitSHA: "merge-sha-gl-1234",
			SourceBranch:   "feature/add-alerting",
			TargetBranch:   "main",
			Author:         User{ID: "actor-dana-gl", Username: "dana", Name: "Dana"},
			Reviewers: []User{
				{ID: "actor-eli-gl", Username: "eli", Name: "Eli"},
				{ID: "actor-fay-gl", Username: "fay", Name: "Fay"},
			},
			CreatedAt: "2026-04-01T15:00:00Z",
			UpdatedAt: "2026-04-02T10:20:00Z",
			SHA:       "sha-mr-1234",
			MergedBy:  &User{ID: "actor-dana-gl", Username: "dana", Name: "Dana"},
		}},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"1234": {
				ApprovalsRequired: 2,
				ApprovalsLeft:     intPtr(0),
				ApprovedBy: []ApprovalEntry{
					{User: User{ID: "actor-eli-gl", Username: "eli", Name: "Eli"}, ApprovedAt: "2026-04-02T10:05:00Z"},
					{User: User{ID: "actor-fay-gl", Username: "fay", Name: "Fay"}, ApprovedAt: "2026-04-02T10:10:00Z"},
				},
				LastActivityAt: "2026-04-02T10:10:00Z",
				Rules: []ApprovalRule{{
					Name:              "sre",
					ApprovalsRequired: 2,
					ApprovedBy: []ApprovalEntry{
						{User: User{ID: "actor-eli-gl", Username: "eli", Name: "Eli"}, ApprovedAt: "2026-04-02T10:05:00Z"},
						{User: User{ID: "actor-fay-gl", Username: "fay", Name: "Fay"}, ApprovedAt: "2026-04-02T10:10:00Z"},
					},
				}},
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"1234": {{
				ID:         "pipeline-branch-2001",
				Status:     "success",
				Ref:        "feature/add-alerting",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/observability/-/pipelines/2001",
				Duration:   480,
				FinishedAt: "2026-04-02T09:45:00Z",
			}},
		},
		TrunkPipelinesByBranch: map[string][]Pipeline{
			"main": {{
				ID:            "pipeline-trunk-2002",
				Status:        "failed",
				Ref:           "main",
				SHA:           "merge-sha-gl-1234",
				Name:          "deploy / main",
				WebURL:        "https://gitlab.com/example-org/observability/-/pipelines/2002",
				Duration:      600,
				FinishedAt:    "2026-04-02T10:25:00Z",
				FailureReason: "failure",
			}},
		},
		Issues: []Issue{{
			ID:     "105",
			IID:    "105",
			Title:  "Add alerting for latency",
			State:  "opened",
			WebURL: "https://gitlab.com/example-org/observability/-/issues/105",
		}},
		CodeownersText: "* @example-org/sre-team",
		FetchedAt:      "2026-04-02T12:00:00Z",
	}
}

func blockedOnReviewSelfManagedSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-infra-sm-001",
			PathWithNamespace: "example-org/infra",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		MergeRequests: []MergeRequest{{
			ID:           "mr-512",
			IID:          "512",
			Title:        "Update network policy",
			Description:  "Closes #99",
			State:        "opened",
			SourceBranch: "feature/update-network-policy",
			TargetBranch: "main",
			Author:       User{ID: "actor-peter-sm", Username: "peter", Name: "Peter", Groups: []string{"infra-team"}},
			CreatedAt:    "2026-04-03T10:00:00Z",
			UpdatedAt:    "2026-04-05T13:00:00Z",
			SHA:          "sha-mr-512",
		}},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"512": {
				ApprovalsRequired: 1,
				ApprovalsLeft:     intPtr(1),
				ApprovedBy:        []ApprovalEntry{},
				LastActivityAt:    "2026-04-05T13:00:00Z",
				Rules: []ApprovalRule{{
					Name:              "infra",
					ApprovalsRequired: 1,
					Groups:            []Group{{FullPath: "example-org/infra-team"}},
				}},
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"512": {{
				ID:         "pipeline-legacy-1",
				Status:     "success",
				Ref:        "feature/update-network-policy",
				Name:       "legacy-ci",
				Duration:   200,
				FinishedAt: "2026-04-03T11:00:00Z",
			}},
		},
		Issues: []Issue{{
			ID:    "99",
			IID:   "99",
			Title: "Update firewall policy for prod",
			State: "opened",
		}},
		CodeownersText:   "* @example-org/infra-team",
		SelfManaged:      true,
		AdditionalActors: []User{{ID: "actor-quinn-sm", Username: "quinn", Name: "Quinn", Groups: []string{"infra-team"}}},
		FetchedAt:        "2026-04-05T14:00:00Z",
	}
}

func unclearOwnershipSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-notifications-gl-001",
			PathWithNamespace: "example-org/notifications-service",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		BaseURL: "https://gitlab.com",
		MergeRequests: []MergeRequest{{
			ID:           "mr-400",
			IID:          "400",
			Title:        "Add push notification support",
			Description:  "Implements push notifications. Resolves #88",
			State:        "opened",
			SourceBranch: "feature/add-push-notifications",
			TargetBranch: "main",
			Author:       User{ID: "actor-marcus-gl", Username: "marcus", Name: "Marcus"},
			CreatedAt:    "2026-04-05T08:00:00Z",
			UpdatedAt:    "2026-04-06T08:30:00Z",
			SHA:          "sha-mr-400",
		}},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"400": {
				ApprovalsRequired: 1,
				ApprovalsLeft:     intPtr(1),
				ApprovedBy:        []ApprovalEntry{},
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"400": {{
				ID:         "pipeline-3001",
				Status:     "success",
				Ref:        "feature/add-push-notifications",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/notifications-service/-/pipelines/3001",
				Duration:   120,
				FinishedAt: "2026-04-05T09:00:00Z",
			}},
		},
		Issues: []Issue{{
			ID:     "88",
			IID:    "88",
			Title:  "Implement push notifications",
			State:  "opened",
			WebURL: "https://gitlab.com/example-org/notifications-service/-/issues/88",
		}},
		UnownedPathsByMergeIID: map[string][]string{"400": {"*"}},
		FetchedAt:              "2026-04-06T09:00:00Z",
	}
}

func waitingOnEvidenceSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-payments-gl-003",
			PathWithNamespace: "example-org/payments-service",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		BaseURL: "https://gitlab.com",
		MergeRequests: []MergeRequest{{
			ID:             "mr-600",
			IID:            "600",
			Title:          "PCI compliance update",
			Description:    "Implements compliance changes. Closes #130",
			State:          "merged",
			MergedAt:       "2026-04-08T11:45:00Z",
			ClosedAt:       "2026-04-08T11:45:00Z",
			MergeCommitSHA: "merge-sha-gl-600",
			SourceBranch:   "feature/pci-compliance-update",
			TargetBranch:   "main",
			Author:         User{ID: "actor-olivia-gl", Username: "olivia", Name: "Olivia", Groups: []string{"payments-team"}},
			Reviewers:      []User{{ID: "actor-sam-gl", Username: "sam", Name: "Sam", Groups: []string{"security-team"}}},
			CreatedAt:      "2026-04-06T09:00:00Z",
			UpdatedAt:      "2026-04-08T12:00:00Z",
			SHA:            "sha-mr-600",
			MergedBy:       &User{ID: "actor-olivia-gl", Username: "olivia", Name: "Olivia"},
		}},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"600": {
				ApprovalsRequired: 1,
				ApprovalsLeft:     intPtr(0),
				ApprovedBy: []ApprovalEntry{
					{User: User{ID: "actor-sam-gl", Username: "sam", Name: "Sam"}, ApprovedAt: "2026-04-08T11:30:00Z"},
				},
				LastActivityAt: "2026-04-08T11:30:00Z",
				Rules: []ApprovalRule{{
					Name:              "security",
					ApprovalsRequired: 1,
					ApprovedBy: []ApprovalEntry{
						{User: User{ID: "actor-sam-gl", Username: "sam", Name: "Sam"}, ApprovedAt: "2026-04-08T11:30:00Z"},
					},
				}},
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"600": {{
				ID:         "pipeline-4001",
				Status:     "success",
				Ref:        "feature/pci-compliance-update",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/payments-service/-/pipelines/4001",
				Duration:   320,
				FinishedAt: "2026-04-07T10:00:00Z",
			}},
		},
		Issues: []Issue{{
			ID:     "130",
			IID:    "130",
			Title:  "Implement PCI DSS compliance changes",
			State:  "opened",
			WebURL: "https://gitlab.com/example-org/payments-service/-/issues/130",
		}},
		EvidenceStatesByMergeIID: map[string][]EvidenceState{
			"600": {{
				State:         "pending",
				AsOf:          "2026-04-08T14:00:00Z",
				RequiredTypes: []string{"compliance attestation"},
				Owner:         &User{ID: "actor-sam-gl", Username: "sam", Name: "Sam"},
			}},
		},
		GroupOwners: []string{"payments-team"},
		FetchedAt:   "2026-04-08T14:00:00Z",
	}
}

func agingImplementationSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-auth-gl-001",
			PathWithNamespace: "example-org/auth-service",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		BaseURL: "https://gitlab.com",
		MergeRequests: []MergeRequest{{
			ID:             "mr-700",
			IID:            "700",
			Title:          "Add OAuth refresh token support",
			Description:    "Adds refresh token support. Closes #55",
			State:          "merged",
			MergedAt:       "2026-04-07T15:00:00Z",
			ClosedAt:       "2026-04-07T15:00:00Z",
			MergeCommitSHA: "merge-sha-gl-700",
			SourceBranch:   "feature/oauth-refresh-token",
			TargetBranch:   "main",
			Author:         User{ID: "actor-rachel-gl", Username: "rachel", Name: "Rachel", Groups: []string{"auth-team"}},
			CreatedAt:      "2026-04-06T10:00:00Z",
			UpdatedAt:      "2026-04-07T15:00:00Z",
			SHA:            "sha-mr-700",
			MergedBy:       &User{ID: "actor-rachel-gl", Username: "rachel", Name: "Rachel"},
		}},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"700": {
				ApprovalsRequired: 1,
				ApprovalsLeft:     intPtr(0),
				ApprovedBy: []ApprovalEntry{
					{User: User{ID: "actor-rachel-gl", Username: "rachel", Name: "Rachel"}, ApprovedAt: "2026-04-07T14:45:00Z"},
				},
				LastActivityAt: "2026-04-07T14:45:00Z",
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"700": {{
				ID:         "pipeline-5001",
				Status:     "success",
				Ref:        "feature/oauth-refresh-token",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/auth-service/-/pipelines/5001",
				Duration:   260,
				FinishedAt: "2026-04-07T12:00:00Z",
			}},
		},
		TrunkPipelinesByBranch: map[string][]Pipeline{
			"main": {{
				ID:        "pipeline-5002",
				Status:    "pending",
				Ref:       "main",
				SHA:       "merge-sha-gl-700",
				Name:      "integration / main",
				WebURL:    "https://gitlab.com/example-org/auth-service/-/pipelines/5002",
				UpdatedAt: "2026-04-10T09:00:00Z",
			}},
		},
		Issues: []Issue{{
			ID:     "55",
			IID:    "55",
			Title:  "Implement OAuth 2.0 refresh tokens",
			State:  "opened",
			WebURL: "https://gitlab.com/example-org/auth-service/-/issues/55",
		}},
		CodeownersText: "* @example-org/auth-team",
		FetchedAt:      "2026-04-10T09:00:00Z",
	}
}

func riskAggregationSource() AdapterSource {
	return GitLabAdapterSource{
		Project: Project{
			ID:                "repo-checkout-gl-001",
			PathWithNamespace: "example-org/checkout-service",
			DefaultBranch:     "main",
			Visibility:        "private",
		},
		MergeRequests: []MergeRequest{
			{
				ID:             "mr-801",
				IID:            "801",
				Title:          "Add payment retry logic",
				Description:    "Closes #200",
				State:          "merged",
				MergedAt:       "2026-04-08T14:30:00Z",
				ClosedAt:       "2026-04-08T14:30:00Z",
				MergeCommitSHA: "merge-sha-gl-801",
				SourceBranch:   "feature/payment-retry",
				TargetBranch:   "main",
				Author:         User{ID: "actor-tom-gl", Username: "tom", Name: "Tom", Groups: []string{"checkout-team"}},
				Reviewers:      []User{{ID: "actor-uma-gl", Username: "uma", Name: "Uma", Groups: []string{"checkout-team"}}},
				CreatedAt:      "2026-04-08T09:00:00Z",
				UpdatedAt:      "2026-04-08T14:30:00Z",
				SHA:            "sha-mr-801",
				MergedBy:       &User{ID: "actor-tom-gl", Username: "tom", Name: "Tom"},
			},
			{
				ID:           "mr-802",
				IID:          "802",
				Title:        "Refactor discount engine",
				Description:  "Closes #201",
				State:        "opened",
				SourceBranch: "feature/discount-engine",
				TargetBranch: "main",
				Author:       User{ID: "actor-uma-gl", Username: "uma", Name: "Uma", Groups: []string{"checkout-team"}},
				Reviewers:    []User{{ID: "actor-tom-gl", Username: "tom", Name: "Tom", Groups: []string{"checkout-team"}}},
				CreatedAt:    "2026-04-08T10:00:00Z",
				UpdatedAt:    "2026-04-09T15:00:00Z",
				SHA:          "sha-mr-802",
			},
			{
				ID:           "mr-803",
				IID:          "803",
				Title:        "Add cart persistence",
				Description:  "Implements cart persistence. Fixes #202",
				State:        "opened",
				SourceBranch: "feature/cart-persistence",
				TargetBranch: "main",
				Author:       User{ID: "actor-victor-gl", Username: "victor", Name: "Victor", Groups: []string{"checkout-team"}},
				CreatedAt:    "2026-04-09T08:00:00Z",
				UpdatedAt:    "2026-04-09T15:30:00Z",
				SHA:          "sha-mr-803",
			},
		},
		ApprovalsByMergeIID: map[string]ApprovalState{
			"801": {
				ApprovalsRequired: 1,
				ApprovalsLeft:     intPtr(0),
				ApprovedBy: []ApprovalEntry{
					{User: User{ID: "actor-uma-gl", Username: "uma", Name: "Uma"}, ApprovedAt: "2026-04-08T14:00:00Z"},
				},
				LastActivityAt: "2026-04-08T14:00:00Z",
				AsOf:           "2026-04-08T14:00:00Z",
			},
			"802": {
				ApprovalsRequired:  1,
				ApprovalsLeft:      intPtr(1),
				ApprovedBy:         []ApprovalEntry{},
				LastActivityAt:     "2026-04-08T10:00:00Z",
				AsOf:               "2026-04-09T15:00:00Z",
				SuggestedApprovers: []User{{ID: "actor-tom-gl", Username: "tom", Name: "Tom"}},
			},
			"803": {
				ApprovalsRequired: 1,
				ApprovalsLeft:     intPtr(1),
				ApprovedBy:        []ApprovalEntry{},
				LastActivityAt:    "2026-04-09T08:00:00Z",
				AsOf:              "2026-04-09T15:30:00Z",
			},
		},
		PipelinesByMergeIID: map[string][]Pipeline{
			"801": {{
				ID:         "pipeline-6001",
				Status:     "success",
				Ref:        "feature/payment-retry",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/checkout-service/-/pipelines/6001",
				Duration:   185,
				FinishedAt: "2026-04-08T12:00:00Z",
			}},
			"802": {{
				ID:         "pipeline-6003",
				Status:     "success",
				Ref:        "feature/discount-engine",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/checkout-service/-/pipelines/6003",
				Duration:   192,
				FinishedAt: "2026-04-08T11:00:00Z",
			}},
			"803": {{
				ID:         "pipeline-6004",
				Status:     "success",
				Ref:        "feature/cart-persistence",
				Name:       "ci / test",
				WebURL:     "https://gitlab.com/example-org/checkout-service/-/pipelines/6004",
				Duration:   198,
				FinishedAt: "2026-04-09T09:00:00Z",
			}},
		},
		TrunkPipelinesByBranch: map[string][]Pipeline{
			"main": {{
				ID:            "pipeline-6002",
				Status:        "failed",
				Ref:           "main",
				SHA:           "merge-sha-gl-801",
				Name:          "deploy / main",
				WebURL:        "https://gitlab.com/example-org/checkout-service/-/pipelines/6002",
				Duration:      520,
				FinishedAt:    "2026-04-08T15:00:00Z",
				FailureReason: "failure",
			}},
		},
		Issues: []Issue{
			{ID: "200", IID: "200", State: "opened"},
			{ID: "201", IID: "201", State: "opened"},
			{ID: "202", IID: "202", State: "opened"},
		},
		CodeownersText:         "* @example-org/checkout-team\nsrc/cart/*",
		UnownedPathsByMergeIID: map[string][]string{"803": {"src/cart/*"}},
		FetchedAt:              "2026-04-09T16:00:00Z",
	}
}
