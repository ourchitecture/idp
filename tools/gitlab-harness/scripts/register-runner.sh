#!/bin/bash
set -euo pipefail

GITLAB_URL=${GITLAB_URL:-http://gitlab:8929}
REGISTRATION_TOKEN=${REGISTRATION_TOKEN:-}
RUNNER_NAME=${RUNNER_NAME:-gitlab-harness-runner}
RUNNER_EXECUTOR=${RUNNER_EXECUTOR:-shell}
RUNNER_TAG_LIST=${RUNNER_TAG_LIST:-gitlab-harness}
CONFIG_DIR=${CONFIG_DIR:-/etc/gitlab-runner}

if [ -f "$CONFIG_DIR/config.toml" ]; then
  exec gitlab-runner run --user=gitlab-runner --working-directory=/home/gitlab-runner
fi

if [ -z "$REGISTRATION_TOKEN" ]; then
  echo "Runner registration token is required" >&2
  exit 1
fi

until curl -sf "$GITLAB_URL/-/readiness" >/dev/null 2>&1; do
  echo "Waiting for GitLab to become ready..."
  sleep 5
done

gitlab-runner register --non-interactive \
  --url "$GITLAB_URL" \
  --registration-token "$REGISTRATION_TOKEN" \
  --name "$RUNNER_NAME" \
  --executor "$RUNNER_EXECUTOR" \
  --tag-list "$RUNNER_TAG_LIST" \
  --locked=false \
  --run-untagged=true \
  --access-level=not_protected

exec gitlab-runner run --user=gitlab-runner --working-directory=/home/gitlab-runner
