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

  resp_file="$(mktemp)"
  err_file="$(mktemp)"

  # --include writes the HTTP status line as the first line of stdout, giving
  # us an exact status code to switch on. || true prevents set -e from aborting
  # on non-2xx responses so we can handle each code explicitly.
  gh api \
    -H "Accept: application/vnd.github+json" \
    --include \
    "orgs/${ORG}/teams/${team}/members/${USERNAME}" \
    >"${resp_file}" 2>"${err_file}" || true

  http_code="$(head -1 "${resp_file}" | awk '{print $2}')"

  case "${http_code}" in
    204)
      is_team_member="true"
      matched_team="${team}"
      rm -f "${resp_file}" "${err_file}"
      break
      ;;
    404)
      # With read:org scope a 404 is definitive: user is not in this team.
      ;;
    401|403)
      # Auth failure — the token is missing read:org scope or is invalid.
      # Emit a hard error so this is never silently misreported as non-membership.
      echo "::error::GitHub token rejected with HTTP ${http_code} for team '${team}'." \
           " Ensure GH_TOKEN has 'read:org' scope." >&2
      [[ -s "${err_file}" ]] && sed 's/^/  /' "${err_file}" >&2
      rm -f "${resp_file}" "${err_file}"
      exit 1
      ;;
    "")
      echo "::error::No HTTP response received for team '${team}'." \
           " Check network connectivity and the GH_TOKEN value." >&2
      [[ -s "${err_file}" ]] && sed 's/^/  /' "${err_file}" >&2
      rm -f "${resp_file}" "${err_file}"
      exit 1
      ;;
    *)
      echo "::warning::Unexpected HTTP ${http_code} checking team '${team}'." >&2
      [[ -s "${err_file}" ]] && sed 's/^/  /' "${err_file}" >&2
      ;;
  esac

  rm -f "${resp_file}" "${err_file}"
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
