---
sidebar_position: 10
---

# Cross-Stack Equivalence

Cross-stack equivalence is the guarantee that every flow insight signal is semantically identical across every stack that ships the flow insight MVP. The [capability contract](./implementation-strategy) describes the rule; this page describes how the rule is continuously enforced against shared fixtures and what counts as a permissible difference.

## What "equivalent" means

The equivalence rules come from [ADR-0014: MVP Flow Observation Technical Foundations](../architecture/decisions/mvp-flow-observation-technical-foundations). They apply to every fixture in `schema/fixtures/provider-adapter-input/` when exercised through each stack's `/api/flow/insights` route.

Across any two stacks, for a given fixture, the following must be equal:

- **Set of signal identifiers.** Each stack must produce the same signal identifiers for the same input fixture. Missing a signal on one stack but not another is a divergence.
- **Severity intent.** For each matching signal, the severity value (`low`, `medium`, `high`) must match. Severity drives downstream UX and triage; divergence changes product behavior.
- **Confidence band.** For each matching signal, the confidence band (`low`, `medium`, `high`) must match.
- **Explanation and action presence.** If one stack provides an explanation, the other must also provide one. The same holds for recommended next action. Presence is part of the contract; wording is not.

The following are **allowed to differ**:

- **Exact wording of explanations and recommended actions.** Each stack may phrase human-readable text naturally. The contract enforces presence and intent, not text similarity.
- **Ordering of signals in the response array.** The harness compares signals by identifier, not by position.
- **Diagnostic metadata fields** (for example, generated identifiers, per-stack counters, debug fields) that are not part of the product contract.

Any other difference — a signal missing from one stack, a severity mismatch, a confidence mismatch, an explanation present on one stack but missing from the other — is classified as **divergent** and fails the check.

## How the harness runs

The harness lives at `tests/src/tools/flow-insights-equivalence.ts` and is invoked from `scripts/ci/run-flow-insights-equivalence.sh` (`make check-flow-insights-equivalence`). It runs in three phases:

1. **Boot both BFFs.** The Go BFF is started on a loopback port; the Node.js BFF is started on a disjoint loopback port. The script polls each `/readiness` endpoint until both report ready or the timeout expires.
2. **Capture signal summaries.** The harness calls `/api/flow/insights` on each BFF with the shared provider adapter fixtures as input. For each response, it extracts a `SignalSummary` per signal — identifier, severity, confidence, and booleans for explanation presence and recommended-next-action presence — and writes a stable JSON artifact per stack.
3. **Diff the captures.** The harness compares the two captures fixture-by-fixture and signal-by-signal under the rules above. Every fixture gets a verdict of `equal`, `allowed-difference`, or `divergent`. The run exits non-zero if any fixture is `divergent`, which fails the PR check.

Artifacts are written to `.tmp/flow-insights-equivalence/`:

- `go.json` — Go BFF signal summary capture
- `node.json` — Node.js BFF signal summary capture
- `diff.json` — structured diff with per-fixture verdict
- `diff.md` — human-readable summary used in CI logs

## When the check runs

The PR validation workflow gates the equivalence job on path-based change detection. The job runs when a PR modifies any of:

- Provider adapter input fixtures under `schema/fixtures/provider-adapter-input/`.
- The flow insights BFF route or inference engine in either stack (Go: `stacks/go/net-http/rest/bff/flow/*`; Node.js: `stacks/nodejs/react-fastify/rest/bff/src/routes/flow-insights*`, `stacks/nodejs/react-fastify/rest/bff/src/flow/*`).
- The harness itself (`tests/src/tools/flow-insights-equivalence.ts`) or the profile module (`tests/src/profiles/flow-insights.ts`).
- Anything that also triggers the broad `run_reference_all` bucket (for example, `Makefile` or cross-cutting test tooling).

PRs that only touch documentation or a single stack's unrelated code skip the check, keeping the PR lane fast while preserving the guarantee on every change that could move equivalence.

## Allowed-difference exceptions

The harness supports an explicit allow list for differences that the team has consciously accepted — for example, a confidence band that one stack legitimately raises or lowers based on richer local data, provided the signal is still produced on both sides. The allow list lives in the `ALLOWED_DIFFERENCES` constant in the harness source and must cite a rationale for every entry.

Adding an entry to the allow list is a contract change: it moves a previously `divergent` case to `allowed-difference`. Every entry must be justified against the equivalence rules above and reviewed on the PR that introduces it.

## Reading a failed run

When the harness reports a divergence:

1. Open `.tmp/flow-insights-equivalence/diff.md` from the failed CI run's artifacts. It lists each divergent fixture, the signal identifier in play, and which fields differ.
2. Consult `.tmp/flow-insights-equivalence/go.json` and `.tmp/flow-insights-equivalence/node.json` to see the full per-stack signal summary for context.
3. Decide the verdict:
   - If the divergence is a bug in one stack's inference, fix the stack so it emits the same intent as the other.
   - If the divergence reflects a new, defensible difference (different confidence signal available in one stack, for example), add an entry to `ALLOWED_DIFFERENCES` with a clear rationale.
   - If the fixture itself is incomplete and drives ambiguous behavior, update the fixture and note the change.

The check stays as a required PR gate so every contract-relevant change either preserves equivalence or explicitly renegotiates it.
