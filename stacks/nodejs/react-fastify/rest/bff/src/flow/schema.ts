import { z } from "zod";

export const adapterInputSchema = z
  .object({
    repository: z
      .object({
        provider: z.string(),
        provider_id: z.string(),
        full_name: z.string(),
        default_branch: z.string(),
        fetched_at: z.string(),
      })
      .passthrough(),
    changes: z.array(z.any()),
    actors: z.array(z.any()),
    review_states: z.array(z.any()),
    validation_runs: z.array(z.any()),
    merge_events: z.array(z.any()),
    ownership_hints: z.array(z.any()),
    evidence_states: z.array(z.any()).optional(),
  })
  .strip()
  .passthrough();
