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
make gitlab-harness-wait-init
make gitlab-harness-token
make gitlab-harness-seed

echo "GitLab harness is up and seeded."

# Run the cross-stack flow insights equivalence check in the full-env
# nightly context. The check boots both BFFs and diffs /api/flow/insights
# signal summaries for every shared fixture under the ADR-0014 rules.
# When live GitLab routing gets wired into the BFFs, the same harness will
# exercise it against the seeded scenarios without further workflow changes.
echo "Running cross-stack flow insights equivalence"
make check-flow-insights-equivalence
