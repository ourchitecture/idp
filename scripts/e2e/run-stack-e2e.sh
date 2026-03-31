#!/usr/bin/env bash
# run-stack-e2e.sh — End-to-end test runner for a single IDP stack.
#
# Starts the stack's web and BFF servers, polls until they are ready,
# runs the contract test suite, then stops the servers and reports the result.
#
# Usage (called from a stack Makefile via `make e2e`):
#
#   STACK_PATH=src/stacks/go/net-http/rest \
#   WEB_START_CMD="..." \
#   BFF_START_CMD="..." \
#   WEB_URL=http://127.0.0.1:3300 \
#   BFF_URL=http://127.0.0.1:8300 \
#   CONTRACT_PROFILES=core,operational \
#   ROOT_DIR=. \
#     bash scripts/e2e/run-stack-e2e.sh
#
# Required environment variables:
#   STACK_PATH        Relative path to the stack (e.g. src/stacks/go/net-http/rest)
#   WEB_START_CMD     Shell command to start the web server (runs in background)
#   BFF_START_CMD     Shell command to start the BFF server (runs in background)
#   WEB_URL           Full base URL for the web server readiness check
#   BFF_URL           Full base URL for the BFF server readiness check
#   ROOT_DIR          Repo root directory (used for npm --prefix)
#
# Optional environment variables:
#   CONTRACT_PROFILES Comma-separated contract profile names (overrides stack.json default)
#   READY_TIMEOUT     Seconds to wait for each server to become ready (default: 30)
#   READY_INTERVAL    Polling interval in seconds (default: 1)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

STACK_PATH="${STACK_PATH:?STACK_PATH is required}"
WEB_START_CMD="${WEB_START_CMD:?WEB_START_CMD is required}"
BFF_START_CMD="${BFF_START_CMD:?BFF_START_CMD is required}"
WEB_URL="${WEB_URL:?WEB_URL is required}"
BFF_URL="${BFF_URL:?BFF_URL is required}"
ROOT_DIR="${ROOT_DIR:?ROOT_DIR is required}"
CONTRACT_PROFILES="${CONTRACT_PROFILES:-}"
READY_TIMEOUT="${READY_TIMEOUT:-30}"
READY_INTERVAL="${READY_INTERVAL:-1}"

READINESS_PATH="/api/readiness"
BFF_READY_URL="${BFF_URL%/}${READINESS_PATH}"

WEB_PID=""
BFF_PID=""
RESULT=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
  printf "[e2e:%s] %s\n" "${STACK_PATH}" "$*"
}

log_section() {
  printf "\n[e2e:%s] --- %s ---\n" "${STACK_PATH}" "$*"
}

cleanup() {
  log_section "Stopping servers"
  if [[ -n "${WEB_PID}" ]]; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
    wait "${WEB_PID}" 2>/dev/null || true
    log "Web server stopped (pid ${WEB_PID})"
  fi
  if [[ -n "${BFF_PID}" ]]; then
    kill "${BFF_PID}" >/dev/null 2>&1 || true
    wait "${BFF_PID}" 2>/dev/null || true
    log "BFF server stopped (pid ${BFF_PID})"
  fi
}

# Poll a URL until it returns HTTP 2xx or the timeout is reached.
# Arguments: label url timeout interval
wait_for_ready() {
  local label="$1"
  local url="$2"
  local timeout="$3"
  local interval="$4"
  local elapsed=0

  log "Waiting for ${label} at ${url} (timeout: ${timeout}s)"

  while true; do
    # Use curl if available; fall back to wget; bail out if neither present.
    if command -v curl >/dev/null 2>&1; then
      http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${url}" 2>/dev/null || echo "000")
    elif command -v wget >/dev/null 2>&1; then
      http_status=$(wget -q --timeout=2 --server-response -O /dev/null "${url}" 2>&1 \
        | awk '/^  HTTP/{print $2}' | tail -1 || echo "000")
    else
      printf "[e2e:%s] ERROR: neither curl nor wget found; cannot poll readiness\n" "${STACK_PATH}" >&2
      return 1
    fi

    if [[ "${http_status}" =~ ^2 ]]; then
      log "${label} is ready (HTTP ${http_status}) after ${elapsed}s"
      return 0
    fi

    if [[ "${elapsed}" -ge "${timeout}" ]]; then
      printf "[e2e:%s] TIMEOUT: %s did not become ready within %ss (last HTTP status: %s)\n" \
        "${STACK_PATH}" "${label}" "${timeout}" "${http_status}" >&2
      return 1
    fi

    sleep "${interval}"
    elapsed=$(( elapsed + interval ))
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

log_section "Starting stack e2e test: ${STACK_PATH}"
log "Web URL:  ${WEB_URL}"
log "BFF URL:  ${BFF_URL}"
if [[ -n "${CONTRACT_PROFILES}" ]]; then
  log "Profiles: ${CONTRACT_PROFILES}"
fi

trap cleanup EXIT

# --- Start servers -----------------------------------------------------------

log_section "Starting servers"

eval "${BFF_START_CMD}" >/dev/null 2>&1 &
BFF_PID=$!
log "BFF server started (pid ${BFF_PID})"

eval "${WEB_START_CMD}" >/dev/null 2>&1 &
WEB_PID=$!
log "Web server started (pid ${WEB_PID})"

# --- Wait for readiness -------------------------------------------------------

log_section "Waiting for readiness"

# BFF exposes the authoritative /api/readiness endpoint.
if ! wait_for_ready "BFF readiness" "${BFF_READY_URL}" "${READY_TIMEOUT}" "${READY_INTERVAL}"; then
  printf "[e2e:%s] FAIL: BFF did not become ready — aborting test run\n" "${STACK_PATH}" >&2
  exit 1
fi

# Web server: poll root URL for any 2xx response.
if ! wait_for_ready "Web server" "${WEB_URL}/" "${READY_TIMEOUT}" "${READY_INTERVAL}"; then
  printf "[e2e:%s] FAIL: Web server did not become ready — aborting test run\n" "${STACK_PATH}" >&2
  exit 1
fi

# --- Run contract tests -------------------------------------------------------

log_section "Running contract tests"

contract_env=(
  "IDP_WEB_URL=${WEB_URL}"
  "IDP_BFF_URL=${BFF_URL}"
  "IDP_STACK_PATH=${STACK_PATH}"
)
if [[ -n "${CONTRACT_PROFILES}" ]]; then
  contract_env+=("IDP_CONTRACT_PROFILES=${CONTRACT_PROFILES}")
fi

env "${contract_env[@]}" npm --prefix "${ROOT_DIR}" run test:contract
RESULT=$?

# --- Report ------------------------------------------------------------------

log_section "Result"
if [[ "${RESULT}" -eq 0 ]]; then
  log "PASS: all contract tests passed for ${STACK_PATH}"
else
  printf "[e2e:%s] FAIL: contract tests failed for %s (exit %s)\n" \
    "${STACK_PATH}" "${STACK_PATH}" "${RESULT}" >&2
fi

exit "${RESULT}"
