import type { ProviderAdapterInput } from "../types";

export type FlowSignalSeverity = "low" | "medium" | "high";
export type FlowSignalConfidence = "low" | "medium" | "high";

export type FlowSignalStage =
  | "review"
  | "validation"
  | "ownership"
  | "evidence"
  | "implementation"
  | "aggregate";

export interface FlowSignalScope {
  service?: string;
  team?: string;
  stage?: FlowSignalStage;
}

export interface FlowSignal {
  id: string;
  title: string;
  severity?: FlowSignalSeverity;
  confidence?: FlowSignalConfidence;
  explanation?: string;
  recommendedNextAction?: string;
  relatedEntities?: unknown[];
  scope?: FlowSignalScope;
  observedAt?: string;
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
