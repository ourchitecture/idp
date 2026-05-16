export type AgentTaskState =
  | "worktree-claimed"
  | "planning"
  | "planning-review"
  | "implementing"
  | "impl-validation-failed"
  | "impl-validated"
  | "validating"
  | "ship"
  | "complete-local"
  | "failed"
  | "blocked";

export interface AgentTaskHeartbeat {
  state: AgentTaskState;
  updated_at: string;
}

export interface AgentTask {
  task_id: string;
  issue_number: number | null;
  state: AgentTaskState;
  slug: string;
  worktree_path: string;
  heartbeat: AgentTaskHeartbeat;
  model: string | null;
  tokens: number | null;
  cost: number | null;
  observation: string;
  why_it_matters: string;
  what_to_do: string;
}

export interface AgentTaskFilters {
  state?: string;
  slug?: string;
}

export interface AgentTaskSummary {
  task_id: string;
  issue_number: number | null;
  state: AgentTaskState;
  slug: string;
  observation: string;
  why_it_matters: string;
  what_to_do: string;
  heartbeat: AgentTaskHeartbeat;
  model: string | null;
  tokens: number | null;
  cost: number | null;
}
