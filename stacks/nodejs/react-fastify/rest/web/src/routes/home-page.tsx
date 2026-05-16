import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PortalSummaryOverview } from "../components/portal-summary-overview";
import { fetchPortalSummary } from "../lib/api-client";

export function HomePage() {
  const portalSummaryQuery = useQuery({
    queryKey: ["portal-summary"],
    queryFn: fetchPortalSummary,
  });

  return (
    <main className="portal-shell">
      <header className="portal-hero">
        <p className="portal-kicker">
          Stemix
          <span className="portal-badge">Early Alpha</span>
        </p>
        <h1>API-first status for the IDP itself.</h1>
        <p className="portal-subtitle">
          The first MVP capability is live status for IDP-owned components. The
          same BFF contract drives this home page summary, the detailed portal
          status view, the MCP status tool, and the static publisher for
          externally hosted status artifacts.
        </p>
        <div className="portal-actions">
          <Link className="portal-action" to="/status">
            View detailed status
          </Link>
          <Link className="portal-action portal-action--secondary" to="/agent-work">
            View agent work
          </Link>
        </div>
      </header>

      {portalSummaryQuery.isLoading ? (
        <section className="service-panel" aria-live="polite">
          <p className="empty-state">Loading the current IDP status summary...</p>
        </section>
      ) : null}

      {portalSummaryQuery.isError ? (
        <section className="service-panel" aria-live="assertive">
          <p className="empty-state empty-state--error">
            Unable to load the live status summary. The dedicated status route
            and static publisher both depend on `/api/portal/summary`, so this
            is a useful signal that the current runtime needs attention.
          </p>
        </section>
      ) : null}

      {portalSummaryQuery.data !== undefined ? (
        <PortalSummaryOverview compact summary={portalSummaryQuery.data} />
      ) : null}

      <section className="service-panel" role="note">
        <header>
          <div>
            <h2>Roadmap Context</h2>
            <p>
              This repo now has a concrete status slice. Plug-in and external
              system status remain roadmap items until the plug-in architecture
              and adapter contracts exist.
            </p>
          </div>
        </header>
        <p className="empty-state">
          See <a href="https://stemix.dev" rel="noopener noreferrer" className="portal-link">stemix.dev</a> for
          architecture context and use <Link to="/status" className="portal-link">the detailed status view</Link> to
          inspect the current portal runtime.
        </p>
      </section>
    </main>
  );
}
