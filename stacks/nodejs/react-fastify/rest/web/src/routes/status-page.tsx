import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PortalSummaryOverview } from "../components/portal-summary-overview";
import { fetchPortalSummary } from "../lib/api-client";

export function StatusPage() {
  const portalSummaryQuery = useQuery({
    queryKey: ["portal-summary"],
    queryFn: fetchPortalSummary,
  });

  return (
    <main className="portal-shell">
      <header className="portal-hero">
        <p className="portal-kicker">
          Stemix
          <span className="portal-badge">Status</span>
        </p>
        <h1>Detailed IDP status</h1>
        <p className="portal-subtitle">
          This route is the in-product operational view for the MVP. It reads
          the same summary contract that the MCP adapter and static status
          publisher consume.
        </p>
        <div className="portal-actions">
          <Link className="portal-action portal-action--secondary" to="/">
            Back to home
          </Link>
        </div>
      </header>

      {portalSummaryQuery.isLoading ? (
        <section className="service-panel" aria-live="polite">
          <p className="empty-state">Loading the detailed status view...</p>
        </section>
      ) : null}

      {portalSummaryQuery.isError ? (
        <section className="service-panel" aria-live="assertive">
          <p className="empty-state empty-state--error">
            The portal could not retrieve `/api/portal/summary`. Validate the
            BFF runtime and regenerate any external static status artifacts once
            the live contract is healthy again.
          </p>
        </section>
      ) : null}

      {portalSummaryQuery.data !== undefined ? (
        <PortalSummaryOverview summary={portalSummaryQuery.data} />
      ) : null}

      <section className="service-panel">
        <header>
          <div>
            <h2>Publication Path</h2>
            <p>
              External status artifacts are generated from the same live summary
              contract and should be hosted independently from the interactive
              portal runtime.
            </p>
          </div>
        </header>
        <p className="empty-state">
          Run <code>tsx tools/status/publish-status.ts</code> from the repo root
          to emit static JSON and HTML snapshots from the current BFF status
          response.
        </p>
      </section>
    </main>
  );
}
