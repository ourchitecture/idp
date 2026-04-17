// Cross-stack semantic equivalence runner for the flow-insights profile.
//
// Two subcommands:
//
//   capture <bff-url> <out-file>
//     POST every fixture under schema/fixtures/provider-adapter-input/ to
//     the target BFF's /api/flow/insights endpoint and write a canonical
//     JSON summary. The summary keeps only the fields that ADR-0014 treats
//     as contract surface (signal id, severity, confidence, presence of
//     explanation and recommended next action).
//
//   diff <stack-a.json> <stack-b.json> [--out-json <path>] [--out-md <path>]
//     Compare two summaries under ADR-0014's equivalence rules and report:
//       required to match   — signal id set, severity per signal,
//                             confidence per signal
//       allowed to differ   — wording of explanation / recommendedNextAction,
//                             ordering, incidental metadata
//     Exit 0 if every per-fixture comparison is either `equal` or an
//     explicitly allowed difference; exit 1 otherwise.
//
// The summary schema is intentionally narrow so this tool does not drift
// with incidental BFF response changes. The authoritative equivalence rules
// live in docs/content/architecture/decisions/0014-mvp-flow-observation-technical-foundations.md.

import * as fs from "node:fs";
import * as path from "node:path";
import { post } from "../http";

// js-yaml is a runtime dep of the tests workspace; no bundled types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const yaml = require("js-yaml") as { load: (input: string) => unknown };

const FIXTURE_DIR = path.resolve(
  __dirname,
  "../../../schema/fixtures/provider-adapter-input",
);

const FLOW_INSIGHTS_ENDPOINT = "/api/flow/insights";

type SignalSummary = {
  id: string;
  severity: string | null;
  confidence: string | null;
  hasExplanation: boolean;
  hasRecommendedNextAction: boolean;
};

type FixtureSummary = {
  fixture: string;
  status: number;
  signals: SignalSummary[];
};

type CaptureReport = {
  bffUrl: string;
  capturedAt: string;
  fixtures: FixtureSummary[];
};

type FlowSignal = {
  id?: unknown;
  severity?: unknown;
  confidence?: unknown;
  explanation?: unknown;
  recommendedNextAction?: unknown;
};

function listFixtureIds(): string[] {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => name.replace(/\.yaml$/, ""))
    .sort();
}

function loadFixture(fixtureId: string): unknown {
  const filePath = path.join(FIXTURE_DIR, `${fixtureId}.yaml`);
  return yaml.load(fs.readFileSync(filePath, "utf-8"));
}

function normalizeSignal(raw: unknown): SignalSummary {
  const s = raw as FlowSignal;
  const id = typeof s.id === "string" ? s.id : "";
  const severity = typeof s.severity === "string" ? s.severity : null;
  const confidence = typeof s.confidence === "string" ? s.confidence : null;
  const explanation = typeof s.explanation === "string" ? s.explanation : "";
  const action =
    typeof s.recommendedNextAction === "string" ? s.recommendedNextAction : "";
  return {
    id,
    severity,
    confidence,
    hasExplanation: explanation.trim().length > 0,
    hasRecommendedNextAction: action.trim().length > 0,
  };
}

function sortSignals(signals: SignalSummary[]): SignalSummary[] {
  return [...signals].sort((a, b) => a.id.localeCompare(b.id));
}

async function captureFixture(
  bffBaseUrl: URL,
  fixtureId: string,
): Promise<FixtureSummary> {
  const fixture = loadFixture(fixtureId);
  const endpoint = new URL(FLOW_INSIGHTS_ENDPOINT, bffBaseUrl);
  const response = await post(endpoint, fixture);

  if (response.status < 200 || response.status >= 300) {
    return {
      fixture: fixtureId,
      status: response.status,
      signals: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    return {
      fixture: fixtureId,
      status: response.status,
      signals: [],
    };
  }

  const rawSignals =
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as { signals?: unknown }).signals)
      ? ((parsed as { signals: unknown[] }).signals as unknown[])
      : [];

  return {
    fixture: fixtureId,
    status: response.status,
    signals: sortSignals(rawSignals.map(normalizeSignal)),
  };
}

async function runCapture(bffUrl: string, outFile: string): Promise<void> {
  const bffBaseUrl = new URL(bffUrl);
  const fixtureIds = listFixtureIds();
  const report: CaptureReport = {
    bffUrl: bffBaseUrl.toString(),
    capturedAt: new Date().toISOString(),
    fixtures: [],
  };

  for (const fixtureId of fixtureIds) {
    // eslint-disable-next-line no-await-in-loop
    const summary = await captureFixture(bffBaseUrl, fixtureId);
    report.fixtures.push(summary);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  process.stdout.write(
    `captured ${report.fixtures.length} fixtures → ${outFile}\n`,
  );
}

// ─── diff ─────────────────────────────────────────────────────────────────

type Verdict = "equal" | "allowed-difference" | "divergent";

type FixtureVerdict = {
  fixture: string;
  verdict: Verdict;
  reasons: string[];
};

type DiffReport = {
  stackA: string;
  stackB: string;
  verdicts: FixtureVerdict[];
  divergentCount: number;
  allowedDifferenceCount: number;
  equalCount: number;
};

// Allowed differences declared up-front per ADR-0014. Any entry here MUST be
// documented in docs/content/flow/cross-stack-equivalence.md with rationale.
// The list is intentionally empty by default — any divergence must be
// explicitly added here AND to the findings doc before it counts as allowed.
const ALLOWED_DIFFERENCES: Array<{
  fixture: string;
  signalId: string;
  field: "severity" | "confidence" | "presence";
  rationale: string;
}> = [];

function loadReport(filePath: string): CaptureReport {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as CaptureReport;
}

function compareFixture(
  fixture: string,
  a: FixtureSummary | undefined,
  b: FixtureSummary | undefined,
): FixtureVerdict {
  const reasons: string[] = [];

  if (!a || !b) {
    reasons.push(
      `fixture missing from one stack (a=${!!a}, b=${!!b})`,
    );
    return { fixture, verdict: "divergent", reasons };
  }

  if (a.status !== b.status) {
    reasons.push(`http status differs: a=${a.status}, b=${b.status}`);
  }

  const aIds = new Set(a.signals.map((s) => s.id));
  const bIds = new Set(b.signals.map((s) => s.id));
  const onlyInA = [...aIds].filter((id) => !bIds.has(id));
  const onlyInB = [...bIds].filter((id) => !aIds.has(id));

  if (onlyInA.length > 0) {
    reasons.push(`only in A: ${onlyInA.join(", ")}`);
  }
  if (onlyInB.length > 0) {
    reasons.push(`only in B: ${onlyInB.join(", ")}`);
  }

  const commonIds = [...aIds].filter((id) => bIds.has(id));
  let hasAllowedOnly = reasons.length === 0;

  for (const id of commonIds) {
    const sa = a.signals.find((s) => s.id === id)!;
    const sb = b.signals.find((s) => s.id === id)!;

    if (sa.severity !== sb.severity) {
      const allowed = ALLOWED_DIFFERENCES.some(
        (d) =>
          d.fixture === fixture && d.signalId === id && d.field === "severity",
      );
      if (allowed) {
        hasAllowedOnly = true;
      } else {
        reasons.push(
          `signal ${id}: severity differs (a=${sa.severity}, b=${sb.severity})`,
        );
      }
    }
    if (sa.confidence !== sb.confidence) {
      const allowed = ALLOWED_DIFFERENCES.some(
        (d) =>
          d.fixture === fixture &&
          d.signalId === id &&
          d.field === "confidence",
      );
      if (allowed) {
        hasAllowedOnly = true;
      } else {
        reasons.push(
          `signal ${id}: confidence differs (a=${sa.confidence}, b=${sb.confidence})`,
        );
      }
    }
    if (sa.hasExplanation !== sb.hasExplanation) {
      reasons.push(
        `signal ${id}: explanation presence differs (a=${sa.hasExplanation}, b=${sb.hasExplanation})`,
      );
    }
    if (sa.hasRecommendedNextAction !== sb.hasRecommendedNextAction) {
      reasons.push(
        `signal ${id}: recommendedNextAction presence differs (a=${sa.hasRecommendedNextAction}, b=${sb.hasRecommendedNextAction})`,
      );
    }
  }

  if (reasons.length === 0) {
    return { fixture, verdict: "equal", reasons };
  }
  if (hasAllowedOnly && onlyInA.length === 0 && onlyInB.length === 0) {
    return { fixture, verdict: "allowed-difference", reasons };
  }
  return { fixture, verdict: "divergent", reasons };
}

function buildDiff(a: CaptureReport, b: CaptureReport): DiffReport {
  const fixtures = new Set<string>([
    ...a.fixtures.map((f) => f.fixture),
    ...b.fixtures.map((f) => f.fixture),
  ]);

  const verdicts: FixtureVerdict[] = [];
  for (const fixture of [...fixtures].sort()) {
    const fa = a.fixtures.find((f) => f.fixture === fixture);
    const fb = b.fixtures.find((f) => f.fixture === fixture);
    verdicts.push(compareFixture(fixture, fa, fb));
  }

  return {
    stackA: a.bffUrl,
    stackB: b.bffUrl,
    verdicts,
    divergentCount: verdicts.filter((v) => v.verdict === "divergent").length,
    allowedDifferenceCount: verdicts.filter(
      (v) => v.verdict === "allowed-difference",
    ).length,
    equalCount: verdicts.filter((v) => v.verdict === "equal").length,
  };
}

function renderMarkdown(report: DiffReport): string {
  const lines: string[] = [];
  lines.push("# Cross-stack equivalence diff");
  lines.push("");
  lines.push(`- Stack A: \`${report.stackA}\``);
  lines.push(`- Stack B: \`${report.stackB}\``);
  lines.push(`- Equal: ${report.equalCount}`);
  lines.push(`- Allowed differences: ${report.allowedDifferenceCount}`);
  lines.push(`- Divergent: ${report.divergentCount}`);
  lines.push("");
  lines.push("| Fixture | Verdict | Reasons |");
  lines.push("| --- | --- | --- |");
  for (const v of report.verdicts) {
    const reasons = v.reasons.length === 0 ? "—" : v.reasons.join("; ");
    lines.push(`| \`${v.fixture}\` | ${v.verdict} | ${reasons} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function runDiff(
  stackAFile: string,
  stackBFile: string,
  outJson: string | undefined,
  outMd: string | undefined,
): number {
  const a = loadReport(stackAFile);
  const b = loadReport(stackBFile);
  const report = buildDiff(a, b);

  if (outJson) {
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  }
  if (outMd) {
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, renderMarkdown(report), "utf-8");
  }

  process.stdout.write(renderMarkdown(report));
  return report.divergentCount === 0 ? 0 : 1;
}

// ─── argv dispatch ─────────────────────────────────────────────────────────

function usage(): string {
  return [
    "Usage:",
    "  tsx tests/src/tools/flow-insights-equivalence.ts capture <bff-url> <out-file>",
    "  tsx tests/src/tools/flow-insights-equivalence.ts diff <stack-a.json> <stack-b.json> [--out-json <path>] [--out-md <path>]",
  ].join("\n");
}

async function main(): Promise<number> {
  const [subcommand, ...rest] = process.argv.slice(2);

  if (subcommand === "capture") {
    const [bffUrl, outFile] = rest;
    if (!bffUrl || !outFile) {
      process.stderr.write(`${usage()}\n`);
      return 2;
    }
    await runCapture(bffUrl, outFile);
    return 0;
  }

  if (subcommand === "diff") {
    const positional: string[] = [];
    let outJson: string | undefined;
    let outMd: string | undefined;
    for (let i = 0; i < rest.length; i += 1) {
      const value = rest[i];
      if (value === "--out-json") {
        outJson = rest[i + 1];
        i += 1;
      } else if (value === "--out-md") {
        outMd = rest[i + 1];
        i += 1;
      } else {
        positional.push(value);
      }
    }
    const [stackA, stackB] = positional;
    if (!stackA || !stackB) {
      process.stderr.write(`${usage()}\n`);
      return 2;
    }
    return runDiff(stackA, stackB, outJson, outMd);
  }

  process.stderr.write(`${usage()}\n`);
  return 2;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`flow-insights-equivalence error: ${message}\n`);
    process.exit(1);
  });
