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

GITLAB_HARNESS=1 make -C stacks/go/net-http/rest check-contract-flow-insights
GITLAB_HARNESS=1 make -C stacks/nodejs/react-fastify/rest check-contract-flow-insights
