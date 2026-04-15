import { RISK_WINDOW_HOURS } from "./thresholds";
import { degradeConfidence, resolvePrimaryTeam } from "./explain";
import type { FlowSignal } from "./types";
import type { ProviderAdapterInput } from "../types";

export function inferRiskByScope(
  input: ProviderAdapterInput,
  signals: FlowSignal[],
  now: Date,
): FlowSignal | null {
  const windowStart = now.getTime() - RISK_WINDOW_HOURS * 60 * 60 * 1000;

  const contributing = signals
    .filter((signal) => signal.id !== "risk_aggregation")
    .map((signal) => {
      const observedMs = signal.observedAt ? Date.parse(signal.observedAt) : Number.NaN;
      const service = signal.scope?.service ?? input.repository.full_name ?? input.repository.provider_id;
      const team = signal.scope?.team ?? resolvePrimaryTeam(input.ownership_hints);
      return {
        signal,
        service,
        team,
        stage: signal.scope?.stage,
        observedMs,
      };
    })
    .filter((entry) => Number.isNaN(entry.observedMs) || entry.observedMs >= windowStart);

  if (contributing.length < 3) {
    return null;
  }

  const service = contributing[0].service;
  const teams = Array.from(new Set(contributing.map((c) => c.team).filter((t): t is string => Boolean(t))));

  const stageCounts = new Map<string, number>();
  for (const entry of contributing) {
    if (entry.stage) {
      stageCounts.set(entry.stage, (stageCounts.get(entry.stage) ?? 0) + 1);
    }
  }

  const stageSummary = Array.from(stageCounts.entries())
    .map(([stage, count]) => `${stage}:${count}`)
    .join(", ");

  const confidence = degradeConfidence(
    "high",
    contributing.some((c) => c.signal.confidence === "medium" || c.signal.confidence === "low"),
  );

  const explanationParts = [
    `${contributing.length} signals within ~${RISK_WINDOW_HOURS}h for ${service}`,
  ];
  if (stageSummary.length > 0) {
    explanationParts.push(`stages ${stageSummary}`);
  }
  if (teams.length > 0) {
    explanationParts.push(`owners ${teams.join(", ")}`);
  }

  return {
    id: "risk_aggregation",
    title: "Aggregated risk by scope",
    severity: "high",
    confidence,
    explanation: explanationParts.join(" | "),
    recommendedNextAction:
      "Escalate to the accountable owner for the scope and address clustered signals before new changes.",
    relatedEntities: [
      service,
      ...teams,
      ...contributing.flatMap((entry) => entry.signal.relatedEntities ?? []),
    ],
    scope: { service, team: teams[0], stage: "aggregate" },
    observedAt: now.toISOString(),
  };
}
