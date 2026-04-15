import { inferBlockedOnReview } from "./blockedOnReview";
import { inferTrunkIntegrationFailure } from "./trunkIntegrationFailure";
import { inferUnclearOwnership } from "./unclearOwnership";
import { inferWaitingOnEvidence } from "./waitingOnEvidence";
import { inferAgingImplementation } from "./agingImplementationToValidation";
import { inferRiskByScope } from "./riskByScope";
import type { ProviderAdapterInput } from "../types";
import type { FlowInferenceEngine, FlowInsightsResponse, InferenceContext, FlowSignal } from "./types";

const defaultContext: InferenceContext = {
  now: new Date(),
};

export const flowInferenceEngine: FlowInferenceEngine = {
  infer(input: ProviderAdapterInput, context?: Partial<InferenceContext>): FlowInsightsResponse {
    const runtimeContext: InferenceContext = {
      ...defaultContext,
      ...context,
    };

    const signals: FlowSignal[] = [];

    const blocked = inferBlockedOnReview(input, runtimeContext.now);
    if (blocked) signals.push(blocked);

    const trunk = inferTrunkIntegrationFailure(input, runtimeContext.now);
    if (trunk) signals.push(trunk);

    const ownership = inferUnclearOwnership(input);
    if (ownership) signals.push(ownership);

    const evidence = inferWaitingOnEvidence(input);
    if (evidence) signals.push(evidence);

    const aging = inferAgingImplementation(input, runtimeContext.now);
    if (aging) signals.push(aging);

    const risk = inferRiskByScope(input, signals, runtimeContext.now);
    if (risk) signals.push(risk);

    return { signals };
  },
};
