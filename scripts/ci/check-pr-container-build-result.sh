#!/usr/bin/env bash
# Verify that all parallel container build jobs in PR Validate completed successfully.
# Each job result is passed via an environment variable. A result of "skipped" is
# treated as passing (the container was not in scope for this PR).
#
# Required environment variables (GitHub Actions job result strings):
#   RESULT_GO_WEB     — check-container-go-web job result
#   RESULT_GO_BFF     — check-container-go-bff job result
#   RESULT_NODE_WEB   — check-container-node-web job result
#   RESULT_NODE_BFF   — check-container-node-bff job result
#   RESULT_TESTS      — check-container-tests job result
#   RESULT_MCP        — check-container-mcp job result
#   RESULT_MOCK_OAUTH — check-container-mock-oauth job result
#
# Exit codes:
#   0 — All required checks passed or were skipped
#   1 — One or more required checks failed
set -euo pipefail

: "${RESULT_GO_WEB:?RESULT_GO_WEB is required}"
: "${RESULT_GO_BFF:?RESULT_GO_BFF is required}"
: "${RESULT_NODE_WEB:?RESULT_NODE_WEB is required}"
: "${RESULT_NODE_BFF:?RESULT_NODE_BFF is required}"
: "${RESULT_TESTS:?RESULT_TESTS is required}"
: "${RESULT_MCP:?RESULT_MCP is required}"
: "${RESULT_MOCK_OAUTH:?RESULT_MOCK_OAUTH is required}"

failed=false

for name_result in \
  "check-container-go-web:${RESULT_GO_WEB}" \
  "check-container-go-bff:${RESULT_GO_BFF}" \
  "check-container-node-web:${RESULT_NODE_WEB}" \
  "check-container-node-bff:${RESULT_NODE_BFF}" \
  "check-container-tests:${RESULT_TESTS}" \
  "check-container-mcp:${RESULT_MCP}" \
  "check-container-mock-oauth:${RESULT_MOCK_OAUTH}"; do
  name="${name_result%%:*}"
  result="${name_result#*:}"
  if [[ "${result}" != "success" && "${result}" != "skipped" ]]; then
    echo "::error::${name} failed (${result})"
    failed=true
  fi
done

if [[ "${failed}" == "true" ]]; then
  echo "::error::One or more container builds failed"
  exit 1
fi

echo "All container builds completed successfully."
