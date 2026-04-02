import { Link } from "react-router-dom";
import type { PortalSummary } from "../lib/api-client";
import { ServiceList } from "./service-list";
import { StatusCard } from "./status-card";

type PortalSummaryOverviewProps = {
  summary: PortalSummary;
  compact?: boolean;
};

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function describeFreshness(maxAgeSeconds: number): string {
  if (maxAgeSeconds === 0) {
    return "All observations are current.";
  }

  if (maxAgeSeconds === 1) {
    return "Oldest observation is 1 second old.";
  }

  return `Oldest observation is ${maxAgeSeconds} seconds old.`;
}

export function PortalSummaryOverview({
  summary,
  compact = false,
}: PortalSummaryOverviewProps) {
  const visibleComponents = compact ? summary.components.slice(0, 2) : summary.components;

  return (
    <>
      <section className="status-grid" aria-label="Live IDP status summary">
        <StatusCard
          title="System Status"
          value={summary.status === "ok" ? "Healthy" : "Degraded"}
          subtitle={`Snapshot generated ${formatGeneratedAt(summary.generatedAt)}`}
          tone={summary.status === "ok" ? "healthy" : "degraded"}
        />
        <StatusCard
          title="Healthy Components"
          value={String(summary.metrics.healthyComponents)}
          subtitle={`${summary.metrics.totalComponents} total components observed`}
          tone="healthy"
        />
        <StatusCard
          title="Degraded Components"
          value={String(summary.metrics.degradedComponents)}
          subtitle="Components needing investigation"
          tone={summary.metrics.degradedComponents > 0 ? "degraded" : "healthy"}
        />
        <StatusCard
          title="Freshness"
          value={`${summary.freshness.maxAgeSeconds}s`}
          subtitle={describeFreshness(summary.freshness.maxAgeSeconds)}
        />
      </section>

      <section className="service-panel" aria-label="Observed IDP components">
        <header>
          <div>
            <h2>Observed Components</h2>
            <p>
              This MVP reports IDP-owned components only. Plug-in and third-party
              system status is intentionally deferred.
            </p>
          </div>
          {compact ? (
            <Link className="portal-action" to="/status">
              Open detailed status
            </Link>
          ) : null}
        </header>

        <div className="service-list-wrap">
          <ServiceList components={visibleComponents} />
        </div>

        {compact && summary.components.length > visibleComponents.length ? (
          <p className="service-list-caption">
            Showing {visibleComponents.length} of {summary.components.length} observed components.
          </p>
        ) : null}
      </section>
    </>
  );
}
