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

  if gh api \
    -H "Accept: application/vnd.github+json" \
    "orgs/${ORG}/teams/${team}/members/${USERNAME}" \
    --silent >/dev/null 2>&1; then
    is_team_member="true"
    matched_team="${team}"
    break
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
