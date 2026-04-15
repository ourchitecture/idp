import { strict as assert } from "node:assert";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { flowInferenceEngine } from "./index";
import type { ProviderAdapterInput } from "../types";

const FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "schema/fixtures/provider-adapter-input",
);

function loadFixture(name: string): ProviderAdapterInput {
  const raw = fs.readFileSync(path.join(FIXTURE_DIR, `${name}.yaml`), "utf-8");
  return yaml.parse(raw) as ProviderAdapterInput;
}

function findSignal(resultId: string, signals: { id: string }[]) {
  return signals.find((signal) => signal.id === resultId);
}

test("blocked on review is inferred from GitHub fixture", () => {
  const input = loadFixture("blocked-on-review-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-02T10:00:00Z"),
  });
  const signal = findSignal("blocked_on_review", result.signals);
  assert.ok(signal, "expected blocked_on_review signal");
  assert.ok(signal?.explanation);
  assert.ok(signal?.recommendedNextAction);
});

test("trunk integration failure is inferred from GitHub fixture", () => {
  const input = loadFixture("trunk-integration-failed-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-02T10:30:00Z"),
  });
  const signal = findSignal("trunk_integration_failure", result.signals);
  assert.ok(signal, "expected trunk_integration_failure signal");
  assert.equal(signal?.severity, "high");
});

test("unclear ownership is inferred from ambiguous ownership fixture", () => {
  const input = loadFixture("unclear-ownership-ambiguous-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-07T12:00:00Z"),
  });
  const signal = findSignal("unclear_ownership", result.signals);
  assert.ok(signal, "expected unclear_ownership signal");
  assert.equal(signal?.severity, "medium");
});

test("waiting on evidence is inferred when evidence is pending", () => {
  const input = loadFixture("waiting-on-evidence-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-08T15:00:00Z"),
  });
  const signal = findSignal("waiting_on_evidence", result.signals);
  assert.ok(signal, "expected waiting_on_evidence signal");
  assert.equal(signal?.severity, "medium");
});

test("aging implementation to validation is inferred when trunk validation lags", () => {
  const input = loadFixture("aging-implementation-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-10T12:00:00Z"),
  });
  const signal = findSignal("aging_implementation", result.signals);
  assert.ok(signal, "expected aging_implementation signal");
  assert.equal(signal?.severity, "medium");
});

test("risk aggregation is inferred from clustered signals", () => {
  const input = loadFixture("risk-aggregation-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-10T16:00:00Z"),
  });
  const risk = findSignal("risk_aggregation", result.signals);
  assert.ok(risk, "expected risk_aggregation signal");
  assert.equal(risk?.severity, "high");
});

test("partial data reduces confidence", () => {
  const input = loadFixture("partial-data-github");
  const result = flowInferenceEngine.infer(input, {
    now: new Date("2026-04-05T10:00:00Z"),
  });
  assert.ok(result.signals.length > 0, "expected signals from partial data");
  for (const signal of result.signals) {
    assert.notEqual(signal.confidence, "high", `signal ${signal.id} should be reduced confidence`);
  }
});
