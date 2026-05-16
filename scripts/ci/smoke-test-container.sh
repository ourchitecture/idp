#!/usr/bin/env bash
# Smoke-test a container image by running it and checking an HTTP endpoint.
#
# Required environment variables:
#   IMAGE        — Docker image to run (e.g. ghcr.io/org/image:tag)
#   PORT         — Host:container port mapping passed to docker run --publish (e.g. 3300:3000)
#   URL          — URL to check for HTTP 200 (e.g. http://localhost:3300/)
#
# Optional environment variables:
#   DOCKER_ARGS    — Extra arguments appended to `docker run` before the image.
#                    Word-split by the shell; avoid values containing spaces.
#                    Example: "-e BFF_URL=http://localhost:8400"
#   CURL_METHOD    — HTTP method for the request. Default: GET
#   CURL_CONTENT_TYPE — Value for the Content-Type request header. Omitted if empty.
#   CURL_ACCEPT    — Value for the Accept request header. Omitted if empty.
#   CURL_DATA      — Request body passed via --data-raw. Omitted if empty.
#   POLL_ATTEMPTS  — Number of 1-second poll attempts before declaring failure.
#                    When 0 (default), waits SLEEP_SECONDS then checks once.
#   SLEEP_SECONDS  — Seconds to sleep before the single check. Default: 2.
#
# Exit codes:
#   0 — HTTP 200 received within the allowed attempts/timeout
#   1 — Smoke test failed
set -euo pipefail

: "${IMAGE:?IMAGE is required}"
: "${PORT:?PORT is required}"
: "${URL:?URL is required}"

DOCKER_ARGS="${DOCKER_ARGS:-}"
CURL_METHOD="${CURL_METHOD:-GET}"
CURL_CONTENT_TYPE="${CURL_CONTENT_TYPE:-}"
CURL_ACCEPT="${CURL_ACCEPT:-}"
CURL_DATA="${CURL_DATA:-}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-0}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

# shellcheck disable=SC2086  # intentional word-splitting for DOCKER_ARGS
CID=$(docker run --detach --publish "${PORT}" ${DOCKER_ARGS} "${IMAGE}")
trap 'docker stop "${CID}" >/dev/null 2>&1 || true' EXIT

_curl_check() {
  local args=(--silent --output /dev/null --write-out "%{http_code}" --request "${CURL_METHOD}")
  [[ -n "${CURL_CONTENT_TYPE}" ]] && args+=(-H "Content-Type: ${CURL_CONTENT_TYPE}")
  [[ -n "${CURL_ACCEPT}" ]]       && args+=(-H "Accept: ${CURL_ACCEPT}")
  [[ -n "${CURL_DATA}" ]]         && args+=(--data-raw "${CURL_DATA}")
  curl "${args[@]}" "${URL}" || true
}

STATUS="000"
if [[ "${POLL_ATTEMPTS}" -gt 0 ]]; then
  attempt=0
  until [[ "${attempt}" -ge "${POLL_ATTEMPTS}" ]]; do
    STATUS=$(_curl_check)
    if [[ "${STATUS}" == "200" ]]; then break; fi
    sleep 1
    attempt=$((attempt + 1))
  done
  if [[ "${STATUS}" != "200" ]]; then
    echo "::error::Smoke test failed after ${attempt} attempts: HTTP ${STATUS}"
    exit 1
  fi
else
  sleep "${SLEEP_SECONDS}"
  STATUS=$(_curl_check)
  if [[ "${STATUS}" != "200" ]]; then
    echo "::error::Smoke test failed: HTTP ${STATUS}"
    exit 1
  fi
fi

echo "Smoke test passed: HTTP ${STATUS}"
