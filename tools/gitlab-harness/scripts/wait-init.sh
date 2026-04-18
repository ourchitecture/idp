#!/bin/bash
# wait-init.sh — wait until GitLab's application initialization is complete.
#
# GitLab's /readiness endpoint passes once the process can serve HTTP, but
# the initial database seeding (root user creation) finishes asynchronously
# afterward. This script polls for root user existence via gitlab-rails runner
# before any operation that requires an initialized application.
set -euo pipefail

CONTAINER=${CONTAINER:-gitlab-harness}
COMPOSE=${COMPOSE:-docker compose -f compose.yaml}
MAX_WAIT=${MAX_WAIT:-1800}
SLEEP_SECONDS=${SLEEP_SECONDS:-10}

CHECK_SCRIPT="exit(User.find_by_username('root') ? 0 : 1)"

elapsed=0
while true; do
  if $COMPOSE exec -T "$CONTAINER" bash -lc "gitlab-rails runner \"$CHECK_SCRIPT\"" >/dev/null 2>&1; then
    echo "GitLab application initialized (root user exists)"
    exit 0
  fi
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "Timed out waiting for GitLab application init after ${elapsed}s" >&2
    exit 1
  fi
  echo "Waiting for GitLab application init... (${elapsed}s elapsed)"
  sleep "$SLEEP_SECONDS"
  elapsed=$((elapsed + SLEEP_SECONDS))
done
