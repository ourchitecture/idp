import { createGitLabMockServer } from "./server.js";

const port = parseInt(process.env["OUR_IDP_GITLAB_MOCK_PORT"] ?? "8602", 10);

const server = createGitLabMockServer();
await server.listen(port);

console.log(`GitLab mock provider listening on http://127.0.0.1:${port}`);
console.log(`Active scenario: ${server.getActiveScenario().id}`);
console.log("POST /_mock/scenario  {\"id\": \"<scenario>\"} to switch scenarios");
console.log("POST /_mock/reset     to reset to default scenario");
