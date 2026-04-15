import type { ProviderAdapterInput } from "../types";

export type FlowSignalSeverity = "low" | "medium" | "high";
export type FlowSignalConfidence = "low" | "medium" | "high";

export interface FlowSignal {
  id: string;
  title: string;
  severity?: FlowSignalSeverity;
  confidence?: FlowSignalConfidence;
  explanation?: string;
  recommendedNextAction?: string;
  relatedEntities?: unknown[];
}

export interface FlowInsightsResponse {
  signals: FlowSignal[];
}

export interface InferenceContext {
  now: Date;
}

export interface FlowInferenceEngine {
  infer(input: ProviderAdapterInput, context?: Partial<InferenceContext>): FlowInsightsResponse;
}
