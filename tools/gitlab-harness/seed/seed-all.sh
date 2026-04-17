#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TOKEN_FILE=${TOKEN_FILE:-.secrets/gitlab-harness.token}

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Root token missing at $TOKEN_FILE. Run 'make token' after the stack is healthy." >&2
  exit 1
fi

./scripts/wait-healthy.sh

export GITLAB_HARNESS_TOKEN
GITLAB_HARNESS_TOKEN="$(cat "$TOKEN_FILE")"

ruby ./seed/run.rb
