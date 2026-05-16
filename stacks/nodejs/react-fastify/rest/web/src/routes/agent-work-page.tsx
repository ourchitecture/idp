import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AgentTaskCard } from "../components/agent-task-card";
import { fetchAgentTasks } from "../lib/api-client";

export function AgentWorkPage() {
  const agentTasksQuery = useQuery({
    queryKey: ["agent-tasks"],
    queryFn: () => fetchAgentTasks(),
  });

  return (
    <main className="portal-shell">
      <header className="portal-hero">
        <p className="portal-kicker">
          Stemix
          <span className="portal-badge">Agent Work</span>
        </p>
        <h1>Agent work insights</h1>
        <p className="portal-subtitle">
          Local-first dogfood view of goose autonomous task snapshots. Each
          card surfaces what the agent observed, why it matters, and the
          concrete next action a human can take. Fixture-backed today; live
          <code> .agent-task.json</code> snapshots from
          <code> .agents/worktrees/</code> are read automatically on BFF
          startup.
        </p>
        <div className="portal-actions">
          <Link className="portal-action portal-action--secondary" to="/">
            Back to home
          </Link>
        </div>
      </header>

      {agentTasksQuery.isLoading ? (
        <section className="service-panel" aria-live="polite">
          <p className="empty-state">Loading agent work snapshots...</p>
        </section>
      ) : null}

      {agentTasksQuery.isError ? (
        <section className="service-panel" aria-live="assertive">
          <p className="empty-state empty-state--error">
            Could not retrieve <code>/api/agent-work/tasks</code>. Confirm the
            BFF is running and that the agent-task fixture directory is
            reachable.
          </p>
        </section>
      ) : null}

      {agentTasksQuery.data !== undefined ? (
        agentTasksQuery.data.total === 0 ? (
          <section className="service-panel">
            <p className="empty-state">
              No agent tasks available yet. Drop a{" "}
              <code>.agent-task.json</code> file into{" "}
              <code>schema/fixtures/agent-tasks/</code> or{" "}
              <code>.agents/worktrees/&lt;slug&gt;/</code> and restart the BFF.
            </p>
          </section>
        ) : (
          <section className="agent-task-grid" aria-label="Agent work tasks">
            {agentTasksQuery.data.tasks.map((task) => (
              <AgentTaskCard key={task.task_id} task={task} />
            ))}
          </section>
        )
      ) : null}
    </main>
  );
}
