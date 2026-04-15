#!/usr/bin/env bash
# Verify that all required container build jobs completed successfully.
# Each job result is passed via an environment variable. A result of
# "skipped" is treated as passing (the image was not required for this PR).
#
# Required environment variables (GitHub Actions job result strings):
#   RESULT_DETECT     — detect-changes job result
#   RESULT_GO_WEB     — build-go-web job result
#   RESULT_GO_BFF     — build-go-bff job result
#   RESULT_NODE_WEB   — build-nodejs-web job result
#   RESULT_NODE_BFF   — build-nodejs-bff job result
#   RESULT_TESTS      — build-contract-tests job result
#   RESULT_MCP        — build-mcp-server job result
#   RESULT_MOCK_OAUTH — build-mock-oauth job result
#   RESULT_DEV_TOOLS  — build-dev-tools job result
#
# Exit codes:
#   0 — All required checks passed or were skipped
#   1 — One or more required checks failed
set -euo pipefail

: "${RESULT_DETECT:?RESULT_DETECT is required}"
: "${RESULT_GO_WEB:?RESULT_GO_WEB is required}"
: "${RESULT_GO_BFF:?RESULT_GO_BFF is required}"
: "${RESULT_NODE_WEB:?RESULT_NODE_WEB is required}"
: "${RESULT_NODE_BFF:?RESULT_NODE_BFF is required}"
: "${RESULT_TESTS:?RESULT_TESTS is required}"
: "${RESULT_MCP:?RESULT_MCP is required}"
: "${RESULT_MOCK_OAUTH:?RESULT_MOCK_OAUTH is required}"
: "${RESULT_DEV_TOOLS:?RESULT_DEV_TOOLS is required}"

failed=false

for name_result in \
  "detect-changes:${RESULT_DETECT}" \
  "build-go-web:${RESULT_GO_WEB}" \
  "build-go-bff:${RESULT_GO_BFF}" \
  "build-nodejs-web:${RESULT_NODE_WEB}" \
  "build-nodejs-bff:${RESULT_NODE_BFF}" \
  "build-contract-tests:${RESULT_TESTS}" \
  "build-mcp-server:${RESULT_MCP}" \
  "build-mock-oauth:${RESULT_MOCK_OAUTH}" \
  "build-dev-tools:${RESULT_DEV_TOOLS}"; do
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
