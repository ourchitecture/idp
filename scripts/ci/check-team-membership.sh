#!/usr/bin/env bash

set -euo pipefail

ORG="${ORG:-}"
USERNAME="${USERNAME:-}"
TEAM_SLUGS="${TEAM_SLUGS:-idp-admin,idp-maintain}"
OUTPUT_FILE="${OUTPUT_FILE:-}"

if [[ -z "${ORG}" ]]; then
  echo "ORG is required" >&2
  exit 1
fi

if [[ -z "${USERNAME}" ]]; then
  echo "USERNAME is required" >&2
  exit 1
fi

is_team_member="false"
matched_team=""

IFS=',' read -r -a teams <<< "${TEAM_SLUGS}"

for team in "${teams[@]}"; do
  team="${team// /}"
  if [[ -z "${team}" ]]; then
    continue
  fi

  api_stderr="$(mktemp)"
  if gh api \
    -H "Accept: application/vnd.github+json" \
    "orgs/${ORG}/teams/${team}/members/${USERNAME}" \
    --silent >/dev/null 2>"${api_stderr}"; then
    is_team_member="true"
    matched_team="${team}"
    rm -f "${api_stderr}"
    break
  else
    # A 404 is expected when the user is not a member. Any other error
    # (401/403 from missing scopes, 5xx, network) almost always means the
    # token cannot read organization membership — surface it loudly so the
    # failure mode is visible in workflow logs instead of silently falling
    # through to "not a member".
    if [[ -s "${api_stderr}" ]] && ! grep -q "HTTP 404" "${api_stderr}"; then
      echo "WARNING: team membership API error for '${team}' (token may lack 'read:org' scope):" >&2
      sed 's/^/  /' "${api_stderr}" >&2
    fi
    rm -f "${api_stderr}"
  fi
done

echo "Author '${USERNAME}' is team member: ${is_team_member}"
if [[ -n "${matched_team}" ]]; then
  echo "Matched team: ${matched_team}"
fi

if [[ -n "${OUTPUT_FILE}" ]]; then
  {
    printf "is_team_member=%s\n" "${is_team_member}"
    printf "matched_team=%s\n" "${matched_team}"
  } >> "${OUTPUT_FILE}"
fi
