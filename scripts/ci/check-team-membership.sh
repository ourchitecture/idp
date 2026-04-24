#!/usr/bin/env bash

set -euo pipefail

ORG="${ORG:-}"
USERNAME="${USERNAME:-}"
TEAM_SLUGS="${TEAM_SLUGS:-idp-admin,idp-maintain}"
OUTPUT_FILE="${OUTPUT_FILE:-}"
MAX_RETRIES="${MAX_RETRIES:-4}"

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

# If no token is present (e.g. Dependabot PRs where Actions secrets are withheld),
# skip the API entirely and treat the author as a non-member. This is safe because
# automated bots already produce conventional commit titles.
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "::notice::GH_TOKEN is not set; skipping team membership check (defaulting to is_team_member=false)."
  echo "Author '${USERNAME}' is team member: false"
  if [[ -n "${OUTPUT_FILE}" ]]; then
    printf "is_team_member=false\n" >> "${OUTPUT_FILE}"
    printf "matched_team=\n" >> "${OUTPUT_FILE}"
  fi
  exit 0
fi

# Preflight: confirm the token can reach the API and, for classic PATs, has read:org.
# Fine-grained PATs and GitHub App tokens omit X-OAuth-Scopes; the scope check is skipped for them.
preflight_resp="$(mktemp)"
preflight_err="$(mktemp)"
if ! gh api --include user >"${preflight_resp}" 2>"${preflight_err}"; then
  echo "::error::GitHub API is unreachable or GH_TOKEN is invalid." \
       " Check network connectivity and the GH_TOKEN value." >&2
  [[ -s "${preflight_err}" ]] && sed 's/^/  /' "${preflight_err}" >&2
  rm -f "${preflight_resp}" "${preflight_err}"
  exit 1
fi
oauth_scopes="$(grep -i '^x-oauth-scopes:' "${preflight_resp}" | head -1 | cut -d: -f2- | tr -d ' \r')"
rm -f "${preflight_resp}" "${preflight_err}"

if [[ -n "${oauth_scopes}" ]]; then
  echo "Token scopes: ${oauth_scopes}"
  if ! echo "${oauth_scopes}" | grep -qE '(^|,\s*)read:org($|,|\s*$)'; then
    echo "::error::GH_TOKEN is missing 'read:org' scope (found: '${oauth_scopes}')." \
         " Team membership checks require a classic PAT with read:org." >&2
    exit 1
  fi
else
  echo "Token scopes: <not disclosed> (fine-grained PAT or GitHub App token)"
fi

IFS=',' read -r -a teams <<< "${TEAM_SLUGS}"

for team in "${teams[@]}"; do
  team="${team// /}"
  if [[ -z "${team}" ]]; then
    continue
  fi

  http_code=""
  attempt=0
  delay=2
  resp_file=""
  err_file=""

  while [[ "${attempt}" -le "${MAX_RETRIES}" ]]; do
    # Clean up temp files from the previous attempt before creating new ones.
    [[ -n "${resp_file}" ]] && rm -f "${resp_file}" "${err_file}"
    resp_file="$(mktemp)"
    err_file="$(mktemp)"

    # --include writes the HTTP status line as the first line of stdout, giving
    # us an exact status code to switch on. || true prevents set -e from aborting
    # on non-2xx responses so we can handle each code explicitly.
    # The memberships/{username} endpoint returns 200 for active members, 404 for non-members.
    gh api \
      -H "Accept: application/vnd.github+json" \
      --include \
      "orgs/${ORG}/teams/${team}/memberships/${USERNAME}" \
      >"${resp_file}" 2>"${err_file}" || true

    http_code="$(head -1 "${resp_file}" | awk '{print $2}')"

    # Retry on empty response (network failure) or 5xx server errors.
    if [[ -z "${http_code}" || "${http_code}" =~ ^5 ]]; then
      if [[ "${attempt}" -lt "${MAX_RETRIES}" ]]; then
        echo "::warning::Transient error (HTTP '${http_code}') checking team '${team}'" \
             " (attempt $((attempt + 1))/${MAX_RETRIES}); retrying in ${delay}s..." >&2
        [[ -s "${err_file}" ]] && sed 's/^/  /' "${err_file}" >&2
        sleep "${delay}"
        delay=$(( delay * 2 ))
        attempt=$(( attempt + 1 ))
        continue
      fi
    fi

    break
  done

  # resp_file/err_file hold the final attempt's output and are cleaned up below.
  # memberships/{username}: 200 = active or pending member, 404 = not a member.
  case "${http_code}" in
    200)
      # Only count active membership, not pending invitations.
      if grep -q '"state":"active"' "${resp_file}" 2>/dev/null || \
         grep -q '"state": "active"' "${resp_file}" 2>/dev/null; then
        is_team_member="true"
        matched_team="${team}"
        rm -f "${resp_file}" "${err_file}"
        break
      fi
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
      echo "::error::No HTTP response received for team '${team}' after ${MAX_RETRIES} retries." \
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
