import type { AgentTask, AgentTaskState } from "../lib/api-client";

type CardTone = "healthy" | "degraded" | "neutral";

function stateToTone(state: AgentTaskState): CardTone {
  switch (state) {
    case "impl-validated":
    case "ship":
    case "complete-local":
      return "healthy";
    case "impl-validation-failed":
    case "failed":
    case "blocked":
      return "degraded";
    default:
      return "neutral";
  }
}

function renderMetric(label: string, value: string | number | null): string {
  if (value === null) return `${label}: unavailable`;
  return `${label}: ${value}`;
}

type AgentTaskCardProps = {
  task: AgentTask;
};

export function AgentTaskCard({ task }: AgentTaskCardProps) {
  const tone = stateToTone(task.state);
  const issueLabel =
    task.issue_number === null ? "no issue" : `#${task.issue_number}`;

  return (
    <article
      className={`status-card agent-task-card agent-task-card--${tone}`}
      aria-label={`Agent task ${task.slug} in state ${task.state}`}
    >
      <header className="status-card__header agent-task-card__header">
        <h2>{task.slug}</h2>
        <span
          className={`portal-badge agent-task-card__badge agent-task-card__badge--${tone}`}
        >
          {task.state}
        </span>
      </header>

      <p className="status-card__subtitle agent-task-card__issue">
        Issue {issueLabel} · task <code>{task.task_id}</code>
      </p>

      <dl className="agent-task-card__insight">
        <dt>Observation</dt>
        <dd>{task.observation}</dd>
        <dt>Why it matters</dt>
        <dd>{task.why_it_matters}</dd>
        <dt>What to do</dt>
        <dd>{task.what_to_do}</dd>
      </dl>

      <footer className="agent-task-card__footer">
        <p className="agent-task-card__worktree">
          Worktree: <code>{task.worktree_path}</code>
        </p>
        <p className="agent-task-card__heartbeat">
          Heartbeat {task.heartbeat.state} at {task.heartbeat.updated_at}
        </p>
        <p className="agent-task-card__metrics" aria-label="Run metrics">
          <span>{renderMetric("Model", task.model)}</span>
          <span>{renderMetric("Tokens", task.tokens)}</span>
          <span>{renderMetric("Cost", task.cost)}</span>
        </p>
      </footer>
    </article>
  );
}
