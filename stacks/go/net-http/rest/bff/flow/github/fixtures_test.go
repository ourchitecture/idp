package github

// Fixture helpers used by adapter_test.go. Mirrors
// stacks/nodejs/react-fastify/rest/bff/src/flow/github/fixtures.ts so the Go
// adapter normalizes equivalent inputs to the shared fixture catalog under
// schema/fixtures/provider-adapter-input/.

func blockedOnReviewSource() AdapterSource {
	return GitHubAdapterSource{
		Repository: Repository{
			ID:            "repo-payments-001",
			NodeID:        "repo-payments-001",
			Name:          "payments-service",
			FullName:      "example-org/payments-service",
			DefaultBranch: "main",
			Visibility:    "private",
		},
		PullRequests: []PullRequest{{
			ID:        "pr-789",
			NodeID:    "pr-789",
			Number:    789,
			Title:     "Add payment webhook",
			Body:      "Implements webhook handler. Closes #42",
			State:     "open",
			User:      User{ID: "actor-alice", NodeID: "actor-alice", Login: "alice", Name: "Alice", Teams: []string{"payments-team"}},
			CreatedAt: "2026-03-30T08:00:00Z",
			UpdatedAt: "2026-04-01T09:00:00Z",
			Base:      PullRequestRef{Ref: "main"},
			Head:      PullRequestRef{Ref: "feature/add-payment-webhook", SHA: "sha-pr-789"},
			RequestedReviewers: []User{
				{ID: "actor-bob", NodeID: "actor-bob", Login: "bob", Name: "Bob", Teams: []string{"payments-team"}},
				{ID: "actor-carol", NodeID: "actor-carol", Login: "carol", Name: "Carol", Teams: []string{"payments-team"}},
			},
		}},
		ReviewsByPullNumber: map[int][]Review{789: {}},
		CheckRunsByPullNumber: map[int][]CheckRun{
			789: {{
				ID:          "check-1",
				Name:        "ci / test",
				Status:      "completed",
				Conclusion:  "success",
				StartedAt:   "2026-03-30T08:57:38Z",
				CompletedAt: "2026-03-30T09:00:00Z",
				HeadBranch:  "feature/add-payment-webhook",
				HTMLURL:     "https://github.com/example-org/payments-service/checks/1",
			}},
		},
		BranchProtection: &BranchProtection{RequiredApprovingReviewCount: 1},
		CodeownersText:   "* @example-org/payments-team",
		Issues: []Issue{{
			Number:  42,
			Title:   "Add payment webhook handler",
			State:   "open",
			HTMLURL: "https://github.com/example-org/payments-service/issues/42",
		}},
		FetchedAt: "2026-04-01T10:00:00Z",
	}
}

func trunkIntegrationFailureSource() AdapterSource {
	return GitHubAdapterSource{
		Repository: Repository{
			ID:            "repo-observability-001",
			NodeID:        "repo-observability-001",
			Name:          "observability",
			FullName:      "example-org/observability",
			DefaultBranch: "main",
			Visibility:    "private",
		},
		PullRequests: []PullRequest{{
			ID:             "pr-1234",
			NodeID:         "pr-1234",
			Number:         1234,
			Title:          "Add alerting rules",
			Body:           "Adds alerting for latency. Resolves #105",
			State:          "closed",
			MergedAt:       "2026-04-02T10:15:00Z",
			ClosedAt:       "2026-04-02T10:15:00Z",
			MergeCommitSHA: "merge-sha-1234",
			Merged:         true,
			User:           User{ID: "actor-dana", NodeID: "actor-dana", Login: "dana", Name: "Dana"},
			CreatedAt:      "2026-04-01T15:00:00Z",
			UpdatedAt:      "2026-04-02T10:20:00Z",
			Base:           PullRequestRef{Ref: "main"},
			Head:           PullRequestRef{Ref: "feature/add-alerting", SHA: "sha-pr-1234"},
			RequestedReviewers: []User{
				{ID: "actor-eli", NodeID: "actor-eli", Login: "eli", Name: "Eli"},
				{ID: "actor-fay", NodeID: "actor-fay", Login: "fay", Name: "Fay"},
			},
			MergedBy: &User{ID: "actor-dana", NodeID: "actor-dana", Login: "dana", Name: "Dana"},
		}},
		ReviewsByPullNumber: map[int][]Review{
			1234: {
				{ID: "review-1", User: User{ID: "actor-eli", NodeID: "actor-eli", Login: "eli", Name: "Eli"}, State: "APPROVED", SubmittedAt: "2026-04-02T10:05:00Z"},
				{ID: "review-2", User: User{ID: "actor-fay", NodeID: "actor-fay", Login: "fay", Name: "Fay"}, State: "APPROVED", SubmittedAt: "2026-04-02T10:10:00Z"},
			},
		},
		CheckRunsByPullNumber: map[int][]CheckRun{
			1234: {{
				ID:           "check-branch",
				Name:         "ci / test",
				Status:       "completed",
				Conclusion:   "success",
				StartedAt:    "2026-04-02T09:37:00Z",
				CompletedAt:  "2026-04-02T09:45:00Z",
				HeadBranch:   "feature/add-alerting",
				PullRequests: []PullRequestNumberRef{{Number: 1234}},
			}},
		},
		WorkflowRunsByBranch: map[string][]WorkflowRun{
			"main": {{
				ID:           "trunk-run",
				Name:         "deploy / main",
				Status:       "completed",
				Conclusion:   "failure",
				RunStartedAt: "2026-04-02T10:10:00Z",
				UpdatedAt:    "2026-04-02T10:25:00Z",
				HTMLURL:      "https://github.com/example-org/observability/actions/runs/5002",
				HeadBranch:   "main",
				HeadSHA:      "merge-sha-1234",
				Event:        "push",
			}},
		},
		BranchProtection: &BranchProtection{RequiredApprovingReviewCount: 2},
		CodeownersText:   "* @example-org/sre-team",
		Issues: []Issue{{
			Number:  105,
			Title:   "Add alerting for latency",
			State:   "open",
			HTMLURL: "https://github.com/example-org/observability/issues/105",
		}},
		FetchedAt: "2026-04-02T12:00:00Z",
	}
}

func changesRequestedSource() AdapterSource {
	return GitHubAdapterSource{
		Repository: Repository{
			ID:            "repo-config-001",
			NodeID:        "repo-config-001",
			Name:          "config-service",
			FullName:      "example-org/config-service",
			DefaultBranch: "main",
			Visibility:    "private",
		},
		PullRequests: []PullRequest{{
			ID:        "pr-321",
			NodeID:    "pr-321",
			Number:    321,
			Title:     "Tighten config validation",
			Body:      "Fixes #210",
			State:     "open",
			User:      User{ID: "actor-ivy", NodeID: "actor-ivy", Login: "ivy", Name: "Ivy", Teams: []string{"config-team"}},
			CreatedAt: "2026-04-03T10:30:00Z",
			UpdatedAt: "2026-04-03T12:02:00Z",
			Base:      PullRequestRef{Ref: "main"},
			Head:      PullRequestRef{Ref: "feature/config", SHA: "sha-pr-321"},
			RequestedReviewers: []User{
				{ID: "actor-gary", NodeID: "actor-gary", Login: "gary", Name: "Gary", Teams: []string{"config-team"}},
			},
		}},
		ReviewsByPullNumber: map[int][]Review{
			321: {{
				ID: "review-1", User: User{ID: "actor-gary", NodeID: "actor-gary", Login: "gary", Name: "Gary"},
				State: "CHANGES_REQUESTED", SubmittedAt: "2026-04-03T12:00:00Z",
			}},
		},
		CheckRunsByPullNumber: map[int][]CheckRun{
			321: {{
				ID:          "check-config",
				Name:        "ci / lint",
				Status:      "completed",
				Conclusion:  "failure",
				StartedAt:   "2026-04-03T11:55:00Z",
				CompletedAt: "2026-04-03T12:00:00Z",
				HeadBranch:  "feature/config",
				HTMLURL:     "https://github.com/example-org/config-service/checks/42",
			}},
		},
		StatusesByHeadSHA: map[string][]Status{
			"sha-pr-321": {{
				State:     "failure",
				Context:   "legacy-ci",
				UpdatedAt: "2026-04-03T12:02:00Z",
				TargetURL: "https://github.com/example-org/config-service/status/1",
			}},
		},
		BranchProtection: &BranchProtection{RequiredApprovingReviewCount: 1},
		CodeownersText:   "* @example-org/config-team",
		Issues: []Issue{{
			Number:  210,
			Title:   "Improve config validation",
			State:   "open",
			HTMLURL: "https://github.com/example-org/config-service/issues/210",
		}},
		FetchedAt: "2026-04-03T12:05:00Z",
	}
}

func reviewNotRequiredSource() AdapterSource {
	return GitHubAdapterSource{
		Repository: Repository{
			ID:            "repo-docs-001",
			NodeID:        "repo-docs-001",
			Name:          "docs",
			FullName:      "example-org/docs",
			DefaultBranch: "main",
			Visibility:    "public",
		},
		PullRequests: []PullRequest{{
			ID:        "pr-555",
			NodeID:    "pr-555",
			Number:    555,
			Title:     "Draft: update onboarding checklist",
			Body:      "Early draft; no review needed yet.",
			State:     "open",
			Draft:     true,
			User:      User{ID: "actor-jules", NodeID: "actor-jules", Login: "jules", Name: "Jules", Teams: []string{"docs-team"}},
			CreatedAt: "2026-04-02T09:00:00Z",
			UpdatedAt: "2026-04-02T09:15:00Z",
			Base:      PullRequestRef{Ref: "main"},
			Head:      PullRequestRef{Ref: "docs/draft-onboarding", SHA: "sha-pr-555"},
		}},
		ReviewsByPullNumber: map[int][]Review{555: {}},
		CheckRunsByPullNumber: map[int][]CheckRun{
			555: {{
				ID:         "check-docs",
				Name:       "docs / preview",
				Status:     "queued",
				StartedAt:  "2026-04-02T09:10:00Z",
				HeadBranch: "docs/draft-onboarding",
				HTMLURL:    "https://github.com/example-org/docs/checks/12",
			}},
		},
		BranchProtection: &BranchProtection{RequiredApprovingReviewCount: 0},
		CodeownersText:   "* @example-org/docs-team",
		FetchedAt:        "2026-04-02T09:20:00Z",
	}
}

func partialEvidenceSource() AdapterSource {
	return GitHubAdapterSource{
		Repository: Repository{
			ID:            "repo-frontend-001",
			NodeID:        "repo-frontend-001",
			Name:          "frontend",
			FullName:      "example-org/frontend",
			DefaultBranch: "main",
			Visibility:    "private",
		},
		PullRequests: []PullRequest{{
			ID:             "pr-888",
			NodeID:         "pr-888",
			Number:         888,
			Title:          "Refactor header layout",
			Body:           "Refactors header layout. Closes #77",
			State:          "closed",
			MergedAt:       "2026-04-04T09:10:00Z",
			ClosedAt:       "2026-04-04T09:10:00Z",
			MergeCommitSHA: "merge-sha-888",
			Merged:         true,
			User:           User{ID: "actor-henry", NodeID: "actor-henry", Login: "henry", Name: "Henry"},
			CreatedAt:      "2026-04-03T18:00:00Z",
			UpdatedAt:      "2026-04-04T09:12:00Z",
			Base:           PullRequestRef{Ref: "main"},
			Head:           PullRequestRef{Ref: "feature/header-refactor", SHA: "sha-pr-888"},
			RequestedTeams: []Team{{ID: "team-frontend", Slug: "frontend-team", Name: "Frontend Team"}},
			MergedBy:       &User{ID: "actor-henry", NodeID: "actor-henry", Login: "henry", Name: "Henry"},
		}},
		ReviewsByPullNumber: map[int][]Review{888: {}},
		CheckRunsByPullNumber: map[int][]CheckRun{
			888: {{
				ID:          "check-ui",
				Name:        "ci / ui",
				Status:      "completed",
				Conclusion:  "success",
				StartedAt:   "2026-04-04T08:40:00Z",
				CompletedAt: "2026-04-04T08:50:00Z",
				HeadBranch:  "feature/header-refactor",
				HeadSHA:     "sha-pr-888",
				HTMLURL:     "https://github.com/example-org/frontend/checks/88",
			}},
		},
		WorkflowRunsByBranch: map[string][]WorkflowRun{
			"main": {{
				ID:           "trunk-run-1",
				Name:         "deploy / main",
				Status:       "completed",
				Conclusion:   "failure",
				RunStartedAt: "2026-04-04T09:20:00Z",
				UpdatedAt:    "2026-04-04T09:35:00Z",
				HTMLURL:      "https://github.com/example-org/frontend/actions/runs/9001",
				HeadBranch:   "main",
				HeadSHA:      "other-commit",
				Event:        "push",
			}},
		},
		StatusesByHeadSHA: map[string][]Status{
			"sha-pr-888": {{
				State:     "success",
				Context:   "legacy-ui",
				UpdatedAt: "2026-04-04T08:52:00Z",
				TargetURL: "https://github.com/example-org/frontend/status/42",
			}},
		},
		BranchProtection: &BranchProtection{
			RequiredApprovingReviewCount: 1,
			RequiredReviewers:            []RequiredReviewer{{Type: "Team", Name: "frontend-team"}},
		},
		CodeownersText: "* @example-org/frontend-team @octocat",
		FetchedAt:      "2026-04-04T09:30:00Z",
	}
}
