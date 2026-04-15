#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

cleanup() {
  make gitlab-harness-down || true
}
trap cleanup EXIT

make gitlab-harness-up
make gitlab-harness-wait-healthy
make gitlab-harness-token
make gitlab-harness-seed

echo "GitLab harness is up and seeded. Add live adapter test commands here (GITLAB_HARNESS=1)."
