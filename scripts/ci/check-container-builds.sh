#!/usr/bin/env bash
# Build and smoke-test container images for local triage and CI.
#
# Usage:
#   ./scripts/ci/check-container-builds.sh [name...]
#
# Available names:
#   go-web  go-bff  nodejs-web  nodejs-bff  contract-tests  mcp  mock-oauth
#
# If no names are given, all containers are built.
#
# Environment variables:
#   PARALLEL   — true (default) or false (sequential, easier to debug)
#   TAG_SUFFIX — Docker image tag suffix (default: local-check)
#   SMOKE      — true (default) or false (build only, skip smoke tests)
#
# Exit codes:
#   0 — All selected containers built (and smoke-tested) successfully
#   1 — One or more containers failed
set -euo pipefail

PARALLEL="${PARALLEL:-true}"
TAG_SUFFIX="${TAG_SUFFIX:-local-check}"
SMOKE="${SMOKE:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"

ALL_CONTAINERS=(go-web go-bff nodejs-web nodejs-bff contract-tests mcp mock-oauth)

_tag() { echo "stemix-${1}:${TAG_SUFFIX}"; }

_build() {
  local name="$1" context="$2" dockerfile="$3"
  shift 3
  DOCKER_BUILDKIT=1 docker build \
    --file "${REPO_ROOT}/${dockerfile}" \
    "$@" \
    --tag "$(_tag "${name}")" \
    "${REPO_ROOT}/${context}"
}

_smoke() {
  local name="$1"
  shift
  # remaining args are NAME=VALUE pairs forwarded to smoke-test-container.sh
  IMAGE="$(_tag "${name}")" env "$@" bash "${SCRIPT_DIR}/smoke-test-container.sh"
}

# --- container definitions ---

container_go_web() {
  _build go-web stacks/go/net-http/rest stacks/go/net-http/rest/Dockerfile \
    --build-arg SERVICE=web
  [[ "${SMOKE}" != "true" ]] && return 0
  _smoke go-web PORT="3300:3000" URL="http://localhost:3300/"
}

container_go_bff() {
  _build go-bff stacks/go/net-http/rest stacks/go/net-http/rest/Dockerfile \
    --build-arg SERVICE=bff
  [[ "${SMOKE}" != "true" ]] && return 0
  _smoke go-bff PORT="8300:8000" URL="http://localhost:8300/health"
}

container_nodejs_web() {
  _build nodejs-web . stacks/nodejs/react-fastify/rest/web/Dockerfile
  [[ "${SMOKE}" != "true" ]] && return 0
  _smoke nodejs-web \
    PORT="3400:3000" \
    URL="http://localhost:3400/" \
    DOCKER_ARGS="-e BFF_URL=http://localhost:8400"
}

container_nodejs_bff() {
  _build nodejs-bff . stacks/nodejs/react-fastify/rest/bff/Dockerfile
  [[ "${SMOKE}" != "true" ]] && return 0
  _smoke nodejs-bff PORT="8400:8000" URL="http://localhost:8400/health"
}

container_contract_tests() {
  _build contract-tests . tests/Dockerfile
}

container_mcp() {
  _build mcp tools/mcp tools/mcp/Dockerfile
  [[ "${SMOKE}" != "true" ]] && return 0
  _smoke mcp \
    PORT="8580:8080" \
    URL="http://localhost:8580/mcp" \
    CURL_METHOD="POST" \
    CURL_CONTENT_TYPE="application/json" \
    CURL_ACCEPT="application/json, text/event-stream" \
    CURL_DATA='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.0.1"}}}'
}

container_mock_oauth() {
  _build mock-oauth tools/mock-oauth tools/mock-oauth/Dockerfile
  [[ "${SMOKE}" != "true" ]] && return 0
  _smoke mock-oauth PORT="9900:9000" URL="http://localhost:9900/health" POLL_ATTEMPTS="10"
}

_dispatch() {
  case "$1" in
    go-web)         container_go_web ;;
    go-bff)         container_go_bff ;;
    nodejs-web)     container_nodejs_web ;;
    nodejs-bff)     container_nodejs_bff ;;
    contract-tests) container_contract_tests ;;
    mcp)            container_mcp ;;
    mock-oauth)     container_mock_oauth ;;
    *) echo "Unknown container: $1" >&2; exit 1 ;;
  esac
}

# determine which containers to process
if [[ $# -eq 0 ]]; then
  selected=("${ALL_CONTAINERS[@]}")
else
  selected=("$@")
  for name in "${selected[@]}"; do
    case "${name}" in
      go-web|go-bff|nodejs-web|nodejs-bff|contract-tests|mcp|mock-oauth) ;;
      *)
        echo "Unknown container name: ${name}" >&2
        echo "Available: ${ALL_CONTAINERS[*]}" >&2
        exit 1 ;;
    esac
  done
fi

echo "Containers : ${selected[*]}"
echo "Parallel   : ${PARALLEL} | Smoke: ${SMOKE} | Tag: ${TAG_SUFFIX}"
echo "---"

if [[ "${PARALLEL}" == "true" && "${#selected[@]}" -gt 1 ]]; then
  pids=()
  logfiles=()

  for i in "${!selected[@]}"; do
    name="${selected[$i]}"
    logfile="$(mktemp "/tmp/check-container-${name}-XXXXXX.log")"
    logfiles+=("${logfile}")
    _dispatch "${name}" > "${logfile}" 2>&1 &
    pids+=($!)
    echo "[START] ${name}"
  done

  failed=()
  for i in "${!selected[@]}"; do
    name="${selected[$i]}"
    if wait "${pids[$i]}"; then
      echo "[PASS]  ${name}"
    else
      echo "[FAIL]  ${name}"
      failed+=("${name}")
      echo "--- ${name} output ---"
      cat "${logfiles[$i]}"
      echo "--- end ${name} ---"
    fi
    rm -f "${logfiles[$i]}" 2>/dev/null || true
  done

  if [[ "${#failed[@]}" -gt 0 ]]; then
    echo "---"
    echo "FAILED: ${failed[*]}"
    exit 1
  fi
else
  failed=()
  for name in "${selected[@]}"; do
    echo "=== ${name} ==="
    if _dispatch "${name}"; then
      echo "[PASS] ${name}"
    else
      echo "[FAIL] ${name}"
      failed+=("${name}")
    fi
  done
  if [[ "${#failed[@]}" -gt 0 ]]; then
    echo "---"
    echo "FAILED: ${failed[*]}"
    exit 1
  fi
fi

echo "---"
echo "All selected containers passed."
