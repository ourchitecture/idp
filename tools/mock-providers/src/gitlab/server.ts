import { MockHttpServer } from "../shared/server.js";
import { DEFAULT_SCENARIO, getScenario, scenarios } from "./scenarios.js";
import type { GitLabScenario } from "./scenarios.js";

export function createGitLabMockServer(): MockHttpServer & { getActiveScenario(): GitLabScenario } {
  const srv = new MockHttpServer();
  let activeScenarioId = DEFAULT_SCENARIO;

  function active(): GitLabScenario {
    return getScenario(activeScenarioId);
  }

  // Health check
  srv.get("/_mock/health", (_req, res) => {
    srv.sendJson(res, 200, { status: "ok", scenario: activeScenarioId, provider: "gitlab" });
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

  // ---- GitLab REST API v4 endpoints ----

  // GET /api/v4/projects/:id
  srv.get("/api/v4/projects/:id", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId ||
      encodeURIComponent(s.project.path_with_namespace) === params.id;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.project);
  });

  // GET /api/v4/projects/:id/merge_requests
  srv.get("/api/v4/projects/:id/merge_requests", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.merge_requests);
  });

  // GET /api/v4/projects/:id/merge_requests/:iid/approvals
  srv.get("/api/v4/projects/:id/merge_requests/:iid/approvals", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    const approval = s.approvals[params.iid];
    if (!approval) {
      srv.sendJson(res, 404, { message: "404 Not Found" });
      return;
    }
    srv.sendJson(res, 200, approval);
  });

  // GET /api/v4/projects/:id/merge_requests/:iid/pipelines
  srv.get("/api/v4/projects/:id/merge_requests/:iid/pipelines", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.mr_pipelines[params.iid] ?? []);
  });

  // GET /api/v4/projects/:id/pipelines  (query: ref=<branch>)
  srv.get("/api/v4/projects/:id/pipelines", (_req, res, params, query) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    const branch = query["ref"] ?? "";
    srv.sendJson(res, 200, s.trunk_pipelines[branch] ?? []);
  });

  // GET /api/v4/projects/:id/repository/commits/:sha/statuses
  srv.get("/api/v4/projects/:id/repository/commits/:sha/statuses", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    srv.sendJson(res, 200, s.commit_statuses[params.sha] ?? []);
  });

  // GET /api/v4/projects/:id/repository/files/CODEOWNERS/raw
  srv.get("/api/v4/projects/:id/repository/files/CODEOWNERS/raw", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    if (!s.codeowners_text) {
      srv.sendJson(res, 404, { message: "404 Not Found" });
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(s.codeowners_text);
  });

  // GET /api/v4/projects/:id/issues/:iid
  srv.get("/api/v4/projects/:id/issues/:iid", (_req, res, params) => {
    const s = active();
    const projectId = decodeURIComponent(params.id);
    const matchesId =
      String(s.project.id) === projectId ||
      s.project.path_with_namespace === projectId;
    if (!matchesId) {
      srv.sendJson(res, 404, { message: "404 Project Not Found" });
      return;
    }
    const issue = s.issues.find(
      (i) => String(i.iid ?? i.id) === params.iid || String(i.id) === params.iid,
    );
    if (!issue) {
      srv.sendJson(res, 404, { message: "404 Not Found" });
      return;
    }
    srv.sendJson(res, 200, issue);
  });

  const extended = Object.assign(srv, {
    getActiveScenario(): GitLabScenario {
      return active();
    },
  });

  return extended;
}
