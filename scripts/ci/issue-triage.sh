#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

REPO="${REPO:-}"
ISSUE_NUMBER="${ISSUE_NUMBER:-}"
ISSUE_BODY="${ISSUE_BODY:-}"
ISSUE_AUTHOR="${ISSUE_AUTHOR:-}"
ISSUE_ACTION="${ISSUE_ACTION:-}"
ORG="${ORG:-${REPO%%/*}}"

if [[ -z "${REPO}" ]]; then
  echo "REPO is required" >&2
  exit 1
fi

if [[ -z "${ISSUE_NUMBER}" ]]; then
  echo "ISSUE_NUMBER is required" >&2
  exit 1
fi

if [[ -z "${ISSUE_AUTHOR}" ]]; then
  echo "ISSUE_AUTHOR is required" >&2
  exit 1
fi

echo "Issue triage running for action: ${ISSUE_ACTION:-<unset>}"

extract_field() {
  local heading="$1"
  awk -v h="### ${heading}" '
    $0 == h { found=1; next }
    found && /^### / { exit }
    found && /^[[:space:]]*$/ { next }
    found { print; exit }
  ' <<< "${ISSUE_BODY}"
}

add_label() {
  gh issue edit "${ISSUE_NUMBER}" --repo "${REPO}" --add-label "$1" >/dev/null 2>&1 || true
}

remove_label() {
  gh issue edit "${ISSUE_NUMBER}" --repo "${REPO}" --remove-label "$1" >/dev/null 2>&1 || true
}

priority="$(extract_field "Priority")"
if [[ -n "${priority}" && "${priority}" =~ ^p[0-3] ]]; then
  for p in p0-critical p1-high p2-medium p3-low; do
    remove_label "${p}"
  done
  add_label "${priority}"
  echo "Applied priority: ${priority}"
fi

domain="$(extract_field "Domain")"
if [[ -n "${domain}" ]]; then
  for d in security ai mcp infrastructure plugin api ui devops docs; do
    remove_label "${d}"
  done
  add_label "${domain}"
  echo "Applied domain: ${domain}"
fi

task_type="$(extract_field "Task Type")"
if [[ -n "${task_type}" ]]; then
  for t in task spike chore design; do
    remove_label "${t}"
  done
  add_label "${task_type}"
  echo "Applied task type: ${task_type}"
fi

if grep -qiE '\[[xX]\].*suitable for autonomous AI agent' <<< "${ISSUE_BODY}"; then
  agent_checked="true"
else
  agent_checked="false"
  remove_label "agent-eligible"
fi

# Author-based ready/needs-triage assignment only runs on opened/reopened.
# On edited, we refresh form-field labels above but leave ready/needs-triage
# alone so maintainer overrides are not reverted. See AGENTS.md "Triage Model".
if [[ "${ISSUE_ACTION}" == "opened" || "${ISSUE_ACTION}" == "reopened" ]]; then
  membership_output="$(mktemp)"
  trap 'rm -f "${membership_output}"' EXIT

  ORG="${ORG}" \
  USERNAME="${ISSUE_AUTHOR}" \
  TEAM_SLUGS="idp-admin,idp-maintain" \
  OUTPUT_FILE="${membership_output}" \
  bash "${script_dir}/check-team-membership.sh"

  # shellcheck source=/dev/null
  source "${membership_output}"

  if [[ "${is_team_member}" == "true" ]]; then
    remove_label "needs-triage"
    add_label "ready"

    if [[ "${agent_checked}" == "true" ]]; then
      add_label "agent-eligible"
    fi

    echo "Issue triaged as ready (authorized author)."
  else
    remove_label "ready"
    remove_label "agent-eligible"
    add_label "needs-triage"

    if [[ "${ISSUE_ACTION}" == "opened" ]]; then
      gh issue comment "${ISSUE_NUMBER}" --repo "${REPO}" --body \
        "Thank you for opening this issue! A maintainer from \`@ourchitecture/idp-maintain\` will review and triage it before work can begin."
    fi

    echo "Issue awaiting triage (external contributor)."
  fi
else
  echo "Skipping author-membership triage on action '${ISSUE_ACTION}'; preserving existing ready/needs-triage state."
fi
