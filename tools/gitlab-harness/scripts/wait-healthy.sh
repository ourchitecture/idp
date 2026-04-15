#!/bin/bash
set -euo pipefail

CONTAINER=${CONTAINER:-gitlab-harness}
MAX_WAIT=${MAX_WAIT:-600}
SLEEP_SECONDS=${SLEEP_SECONDS:-5}

elapsed=0
while true; do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || true)
  if [ "$status" = "healthy" ]; then
    echo "GitLab is healthy"
    exit 0
  fi
  if [ "$status" = "unhealthy" ]; then
    echo "GitLab reported unhealthy state" >&2
    exit 1
  fi
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "Timed out waiting for GitLab health after ${elapsed}s" >&2
    exit 1
  fi
  sleep "$SLEEP_SECONDS"
  elapsed=$((elapsed + SLEEP_SECONDS))
done
