#!/usr/bin/env bash
# run-flow-insights-equivalence.sh — Cross-stack equivalence runner.
#
# Starts the Go BFF and the Node.js BFF on disjoint loopback ports, waits
# for both to become ready, captures the canonical /api/flow/insights
# response for every shared fixture against each BFF, and diffs the two
# captures under ADR-0014's equivalence rules.
#
# Exit code is 0 when every fixture is `equal` or `allowed-difference`,
# and non-zero when any fixture is `divergent`.
#
# Usage:
#   bash scripts/ci/run-flow-insights-equivalence.sh
#
# Optional environment variables:
#   OUR_IDP_GO_BFF_HOST   Go BFF host (default: 127.0.0.1)
#   OUR_IDP_GO_BFF_PORT   Go BFF port (default: 8301)
#   OUR_IDP_NODE_BFF_HOST Node.js BFF host (default: 127.0.0.1)
#   OUR_IDP_NODE_BFF_PORT Node.js BFF port (default: 8401)
#   OUR_IDP_READY_TIMEOUT Seconds to wait for readiness (default: 120)
#   OUR_IDP_RESULTS_DIR   Directory for captured JSON and diff output
#                         (default: .tmp/flow-insights-equivalence)

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "${ROOT_DIR}"

GO_BFF_HOST="${OUR_IDP_GO_BFF_HOST:-127.0.0.1}"
GO_BFF_PORT="${OUR_IDP_GO_BFF_PORT:-8301}"
NODE_BFF_HOST="${OUR_IDP_NODE_BFF_HOST:-127.0.0.1}"
NODE_BFF_PORT="${OUR_IDP_NODE_BFF_PORT:-8401}"
READY_TIMEOUT="${OUR_IDP_READY_TIMEOUT:-120}"
READY_INTERVAL="${OUR_IDP_READY_INTERVAL:-1}"
RESULTS_DIR="${OUR_IDP_RESULTS_DIR:-.tmp/flow-insights-equivalence}"

GO_BFF_URL="http://${GO_BFF_HOST}:${GO_BFF_PORT}"
NODE_BFF_URL="http://${NODE_BFF_HOST}:${NODE_BFF_PORT}"

mkdir -p "${RESULTS_DIR}"

GO_BFF_PID=""
NODE_BFF_PID=""

log() {
  printf "[flow-insights-equivalence] %s\n" "$*"
}

cleanup() {
  log "Stopping BFFs"
  if [[ -n "${GO_BFF_PID}" ]]; then
    kill "${GO_BFF_PID}" >/dev/null 2>&1 || true
    wait "${GO_BFF_PID}" 2>/dev/null || true
  fi
  if [[ -n "${NODE_BFF_PID}" ]]; then
    kill "${NODE_BFF_PID}" >/dev/null 2>&1 || true
    wait "${NODE_BFF_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for_ready() {
  local label="$1"
  local url="$2"
  local deadline=$(( $(date +%s) + READY_TIMEOUT ))
  while (( $(date +%s) < deadline )); do
    if curl --silent --fail --max-time 5 "${url}/readiness" >/dev/null 2>&1; then
      log "${label} ready at ${url}"
      return 0
    fi
    sleep "${READY_INTERVAL}"
  done
  log "${label} failed to become ready at ${url}"
  return 1
}

log "Starting Go BFF on ${GO_BFF_URL}"
(
  export OUR_IDP_API_HOST="${GO_BFF_HOST}"
  export OUR_IDP_API_PORT="${GO_BFF_PORT}"
  export OUR_IDP_STATUS_WEB_URL="http://${GO_BFF_HOST}:3300"
  cd stacks/go/net-http/rest
  exec go run ./bff/...
) >"${RESULTS_DIR}/go-bff.log" 2>&1 &
GO_BFF_PID=$!

log "Starting Node.js BFF on ${NODE_BFF_URL}"
(
  export OUR_IDP_API_HOST="${NODE_BFF_HOST}"
  export OUR_IDP_API_PORT="${NODE_BFF_PORT}"
  export OUR_IDP_STATUS_WEB_URL="http://${NODE_BFF_HOST}:3400"
  cd stacks/nodejs/react-fastify/rest
  exec pnpm run --silent start:bff
) >"${RESULTS_DIR}/node-bff.log" 2>&1 &
NODE_BFF_PID=$!

wait_for_ready "Go BFF" "${GO_BFF_URL}"
wait_for_ready "Node.js BFF" "${NODE_BFF_URL}"

log "Capturing Go BFF signal summary"
pnpm exec tsx tests/src/tools/flow-insights-equivalence.ts \
  capture "${GO_BFF_URL}" "${RESULTS_DIR}/go.json"

log "Capturing Node.js BFF signal summary"
pnpm exec tsx tests/src/tools/flow-insights-equivalence.ts \
  capture "${NODE_BFF_URL}" "${RESULTS_DIR}/node.json"

log "Running cross-stack diff"
set +e
pnpm exec tsx tests/src/tools/flow-insights-equivalence.ts \
  diff "${RESULTS_DIR}/go.json" "${RESULTS_DIR}/node.json" \
  --out-json "${RESULTS_DIR}/diff.json" \
  --out-md "${RESULTS_DIR}/diff.md"
DIFF_EXIT=$?
set -e

if [[ "${DIFF_EXIT}" -ne 0 ]]; then
  log "Cross-stack diff failed: unacceptable divergence detected"
  log "See ${RESULTS_DIR}/diff.md for details"
  exit "${DIFF_EXIT}"
fi

log "Cross-stack equivalence check passed"
exit 0
