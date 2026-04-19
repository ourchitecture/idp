import { createGitHubMockServer } from "./server.js";

const port = parseInt(process.env["OUR_IDP_GITHUB_MOCK_PORT"] ?? "8601", 10);

const server = createGitHubMockServer();
await server.listen(port);

console.log(`GitHub mock provider listening on http://127.0.0.1:${port}`);
console.log(`Active scenario: ${server.getActiveScenario().id}`);
console.log("POST /_mock/scenario  {\"id\": \"<scenario>\"} to switch scenarios");
console.log("POST /_mock/reset     to reset to default scenario");
