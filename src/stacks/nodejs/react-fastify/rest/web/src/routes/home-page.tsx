import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusCard } from "../components/status-card";
import { ServiceList } from "../components/service-list";
import {
  fetchBffHealth,
  fetchPortalSummary,
  type PortalSummary,
} from "../lib/api-client";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toPortalStatusTone(status: PortalSummary["status"]): "healthy" | "degraded" {
  return status === "ok" ? "healthy" : "degraded";
}

export function HomePage() {
  const summaryQuery = useQuery({
    queryKey: ["portal-summary"],
    queryFn: fetchPortalSummary,
  });

  const healthQuery = useQuery({
    queryKey: ["bff-health"],
    queryFn: fetchBffHealth,
    refetchInterval: 30_000,
  });

  const isDataReady = summaryQuery.data !== undefined;

  const generatedAt = useMemo(() => {
    if (summaryQuery.data === undefined) {
      return "Waiting for BFF...";
    }

    const date = new Date(summaryQuery.data.generatedAt);
    if (Number.isNaN(date.getTime())) {
      return summaryQuery.data.generatedAt;
    }

    return dateFormatter.format(date);
  }, [summaryQuery.data]);

  return (
    <main className="portal-shell">
      <section className="portal-hero">
        <p className="portal-kicker">Intent-Driven Portal</p>
        <h1>Operational surface for intent delivery</h1>
        <p className="portal-subtitle">
          A modern React + Fastify reference stack focused on predictable contracts,
          scalable APIs, and a clear operator workflow.
        </p>
      </section>

      <section className="status-grid" aria-label="Portal status overview">
        <StatusCard
          title="Portal health"
          value={!isDataReady ? "Loading" : summaryQuery.data.status === "ok" ? "Operational" : "Degraded"}
          subtitle={`Snapshot ${generatedAt}`}
          tone={summaryQuery.data ? toPortalStatusTone(summaryQuery.data.status) : "neutral"}
        />
        <StatusCard
          title="BFF status"
          value={healthQuery.data?.status === "ok" ? "Connected" : healthQuery.error ? "Unavailable" : "Checking"}
          subtitle={healthQuery.error ? "Check Fastify service logs" : "Refreshed every 30s"}
          tone={healthQuery.data?.status === "ok" ? "healthy" : healthQuery.error ? "degraded" : "neutral"}
        />
        <StatusCard
          title="Queued intents"
          value={String(summaryQuery.data?.metrics.queuedIntents ?? "-")}
          subtitle="Pending orchestration actions"
          tone="neutral"
        />
      </section>

      <section className="service-panel" aria-label="Service dependencies">
        <header>
          <h2>Service dependencies</h2>
          <p>Observed from the BFF summary endpoint.</p>
        </header>

        <div className="service-list-wrap">
          {summaryQuery.data?.services ? <ServiceList services={summaryQuery.data.services} /> : null}

          {summaryQuery.data === undefined && summaryQuery.isLoading ? (
            <p className="empty-state">Loading service graph...</p>
          ) : null}

          {summaryQuery.error ? (
            <p className="empty-state empty-state--error">
              Unable to load portal summary. Ensure the BFF is running on port 8000
              or `OUR_IDP_API_PORT`.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
