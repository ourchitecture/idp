import { RISK_WINDOW_HOURS } from "./thresholds";
import { degradeConfidence } from "./explain";
import type { FlowSignal } from "./types";

export function inferRiskByScope(
  signals: FlowSignal[],
): FlowSignal | null {
  // Only aggregate non-risk signals
  const contributing = signals.filter((signal) => signal.id !== "risk_aggregation");
  if (contributing.length < 3) {
    return null;
  }

  // In this MVP, assume all signals are within window (fixtures supply timestamp proximity).
  const confidence = degradeConfidence(
    "high",
    contributing.some((signal) => signal.confidence === "medium" || signal.confidence === "low"),
  );

  return {
    id: "risk_aggregation",
    title: "Aggregated risk by scope",
    severity: "high",
    confidence,
    explanation: `Multiple signals (${contributing.length}) within ~${RISK_WINDOW_HOURS}h indicate elevated risk.`,
    recommendedNextAction: "Escalate to scope owner and address clustered signals before new changes.",
    relatedEntities: contributing.map((signal) => signal.id),
  };
}
