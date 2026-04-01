#!/usr/bin/env bash

set -euo pipefail

REPO="${REPO:-}"
ISSUE_NUMBER="${ISSUE_NUMBER:-}"

if [[ -z "${REPO}" ]]; then
  echo "REPO is required" >&2
  exit 1
fi

if [[ -z "${ISSUE_NUMBER}" ]]; then
  echo "ISSUE_NUMBER is required" >&2
  exit 1
fi

labels="$(gh issue view "${ISSUE_NUMBER}" --repo "${REPO}" --json labels --jq '.labels[].name' 2>/dev/null || true)"

if ! grep -q '^ready$' <<< "${labels}"; then
  echo "Issue #${ISSUE_NUMBER} does not have the 'ready' label. Skipping."
  exit 0
fi

existing="$(gh issue view "${ISSUE_NUMBER}" --repo "${REPO}" --json comments --jq '.comments[].body' 2>/dev/null | grep -c "ready for agent processing" || true)"
if [[ "${existing}" -gt 0 ]]; then
  echo "Signal comment already posted. Skipping duplicate."
  exit 0
fi

gh issue comment "${ISSUE_NUMBER}" --repo "${REPO}" --body \
  "This issue is **ready for agent processing**. An agent can pick this up by running:

\`\`\`
/plan-work issue_number=${ISSUE_NUMBER}
\`\`\`

Or find it automatically with \`/find-work\`."

echo "Posted agent-ready signal for issue #${ISSUE_NUMBER}."
