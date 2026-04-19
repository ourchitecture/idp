import { MockHttpServer } from "../shared/server.js";
import { DEFAULT_SCENARIO, getScenario, scenarios } from "./scenarios.js";
import type { GitHubScenario } from "./scenarios.js";

export function createGitHubMockServer(): MockHttpServer & { getActiveScenario(): GitHubScenario } {
  const srv = new MockHttpServer();
  let activeScenarioId = DEFAULT_SCENARIO;

  function active(): GitHubScenario {
    return getScenario(activeScenarioId);
  }

  // Health check
  srv.get("/_mock/health", (_req, res) => {
    srv.sendJson(res, 200, { status: "ok", scenario: activeScenarioId, provider: "github" });
  });

  // List available scenarios
  srv.get("/_mock/scenarios", (_req, res) => {
    srv.sendJson(
      res,
      200,
      Object.values(scenarios).map((s) => ({ id: s.id, fixture_id: s.fixture_id, description: s.description })),
    );
  });

  // Switch scenario
  srv.post("/_mock/scenario", (_req, res, _params, _query, body) => {
    let parsed: { id?: string };
    try {
      parsed = JSON.parse(body) as { id?: string };
    } catch {
      srv.sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    if (!parsed.id) {
      srv.sendJson(res, 400, { error: "missing_field", field: "id" });
      return;
    }
    try {
      getScenario(parsed.id);
    } catch {
      srv.sendJson(res, 404, {
        error: "unknown_scenario",
        id: parsed.id,
        known: Object.keys(scenarios),
      });
      return;
    }
    activeScenarioId = parsed.id;
    srv.sendJson(res, 200, { scenario: activeScenarioId });
  });

  // Reset to default scenario
  srv.post("/_mock/reset", (_req, res) => {
    activeScenarioId = DEFAULT_SCENARIO;
    srv.sendJson(res, 200, { scenario: activeScenarioId });
  });

  // ---- GitHub REST API endpoints ----

  // GET /repos/:owner/:repo
  srv.get("/repos/:owner/:repo", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.repository);
  });

  // GET /repos/:owner/:repo/pulls  (state=all implied; mock returns all)
  srv.get("/repos/:owner/:repo/pulls", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.pull_requests);
  });

  // GET /repos/:owner/:repo/pulls/:number/reviews
  srv.get("/repos/:owner/:repo/pulls/:number/reviews", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    const prNumber = parseInt(params.number, 10);
    const reviews = s.reviews[prNumber] ?? [];
    srv.sendJson(res, 200, reviews);
  });

  // GET /repos/:owner/:repo/commits/:sha/check-runs
  srv.get("/repos/:owner/:repo/commits/:sha/check-runs", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    const runs = s.check_runs[params.sha] ?? [];
    srv.sendJson(res, 200, { check_runs: runs, total_count: runs.length });
  });

  // GET /repos/:owner/:repo/commits/:sha/statuses
  srv.get("/repos/:owner/:repo/commits/:sha/statuses", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.statuses[params.sha] ?? []);
  });

  // GET /repos/:owner/:repo/actions/runs  (query: head_branch=... or head_sha=...)
  srv.get("/repos/:owner/:repo/actions/runs", (_req, res, params, query) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }

    let runs = s.workflow_runs[query.head_branch ?? ""] ?? [];

    // If filtering by head_sha, apply that filter
    if (query.head_sha) {
      const branch = Object.keys(s.workflow_runs).find((b) =>
        s.workflow_runs[b].some((r) => r.head_sha === query.head_sha),
      );
      runs = branch ? s.workflow_runs[branch].filter((r) => r.head_sha === query.head_sha) : [];
    }

    srv.sendJson(res, 200, { workflow_runs: runs, total_count: runs.length });
  });

  // GET /repos/:owner/:repo/branches/:branch/protection
  srv.get("/repos/:owner/:repo/branches/:branch/protection", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    if (!s.branch_protection) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    // Return in GitHub branch protection API shape
    const bp = s.branch_protection;
    const response: Record<string, unknown> = {};
    if (bp.required_approving_review_count !== undefined) {
      response["required_pull_request_reviews"] = {
        required_approving_review_count: bp.required_approving_review_count,
        dismiss_stale_reviews: false,
        require_code_owner_reviews: false,
      };
    }
    if (bp.required_reviewers && bp.required_reviewers.length > 0) {
      response["required_reviewers"] = bp.required_reviewers;
    }
    srv.sendJson(res, 200, response);
  });

  // GET /repos/:owner/:repo/contents/CODEOWNERS
  srv.get("/repos/:owner/:repo/contents/CODEOWNERS", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    if (!s.codeowners_text) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    const encoded = Buffer.from(s.codeowners_text).toString("base64");
    srv.sendJson(res, 200, {
      type: "file",
      encoding: "base64",
      content: encoded,
      name: "CODEOWNERS",
      path: "CODEOWNERS",
    });
  });

  // GET /repos/:owner/:repo/issues/:number
  srv.get("/repos/:owner/:repo/issues/:number", (_req, res, params) => {
    const s = active();
    if (
      s.repository.full_name.toLowerCase() !==
      `${params.owner}/${params.repo}`.toLowerCase()
    ) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    const issueNumber = parseInt(params.number, 10);
    const issue = s.issues.find((i) => i.number === issueNumber);
    if (!issue) {
      srv.sendJson(res, 404, { message: "Not Found" });
      return;
    }
    srv.sendJson(res, 200, issue);
  });

  const extended = Object.assign(srv, {
    getActiveScenario(): GitHubScenario {
      return active();
    },
  });

  return extended;
}
