import type { ProviderAdapterInput } from "../types";
import type { FlowInferenceEngine, FlowInsightsResponse, InferenceContext } from "./types";

const defaultContext: InferenceContext = {
  now: new Date(),
};

function buildEmptyResponse(): FlowInsightsResponse {
  return { signals: [] };
}

export const flowInferenceEngine: FlowInferenceEngine = {
  infer(input: ProviderAdapterInput, context?: Partial<InferenceContext>): FlowInsightsResponse {
    // Future rule-based implementation will consume the normalized input to
    // produce actionable flow signals. For now, return an empty set while the
    // deterministic inference rules are implemented.
    const runtimeContext: InferenceContext = {
      ...defaultContext,
      ...context,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _input = input;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _now = runtimeContext.now;

    return buildEmptyResponse();
  },
};
