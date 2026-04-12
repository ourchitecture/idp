import {
  type NormalizedActor,
  type NormalizedChange,
  type NormalizedMergeEvent,
  type NormalizedOwnershipHint,
  type NormalizedRepository,
  type NormalizedReviewState,
  type NormalizedValidationRun,
  type NormalizedWorkItemRef,
  type ProviderAdapterInput,
} from "../types";
import { parseCodeowners } from "./codeowners";

type GitHubUser = {
  id: number | string;
  node_id?: string;
  login: string;
  name?: string | null;
  teams?: string[];
};

type GitHubTeam = {
  id?: number | string;
  slug: string;
  name?: string;
};

type GitHubRepository = {
  id: number | string;
  node_id?: string;
  name: string;
  full_name: string;
  default_branch: string;
  visibility?: "public" | "private" | "internal";
  private?: boolean;
  archived?: boolean;
};

type GitHubPullRequest = {
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

type GitHubReview = {
  id: number | string;
  user: GitHubUser;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "DISMISSED";
  submitted_at?: string;
};

type GitHubCheckRun = {
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

type GitHubWorkflowRun = {
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

type GitHubStatus = {
  state: "success" | "failure" | "error" | "pending";
  context: string;
  updated_at: string;
  target_url?: string;
};

type GitHubBranchProtection = {
  required_approving_review_count?: number;
  required_reviewers?: Array<{ type: "User" | "Team"; name: string; id?: string }>;
};

type GitHubIssue = {
  number: number;
  title?: string;
  state?: "open" | "closed";
  html_url?: string;
};

export type GitHubAdapterSource = {
  repository: GitHubRepository;
  pull_requests: GitHubPullRequest[];
  reviews_by_pull_number: Record<number, GitHubReview[]>;
  check_runs_by_pull_number?: Record<number, GitHubCheckRun[]>;
  workflow_runs_by_branch?: Record<string, GitHubWorkflowRun[]>;
  statuses_by_head_sha?: Record<string, GitHubStatus[]>;
  branch_protection?: GitHubBranchProtection;
  codeowners_text?: string;
  issues?: GitHubIssue[];
  fetched_at: string;
};

function actorId(user: GitHubUser): string {
  if (user.node_id && user.node_id !== "") {
    return user.node_id;
  }
  return `github-user-${String(user.id ?? user.login)}`;
}

function displayName(user: GitHubUser): string {
  if (user.name && user.name.trim().length > 0) {
    return user.name;
  }
  return user.login;
}

function normalizeRepository(repo: GitHubRepository, fetchedAt: string): NormalizedRepository {
  return {
    provider: "github",
    provider_id: repo.node_id ?? String(repo.id),
    full_name: repo.full_name,
    default_branch: repo.default_branch,
    visibility: repo.visibility ?? (repo.private ? "private" : "public"),
    archived: repo.archived ? true : undefined,
    fetched_at: fetchedAt,
  };
}

function extractWorkItemRefs(
  pr: GitHubPullRequest,
  repo: GitHubRepository,
  issues?: GitHubIssue[],
): NormalizedWorkItemRef[] {
  const refs = new Map<string, NormalizedWorkItemRef>();
  const text = `${pr.title}\n${pr.body ?? ""}`;
  const pattern =
    /\b(?:(?:close[sd]?|closes|closed|closing|fix|fixe[sd]?|fixing|resolve[sd]?|resolving))\s+#(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const externalId = match[1];
    refs.set(externalId, { external_id: externalId, provider: "github", url: undefined });
  }

  if (issues && issues.length > 0) {
    for (const ref of refs.values()) {
      const issue = issues.find((item) => String(item.number) === ref.external_id);
      if (issue) {
        ref.title = issue.title;
        ref.state = issue.state;
        ref.url = issue.html_url ?? `https://github.com/${repo.full_name}/issues/${issue.number}`;
      } else {
        ref.url = `https://github.com/${repo.full_name}/issues/${ref.external_id}`;
      }
    }
  }

  return Array.from(refs.values());
}

function normalizeChange(
  pr: GitHubPullRequest,
  repo: GitHubRepository,
  fetchedAt: string,
  issues?: GitHubIssue[],
): NormalizedChange {
  const providerId = pr.node_id ?? String(pr.id);
  const workItemRefs = extractWorkItemRefs(pr, repo, issues);

  let state: NormalizedChange["state"] = "open";
  if (pr.state === "closed") {
    state = pr.merged_at ? "merged" : "closed";
  }

  return {
    provider: "github",
    provider_id: providerId,
    repository_id: repo.node_id ?? String(repo.id),
    source_branch: pr.head.ref,
    target_branch: pr.base.ref,
    state,
    author_actor_id: actorId(pr.user),
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    title: pr.title,
    is_draft: pr.draft ? true : undefined,
    work_item_refs: workItemRefs,
    merged_at: pr.merged_at ?? undefined,
    closed_at: pr.closed_at ?? undefined,
    fetched_at: fetchedAt,
  };
}

function mapReviewState(
  pr: GitHubPullRequest,
  reviews: GitHubReview[],
  branchProtection: GitHubBranchProtection | undefined,
  fetchedAt: string,
): NormalizedReviewState {
  const requiredApprovalCount = branchProtection?.required_approving_review_count ?? 0;
  const reviewerStates = new Map<
    string,
    { state: GitHubReview["state"]; submitted_at?: string; reviewer: GitHubUser }
  >();

  for (const review of reviews) {
    const reviewerKey = actorId(review.user);
    const existing = reviewerStates.get(reviewerKey);
    const existingDate = existing?.submitted_at ? Date.parse(existing.submitted_at) : 0;
    const currentDate = review.submitted_at ? Date.parse(review.submitted_at) : Number.POSITIVE_INFINITY;
    if (!existing || currentDate >= existingDate) {
      reviewerStates.set(reviewerKey, {
        state: review.state,
        submitted_at: review.submitted_at,
        reviewer: review.user,
      });
    }
  }

  const approvalCount = Array.from(reviewerStates.values()).filter((r) => r.state === "APPROVED").length;
  const changesRequestedCount = Array.from(reviewerStates.values()).filter(
    (r) => r.state === "CHANGES_REQUESTED",
  ).length;
  const underReviewCount = Array.from(reviewerStates.values()).filter(
    (r) => r.state === "COMMENTED" || r.state === "DISMISSED",
  ).length;

  const requestedReviewerIds = (pr.requested_reviewers ?? []).map(actorId);
  const reviewerIds = new Set<string>([
    ...requestedReviewerIds,
    ...Array.from(reviewerStates.keys()),
  ]);

  const lastActivity =
    Array.from(reviewerStates.values())
      .map((r) => r.submitted_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .pop() ?? pr.updated_at;

  let state: NormalizedReviewState["state"] = "awaiting_review";

  if (changesRequestedCount > 0) {
    state = "changes_requested";
  } else if (requiredApprovalCount > 0 && approvalCount >= requiredApprovalCount) {
    state = "approved";
  } else if (approvalCount > 0 || underReviewCount > 0) {
    state = "under_review";
  } else if (reviewerIds.size === 0 && requiredApprovalCount === 0) {
    state = "not_required";
  }

  return {
    change_id: pr.node_id ?? String(pr.id),
    state,
    as_of: lastActivity ?? fetchedAt,
    reviewer_actor_ids: Array.from(reviewerIds),
    last_activity_at: lastActivity,
    approval_count: approvalCount,
    required_approval_count: requiredApprovalCount,
  };
}

function mapCheckState(status: GitHubCheckRun["status"], conclusion?: GitHubCheckRun["conclusion"]) {
  if (conclusion) {
    switch (conclusion) {
      case "success":
        return "passed";
      case "failure":
      case "timed_out":
      case "action_required":
      case "startup_failure":
        return "failed";
      case "neutral":
      case "skipped":
      case "cancelled":
        return "skipped";
      default:
        break;
    }
  }

  switch (status) {
    case "queued":
      return "pending";
    case "in_progress":
      return "running";
    case "completed":
      return conclusion ? "running" : "running";
    default:
      return "pending";
  }
}

function normalizeCheckRuns(
  pr: GitHubPullRequest,
  repo: GitHubRepository,
  fetchedAt: string,
  runs: GitHubCheckRun[],
): NormalizedValidationRun[] {
  return runs.map((run) => {
    const scope: NormalizedValidationRun["scope"] =
      (run.pull_requests && run.pull_requests.length > 0) || run.head_branch === pr.head.ref
        ? "branch"
        : run.head_branch === repo.default_branch
          ? "trunk"
          : "branch";

    const start = run.started_at ?? fetchedAt;
    const durationSeconds =
      run.started_at && run.completed_at
        ? Math.max(
            0,
            Math.floor((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 1000),
          )
        : undefined;

    return {
      change_id: pr.node_id ?? String(pr.id),
      scope,
      state: mapCheckState(run.status, run.conclusion),
      run_at: run.completed_at ?? run.started_at ?? fetchedAt,
      name: run.name,
      url: run.html_url ?? undefined,
      duration_seconds: durationSeconds,
      failure_summary: run.conclusion && run.conclusion !== "success" ? run.conclusion : undefined,
    };
  });
}

function normalizeStatuses(
  pr: GitHubPullRequest,
  repo: GitHubRepository,
  fetchedAt: string,
  statuses: GitHubStatus[],
): NormalizedValidationRun[] {
  return statuses.map((status) => {
    const state =
      status.state === "success"
        ? "passed"
        : status.state === "pending"
          ? "running"
          : "failed";

    return {
      change_id: pr.node_id ?? String(pr.id),
      scope: pr.base.ref === repo.default_branch ? "trunk" : "branch",
      state,
      run_at: status.updated_at ?? fetchedAt,
      name: status.context,
      url: status.target_url,
      failure_summary: state === "failed" ? status.state : undefined,
    };
  });
}

function normalizeWorkflowRuns(
  pr: GitHubPullRequest,
  fetchedAt: string,
  runs: GitHubWorkflowRun[],
  scope: NormalizedValidationRun["scope"],
): NormalizedValidationRun[] {
  return runs.map((run) => {
    const runAt = run.updated_at ?? run.run_started_at ?? fetchedAt;
    const durationSeconds =
      run.run_started_at && run.updated_at
        ? Math.max(0, Math.floor((Date.parse(run.updated_at) - Date.parse(run.run_started_at)) / 1000))
        : undefined;
    const state =
      run.conclusion === "success"
        ? "passed"
        : run.conclusion === "failure" || run.conclusion === "startup_failure" || run.conclusion === "timed_out"
          ? "failed"
          : run.status === "in_progress"
            ? "running"
            : run.status === "queued"
              ? "pending"
              : run.conclusion === "cancelled" || run.conclusion === "skipped"
                ? "skipped"
                : "running";

    return {
      change_id: pr.node_id ?? String(pr.id),
      scope,
      state,
      run_at: runAt,
      name: run.name,
      url: run.html_url,
      duration_seconds: durationSeconds,
      failure_summary: state === "failed" ? run.conclusion ?? "failed" : undefined,
    };
  });
}

function normalizeOwnershipHints(
  repo: GitHubRepository,
  codeownersText: string | undefined,
  branchProtection: GitHubBranchProtection | undefined,
): NormalizedOwnershipHint[] {
  const hints: NormalizedOwnershipHint[] = [];
  const repositoryId = repo.node_id ?? String(repo.id);

  if (codeownersText) {
    const entries = parseCodeowners(codeownersText);
    for (const entry of entries) {
      const ownerActorIds: string[] = [];
      const ownerTeamNames: string[] = [];
      for (const owner of entry.owners) {
        if (!owner.startsWith("@")) {
          continue;
        }
        const token = owner.slice(1);
        if (token.includes("/")) {
          const parts = token.split("/");
          ownerTeamNames.push(parts[parts.length - 1]);
        } else {
          ownerActorIds.push(token);
        }
      }

      hints.push({
        repository_id: repositoryId,
        owner_actor_ids: ownerActorIds.length > 0 ? ownerActorIds : undefined,
        owner_team_names: ownerTeamNames.length > 0 ? ownerTeamNames : undefined,
        path_pattern: entry.pattern,
        source: "codeowners",
        confidence: "declared",
      });
    }
  }

  if (branchProtection?.required_reviewers) {
    const users = branchProtection.required_reviewers
      .filter((reviewer) => reviewer.type === "User")
      .map((reviewer) => reviewer.name);
    const teams = branchProtection.required_reviewers
      .filter((reviewer) => reviewer.type === "Team")
      .map((reviewer) => reviewer.name);

    if (users.length > 0 || teams.length > 0) {
      hints.push({
        repository_id: repositoryId,
        owner_actor_ids: users.length > 0 ? users : undefined,
        owner_team_names: teams.length > 0 ? teams : undefined,
        source: "branch_protection",
        confidence: "declared",
      });
    }
  }

  if (hints.length === 0) {
    hints.push({
      repository_id: repositoryId,
      owner_actor_ids: [],
      owner_team_names: [],
      confidence: "inferred",
    });
  }

  return hints;
}

function collectActors(
  pullRequests: GitHubPullRequest[],
  reviewsByPullNumber: Record<number, GitHubReview[]>,
  branchProtection: GitHubBranchProtection | undefined,
): NormalizedActor[] {
  const actors = new Map<string, NormalizedActor>();

  function addUser(user: GitHubUser | null | undefined) {
    if (!user) return;
    const id = actorId(user);
    if (actors.has(id)) return;
    actors.set(id, {
      provider: "github",
      provider_id: id,
      display_name: displayName(user),
      provider_login: user.login,
      team_memberships: user.teams,
    });
  }

  for (const pr of pullRequests) {
    addUser(pr.user);
    addUser(pr.merged_by ?? undefined);
    (pr.requested_reviewers ?? []).forEach(addUser);
    (reviewsByPullNumber[pr.number] ?? []).forEach((review) => addUser(review.user));
  }

  if (branchProtection?.required_reviewers) {
    for (const reviewer of branchProtection.required_reviewers) {
      if (reviewer.type === "User") {
        addUser({ id: reviewer.id ?? reviewer.name, login: reviewer.name });
      }
    }
  }

  return Array.from(actors.values());
}

function normalizeMergeEvent(pr: GitHubPullRequest): NormalizedMergeEvent | null {
  if (!pr.merged_at) {
    return null;
  }

  return {
    change_id: pr.node_id ?? String(pr.id),
    merged_at: pr.merged_at,
    target_branch: pr.base.ref,
    merged_by_actor_id: pr.merged_by ? actorId(pr.merged_by) : undefined,
    merge_commit_sha: pr.merge_commit_sha ?? undefined,
  };
}

export function buildGitHubProviderInput(source: GitHubAdapterSource): ProviderAdapterInput {
  const { repository, pull_requests: pullRequests, fetched_at: fetchedAt } = source;
  const repo = normalizeRepository(repository, fetchedAt);

  const changes = pullRequests.map((pr) => normalizeChange(pr, repository, fetchedAt, source.issues));

  const mergeEvents = pullRequests
    .map((pr) => normalizeMergeEvent(pr))
    .filter((event): event is NormalizedMergeEvent => event !== null);

  const reviewStates = pullRequests.map((pr) =>
    mapReviewState(pr, source.reviews_by_pull_number[pr.number] ?? [], source.branch_protection, fetchedAt),
  );

  const validationRuns: NormalizedValidationRun[] = [];
  for (const pr of pullRequests) {
    const checkRuns = source.check_runs_by_pull_number?.[pr.number] ?? [];
    validationRuns.push(...normalizeCheckRuns(pr, repository, fetchedAt, checkRuns));

    const statuses =
      (pr.head.sha && source.statuses_by_head_sha?.[pr.head.sha]) ||
      (pr.merge_commit_sha && source.statuses_by_head_sha?.[pr.merge_commit_sha]) ||
      [];
    validationRuns.push(...normalizeStatuses(pr, repository, fetchedAt, statuses));

    const branchRuns =
      source.workflow_runs_by_branch?.[pr.head.ref] ??
      source.workflow_runs_by_branch?.[`refs/heads/${pr.head.ref}`] ??
      [];
    if (branchRuns.length > 0) {
      validationRuns.push(...normalizeWorkflowRuns(pr, fetchedAt, branchRuns, "branch"));
    }

    const trunkRuns = source.workflow_runs_by_branch?.[repository.default_branch] ?? [];
    const matchingTrunkRuns = trunkRuns.filter(
      (run) => run.head_sha === pr.merge_commit_sha || run.head_branch === repository.default_branch,
    );
    if (matchingTrunkRuns.length > 0) {
      validationRuns.push(...normalizeWorkflowRuns(pr, fetchedAt, matchingTrunkRuns, "trunk"));
    }
  }

  const ownershipHints = normalizeOwnershipHints(
    repository,
    source.codeowners_text,
    source.branch_protection,
  );

  const actors = collectActors(pullRequests, source.reviews_by_pull_number, source.branch_protection);

  return {
    repository: repo,
    changes,
    actors,
    review_states: reviewStates,
    validation_runs: validationRuns,
    merge_events: mergeEvents,
    ownership_hints: ownershipHints,
  };
}
