#!/usr/bin/env bash
# Verify that all required PR validation jobs completed successfully.
# Each job result is passed via an environment variable. A result of
# "skipped" is treated as passing (the job was not required for this PR).
#
# Required environment variables (GitHub Actions job result strings):
#   RESULT_DETECT          — detect-changes job result
#   RESULT_COMMIT          — validate-commit-message job result
#   RESULT_LINT_MD         — check-lint-md job result
#   RESULT_WORKFLOWS       — check-workflow-files job result
#   RESULT_STACK           — check-stack-matrix job result
#   RESULT_DOCS            — check-docs-site job result
#   RESULT_CONTAINERS      — check-container-build job result
#   RESULT_MOCK_OAUTH      — check-mock-oauth-build job result
#   RESULT_AUTH_INTEGRATION — check-auth-integration job result
#   RESULT_FLOW_INSIGHTS   — check-flow-insights-equivalence job result
#
# Exit codes:
#   0 — All required checks passed or were skipped
#   1 — One or more required checks failed
set -euo pipefail

: "${RESULT_DETECT:?RESULT_DETECT is required}"
: "${RESULT_COMMIT:?RESULT_COMMIT is required}"
: "${RESULT_LINT_MD:?RESULT_LINT_MD is required}"
: "${RESULT_WORKFLOWS:?RESULT_WORKFLOWS is required}"
: "${RESULT_STACK:?RESULT_STACK is required}"
: "${RESULT_DOCS:?RESULT_DOCS is required}"
: "${RESULT_CONTAINERS:?RESULT_CONTAINERS is required}"
: "${RESULT_MOCK_OAUTH:?RESULT_MOCK_OAUTH is required}"
: "${RESULT_AUTH_INTEGRATION:?RESULT_AUTH_INTEGRATION is required}"
: "${RESULT_FLOW_INSIGHTS:?RESULT_FLOW_INSIGHTS is required}"

failed=false

_check() {
  local name="$1"
  local result="$2"
  local require_success="${3:-false}"  # true = must be success, not just success/skipped

  if [[ "${require_success}" == "true" ]]; then
    if [[ "${result}" != "success" ]]; then
      echo "::error::${name} failed (${result})"
      failed=true
    fi
  else
    if [[ "${result}" != "success" && "${result}" != "skipped" ]]; then
      echo "::error::${name} failed (${result})"
      failed=true
    fi
  fi
}

_check "detect-changes"           "${RESULT_DETECT}"           true
_check "validate-commit-message"  "${RESULT_COMMIT}"           true
_check "check-lint-md"            "${RESULT_LINT_MD}"
_check "check-workflow-files"     "${RESULT_WORKFLOWS}"
_check "check-stack-matrix"       "${RESULT_STACK}"
_check "check-docs-site"          "${RESULT_DOCS}"
_check "check-container-build"    "${RESULT_CONTAINERS}"
_check "check-mock-oauth-build"   "${RESULT_MOCK_OAUTH}"
_check "check-auth-integration"   "${RESULT_AUTH_INTEGRATION}"
_check "check-flow-insights-equivalence" "${RESULT_FLOW_INSIGHTS}"

if [[ "${failed}" == "true" ]]; then
  exit 1
fi

echo "All required PR validation checks completed successfully."
