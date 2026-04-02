import fs from "node:fs/promises";
import path from "node:path";

type PortalStatus = "ok" | "degraded";
type ComponentStatus = "healthy" | "degraded";

type PortalSummary = {
  generatedAt: string;
  status: PortalStatus;
  metrics: {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
  };
  freshness: {
    maxAgeSeconds: number;
  };
  components: Array<{
    id: string;
    label: string;
    kind: "service";
    status: ComponentStatus;
    latencyMs: number;
    observedAt: string;
  }>;
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parsePortalSummary(value: unknown): PortalSummary {
  assert(typeof value === "object" && value !== null, "Portal summary must be an object");
  const candidate = value as Record<string, unknown>;

  assert(candidate.status === "ok" || candidate.status === "degraded", "Portal summary status must be 'ok' or 'degraded'");
  assert(isIsoTimestamp(candidate.generatedAt), "Portal summary generatedAt must be an ISO-8601 timestamp");

  const metrics = candidate.metrics as Record<string, unknown>;
  assert(typeof metrics === "object" && metrics !== null, "Portal summary metrics must be an object");
  assert(typeof metrics.totalComponents === "number", "metrics.totalComponents must be a number");
  assert(typeof metrics.healthyComponents === "number", "metrics.healthyComponents must be a number");
  assert(typeof metrics.degradedComponents === "number", "metrics.degradedComponents must be a number");

  const freshness = candidate.freshness as Record<string, unknown>;
  assert(typeof freshness === "object" && freshness !== null, "Portal summary freshness must be an object");
  assert(typeof freshness.maxAgeSeconds === "number", "freshness.maxAgeSeconds must be a number");

  const components = candidate.components;
  assert(Array.isArray(components) && components.length > 0, "Portal summary components must be a non-empty array");

  for (const component of components) {
    assert(typeof component === "object" && component !== null, "Each component must be an object");
    const entry = component as Record<string, unknown>;
    assert(typeof entry.id === "string" && entry.id.length > 0, "Each component must have a non-empty id");
    assert(typeof entry.label === "string" && entry.label.length > 0, "Each component must have a non-empty label");
    assert(entry.kind === "service", "Each component kind must be 'service'");
    assert(entry.status === "healthy" || entry.status === "degraded", "Each component status must be 'healthy' or 'degraded'");
    assert(typeof entry.latencyMs === "number" && entry.latencyMs >= 0, "Each component latencyMs must be a non-negative number");
    assert(isIsoTimestamp(entry.observedAt), "Each component observedAt must be an ISO-8601 timestamp");
  }

  return candidate as unknown as PortalSummary;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHtml(summary: PortalSummary): string {
  const rows = summary.components
    .map((component) => {
      const statusClass = component.status === "healthy" ? "ok" : "warn";
      return `
        <tr>
          <td>${escapeHtml(component.label)}</td>
          <td>${escapeHtml(component.id)}</td>
          <td><span class="pill ${statusClass}">${escapeHtml(component.status)}</span></td>
          <td>${component.latencyMs} ms</td>
          <td>${escapeHtml(new Date(component.observedAt).toLocaleString())}</td>
        </tr>`;
    })
    .join("");

  const title = summary.status === "ok" ? "IDP status: healthy" : "IDP status: degraded";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: "Segoe UI", sans-serif; margin: 0; background: #f5f2eb; color: #1f2a37; }
      main { max-width: 960px; margin: 0 auto; padding: 2rem 1rem 3rem; display: grid; gap: 1rem; }
      .panel { background: #fffdf8; border: 1px solid rgba(31,42,55,0.08); border-radius: 20px; padding: 1rem 1.25rem; }
      .hero h1 { margin: 0.5rem 0 0.35rem; font-size: 2rem; }
      .hero p, .panel p { color: #4f5d75; }
      .cards { display: grid; gap: 0.85rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .card { background: #fffdf8; border: 1px solid rgba(31,42,55,0.08); border-radius: 18px; padding: 1rem; }
      .card h2 { margin: 0; font-size: 0.95rem; color: #4f5d75; font-weight: 500; }
      .card strong { display: block; margin-top: 0.6rem; font-size: 1.55rem; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 0.7rem 0.4rem; border-bottom: 1px solid rgba(31,42,55,0.08); }
      th { color: #4f5d75; font-weight: 600; }
      .pill { display: inline-block; border-radius: 999px; padding: 0.18rem 0.55rem; font-size: 0.85rem; font-weight: 700; text-transform: capitalize; }
      .pill.ok { background: rgba(10,123,97,0.12); color: #0a7b61; }
      .pill.warn { background: rgba(185,87,45,0.12); color: #b9572d; }
    </style>
  </head>
  <body>
    <main>
      <section class="panel hero">
        <p>Stemix external status snapshot</p>
        <h1>${escapeHtml(title)}</h1>
        <p>This static page was generated from the live <code>/api/portal/summary</code> contract so it can be hosted independently from the interactive portal runtime.</p>
      </section>
      <section class="cards">
        <article class="card">
          <h2>Generated</h2>
          <strong>${escapeHtml(new Date(summary.generatedAt).toLocaleString())}</strong>
        </article>
        <article class="card">
          <h2>Healthy Components</h2>
          <strong>${summary.metrics.healthyComponents}</strong>
        </article>
        <article class="card">
          <h2>Degraded Components</h2>
          <strong>${summary.metrics.degradedComponents}</strong>
        </article>
        <article class="card">
          <h2>Freshness</h2>
          <strong>${summary.freshness.maxAgeSeconds}s</strong>
        </article>
      </section>
      <section class="panel">
        <h2>Observed components</h2>
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>ID</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Observed</th>
            </tr>
          </thead>
          <tbody>${rows}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
}

async function main(): Promise<void> {
  const baseUrl = process.env.IDP_BFF_URL ?? "http://127.0.0.1:8000";
  const outputDir = path.resolve(process.cwd(), process.env.STATUS_PUBLISH_DIR ?? ".tmp/status-site");

  const response = await fetch(new URL("/api/portal/summary", baseUrl), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch portal summary: HTTP ${response.status}`);
  }

  const summary = parsePortalSummary(await response.json());
  const html = renderHtml(summary);
  const json = JSON.stringify(summary, null, 2) + "\n";

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "status.json"), json, "utf8");
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");

  const [writtenJson, writtenHtml] = await Promise.all([
    fs.readFile(path.join(outputDir, "status.json"), "utf8"),
    fs.readFile(path.join(outputDir, "index.html"), "utf8"),
  ]);

  parsePortalSummary(JSON.parse(writtenJson) as unknown);
  assert(writtenHtml.includes("<table>"), "Generated HTML must include a component table");
  assert(writtenHtml.includes(summary.components[0].label), "Generated HTML must include component content");

  process.stdout.write(
    JSON.stringify({
      level: "info",
      msg: "status artifacts generated",
      outputDir,
      files: ["status.json", "index.html"],
    }) + "\n"
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    JSON.stringify({
      level: "error",
      msg: "status artifact generation failed",
      error: message,
    }) + "\n"
  );
  process.exitCode = 1;
});
