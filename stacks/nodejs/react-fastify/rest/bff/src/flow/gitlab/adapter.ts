import {
  type NormalizedActor,
  type NormalizedChange,
  type NormalizedEvidenceState,
  type NormalizedMergeEvent,
  type NormalizedOwnershipHint,
  type NormalizedReviewState,
  type NormalizedValidationRun,
  type NormalizedWorkItemRef,
  type ProviderAdapterInput,
} from "../types";
import { parseCodeowners } from "../github/codeowners";

type GitLabUser = {
  id: number | string;
  username: string;
  name?: string | null;
  groups?: string[];
};

type GitLabGroup = {
  id?: number | string;
  full_path?: string;
  name?: string;
};

type GitLabProject = {
  id: number | string;
  path_with_namespace: string;
  default_branch: string;
  visibility?: "public" | "private" | "internal";
  archived?: boolean;
};

type GitLabMergeRequest = {
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

type GitLabApprovalRule = {
  name?: string;
  approvals_required?: number;
  approved_by?: Array<{ user: GitLabUser; approved_at?: string }>;
  users?: GitLabUser[];
  groups?: GitLabGroup[];
};

type GitLabApprovalState = {
  approvals_required?: number;
  approvals_left?: number;
  approved_by?: Array<{ user: GitLabUser; approved_at?: string }>;
  suggested_approvers?: GitLabUser[];
  rules?: GitLabApprovalRule[];
  last_activity_at?: string;
  as_of?: string;
};

type GitLabPipeline = {
  id: number | string;
  status:
    | "running"
    | "pending"
    | "success"
    | "failed"
    | "canceled"
    | "skipped"
    | "manual";
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

type GitLabCommitStatus = {
  id: number | string;
  name: string;
  status: "success" | "failed" | "pending" | "running" | "canceled";
  target_url?: string | null;
  ref?: string;
  created_at?: string;
  updated_at?: string;
};

type GitLabIssue = {
  id: number | string;
  iid?: number | string;
  title?: string;
  state?: "opened" | "closed";
  web_url?: string;
};

type GitLabEvidenceState = {
  state: NormalizedEvidenceState["state"];
  as_of: string;
  required_types?: string[];
  owner?: GitLabUser;
  freshness_at?: string;
  is_partial?: boolean;
};

export type GitLabAdapterSource = {
  project: GitLabProject;
  merge_requests: GitLabMergeRequest[];
  approvals_by_merge_iid?: Record<string, GitLabApprovalState>;
  pipelines_by_merge_iid?: Record<string, GitLabPipeline[]>;
  trunk_pipelines_by_branch?: Record<string, GitLabPipeline[]>;
  commit_statuses_by_sha?: Record<string, GitLabCommitStatus[]>;
  evidence_states_by_merge_iid?: Record<string, GitLabEvidenceState[]>;
  unowned_paths_by_merge_iid?: Record<string, string[]>;
  group_owners?: string[];
  codeowners_text?: string;
  issues?: GitLabIssue[];
  base_url?: string;
  self_managed?: boolean;
  add_trunk_validation_placeholder?: boolean;
  additional_actors?: GitLabUser[];
  fetched_at: string;
};

function actorId(user: GitLabUser): string {
  if (typeof user.id === "string" && user.id.trim() !== "") {
    return user.id;
  }
  return `gitlab-user-${user.username}`;
}

function displayName(user: GitLabUser): string {
  if (user.name && user.name.trim().length > 0) {
    return user.name;
  }
  return user.username;
}

function repositoryUrl(baseUrl: string | undefined, path: string): string | undefined {
  if (!baseUrl) {
    return undefined;
  }
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${trimmedBase}${path}`;
}

function issueUrl(baseUrl: string | undefined, path: string, issue: GitLabIssue): string | undefined {
  if (issue.web_url) {
    return issue.web_url;
  }
  if (!baseUrl) {
    return undefined;
  }
  const id = issue.iid ?? issue.id;
  return `${repositoryUrl(baseUrl, path)}/-/issues/${id}`;
}

function normalizeRepository(project: GitLabProject, fetchedAt: string): ProviderAdapterInput["repository"] {
  return {
    provider: "gitlab",
    provider_id: String(project.id),
    full_name: project.path_with_namespace,
    default_branch: project.default_branch,
    visibility: project.visibility,
    archived: project.archived ? true : undefined,
    fetched_at: fetchedAt,
  };
}

function extractWorkItemRefs(
  mr: GitLabMergeRequest,
  project: GitLabProject,
  issues: GitLabIssue[] | undefined,
  baseUrl: string | undefined,
): { refs: NormalizedWorkItemRef[]; isPartial: boolean } {
  const refs = new Map<string, NormalizedWorkItemRef>();
  let isPartial = false;
  const text = `${mr.title}\n${mr.description ?? ""}`;
  const pattern =
    /\b(?:(?:close[sd]?|closes|closed|closing|fix|fixe[sd]?|fixing|resolve[sd]?|resolving))\s+#(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const externalId = match[1];
    refs.set(externalId, { external_id: externalId, provider: "gitlab", url: undefined });
  }

  if (issues && issues.length > 0) {
    for (const ref of refs.values()) {
      const issue = issues.find((item) => String(item.iid ?? item.id) === ref.external_id);
      if (issue) {
        ref.title = issue.title;
        ref.state = issue.state === "closed" ? "closed" : "open";
        ref.url = issueUrl(baseUrl, project.path_with_namespace, issue);
      } else {
        ref.url = issueUrl(baseUrl, project.path_with_namespace, { id: ref.external_id });
        isPartial = true;
      }
    }
  } else if (refs.size > 0) {
    for (const ref of refs.values()) {
      ref.url = issueUrl(baseUrl, project.path_with_namespace, { id: ref.external_id });
    }
    isPartial = true;
  }

  return { refs: Array.from(refs.values()), isPartial };
}

function normalizeChange(
  mr: GitLabMergeRequest,
  project: GitLabProject,
  fetchedAt: string,
  issues: GitLabIssue[] | undefined,
  baseUrl: string | undefined,
): NormalizedChange {
  const providerId = String(mr.id);
  const { refs: workItemRefs, isPartial: refsPartial } = extractWorkItemRefs(mr, project, issues, baseUrl);

  let state: NormalizedChange["state"] = "open";
  if (mr.state === "merged") {
    state = "merged";
  } else if (mr.state === "closed" || mr.state === "locked") {
    state = mr.state;
  }

  return {
    provider: "gitlab",
    provider_id: providerId,
    repository_id: String(project.id),
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    state,
    author_actor_id: actorId(mr.author),
    created_at: mr.created_at,
    updated_at: mr.updated_at,
    title: mr.title,
    is_draft: mr.draft || mr.work_in_progress ? true : undefined,
    work_item_refs: workItemRefs.length > 0 ? workItemRefs : undefined,
    merged_at: mr.merged_at ?? undefined,
    closed_at: mr.closed_at ?? undefined,
    fetched_at: fetchedAt,
    is_partial: refsPartial ? true : undefined,
  };
}

function reviewStateFromApprovals(
  approvals: GitLabApprovalState | undefined,
  mr: GitLabMergeRequest,
  fetchedAt: string,
  selfManaged: boolean | undefined,
): NormalizedReviewState {
  const approvalCount = approvals?.approved_by?.length ?? 0;
  const requiredFromRules = approvals?.rules?.reduce((max, rule) => Math.max(max, rule.approvals_required ?? 0), 0) ?? 0;
  const requiredApprovalCount = approvals?.approvals_required ?? requiredFromRules ?? 0;
  const approvalsLeft = approvals?.approvals_left;

  let state: NormalizedReviewState["state"] = "awaiting_review";
  if (requiredApprovalCount === 0) {
    state = "not_required";
  } else if (approvalCount >= requiredApprovalCount || approvalsLeft === 0) {
    state = "approved";
  } else if (approvalCount > 0) {
    state = "under_review";
  }

  const reviewerIds = new Set<string>();
  const reviewerTeams = new Set<string>();

  (mr.reviewers ?? []).forEach((user) => reviewerIds.add(actorId(user)));
  (approvals?.suggested_approvers ?? []).forEach((user) => reviewerIds.add(actorId(user)));
  (approvals?.approved_by ?? []).forEach((entry) => reviewerIds.add(actorId(entry.user)));

  (approvals?.rules ?? []).forEach((rule) => {
    (rule.users ?? []).forEach((user) => reviewerIds.add(actorId(user)));
    (rule.groups ?? []).forEach((group) => {
      if (group.name) {
        reviewerTeams.add(group.name);
      } else if (group.full_path) {
        const parts = group.full_path.split("/");
        reviewerTeams.add(parts[parts.length - 1]);
      }
    });
    (rule.approved_by ?? []).forEach((entry) => reviewerIds.add(actorId(entry.user)));
  });

  const approvalTimes: string[] = [];
  approvals?.approved_by?.forEach((entry) => {
    if (entry.approved_at) {
      approvalTimes.push(entry.approved_at);
    }
  });
  const lastActivity =
    approvals?.last_activity_at ??
    (approvalTimes.length > 0 ? approvalTimes.sort().slice(-1)[0] : undefined) ??
    mr.updated_at ??
    fetchedAt;

  const asOf =
    approvals?.as_of ??
    approvals?.last_activity_at ??
    (approvalTimes.length > 0 ? approvalTimes.sort().slice(-1)[0] : undefined) ??
    mr.updated_at ??
    fetchedAt;

  const isPartial =
    selfManaged && requiredApprovalCount > 0 && reviewerIds.size === 0 ? true : undefined;

  return {
    change_id: String(mr.id),
    state,
    as_of: asOf,
    reviewer_actor_ids: Array.from(reviewerIds),
    reviewer_team_names: reviewerTeams.size > 0 ? Array.from(reviewerTeams) : undefined,
    last_activity_at: lastActivity,
    approval_count: approvalCount,
    required_approval_count: requiredApprovalCount,
    is_partial: isPartial,
  };
}

function mapPipelineState(status: GitLabPipeline["status"]): NormalizedValidationRun["state"] {
  switch (status) {
    case "success":
      return "passed";
    case "failed":
      return "failed";
    case "running":
      return "running";
    case "pending":
    case "manual":
      return "pending";
    case "canceled":
    case "skipped":
      return "skipped";
    default:
      return "pending";
  }
}

function normalizePipeline(
  pipeline: GitLabPipeline,
  scope: NormalizedValidationRun["scope"],
  changeId: string,
  fetchedAt: string,
): NormalizedValidationRun {
  const runAt = pipeline.finished_at ?? pipeline.updated_at ?? pipeline.started_at ?? fetchedAt;
  return {
    change_id: changeId,
    scope,
    state: mapPipelineState(pipeline.status),
    run_at: runAt,
    name: pipeline.name ?? pipeline.ref,
    url: pipeline.web_url ?? undefined,
    duration_seconds: pipeline.duration,
    failure_summary: pipeline.status === "failed" ? pipeline.failure_reason ?? "failure" : undefined,
  };
}

function mapStatusToState(status: GitLabCommitStatus["status"]): NormalizedValidationRun["state"] {
  switch (status) {
    case "success":
      return "passed";
    case "failed":
      return "failed";
    case "running":
      return "running";
    case "pending":
      return "pending";
    case "canceled":
      return "skipped";
    default:
      return "pending";
  }
}

function normalizeCommitStatuses(
  statuses: GitLabCommitStatus[],
  changeId: string,
  fetchedAt: string,
  scope: NormalizedValidationRun["scope"],
): NormalizedValidationRun[] {
  return statuses.map((status) => {
    const runAt = status.updated_at ?? status.created_at ?? fetchedAt;
    return {
      change_id: changeId,
      scope,
      state: mapStatusToState(status.status),
      run_at: runAt,
      name: status.name,
      url: status.target_url ?? undefined,
    };
  });
}

function normalizeMergeEvent(mr: GitLabMergeRequest): NormalizedMergeEvent | null {
  if (!mr.merged_at) {
    return null;
  }
  return {
    change_id: String(mr.id),
    merged_at: mr.merged_at,
    target_branch: mr.target_branch,
    merged_by_actor_id: mr.merged_by ? actorId(mr.merged_by) : undefined,
    merge_commit_sha: mr.merge_commit_sha ?? undefined,
  };
}

function collectActors(
  mergeRequests: GitLabMergeRequest[],
  approvalsByMerge: Record<string, GitLabApprovalState> | undefined,
  evidenceByMerge: Record<string, GitLabEvidenceState[]> | undefined,
  additionalActors: GitLabUser[] | undefined,
): NormalizedActor[] {
  const actors = new Map<string, NormalizedActor>();

  function addUser(user: GitLabUser | null | undefined) {
    if (!user) return;
    const id = actorId(user);
    if (actors.has(id)) return;
    actors.set(id, {
      provider: "gitlab",
      provider_id: id,
      display_name: displayName(user),
      provider_login: user.username,
      team_memberships: user.groups,
    });
  }

  for (const mr of mergeRequests) {
    addUser(mr.author);
    addUser(mr.merged_by ?? undefined);
    (mr.reviewers ?? []).forEach(addUser);
    const approvals = approvalsByMerge?.[String(mr.iid)];
    approvals?.approved_by?.forEach((entry) => addUser(entry.user));
    approvals?.suggested_approvers?.forEach(addUser);
    approvals?.rules?.forEach((rule) => {
      (rule.users ?? []).forEach(addUser);
      (rule.approved_by ?? []).forEach((entry) => addUser(entry.user));
    });
    evidenceByMerge?.[String(mr.iid)]?.forEach((evidence) => addUser(evidence.owner));
  }

  (additionalActors ?? []).forEach(addUser);

  return Array.from(actors.values());
}

function normalizeEvidenceStates(
  mr: GitLabMergeRequest,
  evidenceByMerge: Record<string, GitLabEvidenceState[]> | undefined,
): NormalizedEvidenceState[] {
  const evidenceStates = evidenceByMerge?.[String(mr.iid)] ?? [];
  return evidenceStates.map((evidence) => ({
    change_id: String(mr.id),
    state: evidence.state,
    as_of: evidence.as_of,
    required_types: evidence.required_types,
    owner_actor_id: evidence.owner ? actorId(evidence.owner) : undefined,
    freshness_at: evidence.freshness_at,
    is_partial: evidence.is_partial,
  }));
}

function normalizeOwnershipHints(
  project: GitLabProject,
  codeownersText: string | undefined,
  groupOwners: string[] | undefined,
  actors: NormalizedActor[],
  unownedPaths: Record<string, string[]> | undefined,
  selfManaged: boolean | undefined,
): NormalizedOwnershipHint[] {
  const hints: NormalizedOwnershipHint[] = [];
  const repositoryId = String(project.id);
  const actorByLogin = new Map<string, string>();
  const actorById = new Set<string>();

  for (const actor of actors) {
    if (actor.provider_login) {
      actorByLogin.set(actor.provider_login.toLowerCase(), actor.provider_id);
    }
    actorById.add(actor.provider_id);
  }

  if (groupOwners && groupOwners.length > 0) {
    hints.push({
      repository_id: repositoryId,
      owner_team_names: groupOwners,
      path_pattern: "*",
      source: "group_membership",
      confidence: "declared",
    });
  }

  if (codeownersText) {
    const entries = parseCodeowners(codeownersText);
    for (const entry of entries) {
      const ownerActorIds: string[] = [];
      const ownerTeamNames: string[] = [];
      let isPartial = false;
      for (const owner of entry.owners) {
        if (!owner.startsWith("@")) {
          continue;
        }
        const token = owner.slice(1);
        if (token.includes("/")) {
          const parts = token.split("/");
          ownerTeamNames.push(parts[parts.length - 1]);
        } else {
          const normalizedToken = token.toLowerCase();
          const actorIdMatch =
            actorByLogin.get(normalizedToken) || (actorById.has(token) ? token : undefined);
          if (actorIdMatch) {
            ownerActorIds.push(actorIdMatch);
          } else {
            ownerActorIds.push(`gitlab-user-${token}`);
            isPartial = true;
          }
        }
      }

      if (ownerActorIds.length > 0 || ownerTeamNames.length > 0) {
        hints.push({
          repository_id: repositoryId,
          owner_actor_ids: ownerActorIds.length > 0 ? ownerActorIds : undefined,
          owner_team_names: ownerTeamNames.length > 0 ? ownerTeamNames : undefined,
          path_pattern: entry.pattern,
          source: "codeowners",
          confidence: "declared",
          is_partial: isPartial || selfManaged ? true : undefined,
        });
      }
    }
  }

  const unmatchedPaths: string[] = [];
  if (unownedPaths) {
    for (const paths of Object.values(unownedPaths)) {
      unmatchedPaths.push(...paths);
    }
  }
  const uniqueUnmatched = Array.from(new Set(unmatchedPaths));
  for (const path of uniqueUnmatched) {
    hints.push({
      repository_id: repositoryId,
      owner_actor_ids: [],
      owner_team_names: [],
      path_pattern: path,
      source: "codeowners",
      confidence: "inferred",
      is_partial: selfManaged ? true : undefined,
    });
  }

  if (hints.length === 0) {
    hints.push({
      repository_id: repositoryId,
      owner_actor_ids: [],
      owner_team_names: [],
      path_pattern: "*",
      confidence: "inferred",
    });
  }

  return hints;
}

export function buildGitLabProviderInput(source: GitLabAdapterSource): ProviderAdapterInput {
  const { project, merge_requests: mergeRequests, fetched_at: fetchedAt } = source;
  const repo = normalizeRepository(project, fetchedAt);

  const changes = mergeRequests.map((mr) =>
    normalizeChange(mr, project, fetchedAt, source.issues, source.base_url),
  );

  const mergeEvents = mergeRequests
    .map((mr) => normalizeMergeEvent(mr))
    .filter((event): event is NormalizedMergeEvent => event !== null);

  const actors = collectActors(
    mergeRequests,
    source.approvals_by_merge_iid,
    source.evidence_states_by_merge_iid,
    source.additional_actors,
  );

  const reviewStates = mergeRequests.map((mr) =>
    reviewStateFromApprovals(source.approvals_by_merge_iid?.[String(mr.iid)], mr, fetchedAt, source.self_managed),
  );

  const validationRuns: NormalizedValidationRun[] = [];
  for (const mr of mergeRequests) {
    const changeId = String(mr.id);
    const branchPipelines = source.pipelines_by_merge_iid?.[String(mr.iid)] ?? [];
    branchPipelines.forEach((pipeline) =>
      validationRuns.push(normalizePipeline(pipeline, "branch", changeId, fetchedAt)),
    );

    if (mr.sha) {
      const statuses = source.commit_statuses_by_sha?.[mr.sha] ?? [];
      validationRuns.push(...normalizeCommitStatuses(statuses, changeId, fetchedAt, "branch"));
    }

    const trunkPipelines = source.trunk_pipelines_by_branch?.[mr.target_branch] ?? [];
    const trunkRuns = trunkPipelines.filter((pipeline) => {
      if (mr.merge_commit_sha && pipeline.sha) {
        return pipeline.sha === mr.merge_commit_sha;
      }
      if (mr.state === "merged") {
        return pipeline.pipeline_type === "trunk" || pipeline.ref === mr.target_branch;
      }
      return false;
    });

    trunkRuns.forEach((pipeline) =>
      validationRuns.push(normalizePipeline(pipeline, "trunk", changeId, fetchedAt)),
    );

    if (source.add_trunk_validation_placeholder && mr.merged_at && trunkRuns.length === 0) {
      validationRuns.push({
        change_id: changeId,
        scope: "trunk",
        state: "pending",
        run_at: fetchedAt,
        name: "post-merge-validation",
        is_partial: true,
        failure_summary: "post-merge validation evidence not available",
      });
    }
  }

  const evidenceStates = mergeRequests.flatMap((mr) =>
    normalizeEvidenceStates(mr, source.evidence_states_by_merge_iid),
  );

  const ownershipHints = normalizeOwnershipHints(
    project,
    source.codeowners_text,
    source.group_owners,
    actors,
    source.unowned_paths_by_merge_iid,
    source.self_managed,
  );

  return {
    repository: repo,
    changes,
    actors,
    review_states: reviewStates,
    validation_runs: validationRuns,
    merge_events: mergeEvents,
    evidence_states: evidenceStates,
    ownership_hints: ownershipHints,
  };
}
