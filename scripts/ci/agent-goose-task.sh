#!/usr/bin/env bash
# agent-goose-task.sh — local dogfood launcher for goose autonomous tasks.
#
# Creates or reuses the canonical worktree for a task, writes an initial
# .agent-task.json snapshot, and prints the goose invocation command.
# Does NOT start goose automatically — early dogfooding uses manual
# approval mode.
#
# Usage (via make):
#   make agent-goose-task ISSUE_NUMBER=123
#   make agent-goose-task TASK_DESCRIPTION="small docs update" LOCAL_ONLY=true
#
# Environment variables:
#   ISSUE_NUMBER      GitHub issue number (optional; mutually exclusive with TASK_DESCRIPTION)
#   ISSUE_TITLE       Issue title (optional; used to build the worktree slug)
#   TASK_DESCRIPTION  Free-form task description (used when no issue number is given)
#   LOCAL_ONLY        If "true", skip push/PR in the goose run (default: true)
#   REMOTE            Git remote name (default: upstream)
#   WORKTREE_ROOT     Root for worktrees (default: .agents/worktrees)

set -euo pipefail

ISSUE_NUMBER="${ISSUE_NUMBER:-}"
ISSUE_TITLE="${ISSUE_TITLE:-}"
TASK_DESCRIPTION="${TASK_DESCRIPTION:-}"
LOCAL_ONLY="${LOCAL_ONLY:-true}"
REMOTE="${REMOTE:-upstream}"
WORKTREE_ROOT="${WORKTREE_ROOT:-.agents/worktrees}"

normalize_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$1"
  else
    printf '%s\n' "$1"
  fi
}

repo_root="$(git rev-parse --show-toplevel)"
repo_root="$(normalize_path "${repo_root}")"

# ---------------------------------------------------------------------------
# Resolve task slug and description
# ---------------------------------------------------------------------------

if [[ -z "${ISSUE_NUMBER}" && -z "${TASK_DESCRIPTION}" ]]; then
  printf "ERROR: ISSUE_NUMBER or TASK_DESCRIPTION is required.\n" >&2
  printf "Usage:\n" >&2
  printf "  make agent-goose-task ISSUE_NUMBER=123\n" >&2
  printf "  make agent-goose-task TASK_DESCRIPTION=\"small docs update\"\n" >&2
  exit 1
fi

task_id=""
slug=""
worktree_abs=""

if [[ -n "${ISSUE_NUMBER}" ]]; then
  # Fetch title if not provided
  if [[ -z "${ISSUE_TITLE}" ]] && command -v gh >/dev/null 2>&1; then
    ISSUE_TITLE="$(gh issue view "${ISSUE_NUMBER}" --json title --jq '.title' 2>/dev/null || true)"
  fi

  # Build slug: issue-<number>-<title-slug>, max 40 chars
  title_slug=""
  if [[ -n "${ISSUE_TITLE}" ]]; then
    title_slug="$(printf '%s' "${ISSUE_TITLE}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')"
  fi
  raw_slug="issue-${ISSUE_NUMBER}-${title_slug}"
  slug="${raw_slug:0:40}"
  slug="${slug%-}"  # strip trailing hyphen if truncated mid-word

  task_id="goose-issue-${ISSUE_NUMBER}"
  worktree_abs="${repo_root}/${WORKTREE_ROOT}/${slug}"

  # Ensure the worktree exists
  ISSUE_NUMBER="${ISSUE_NUMBER}" ISSUE_TITLE="${ISSUE_TITLE}" \
    bash "${repo_root}/scripts/ci/worktree-ensure.sh"
else
  # Free-form: first 8 words, lowercased, hyphenated, max 40 chars
  slug="$(printf '%s' "${TASK_DESCRIPTION}" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9 ]//g' \
    | awk '{for(i=1;i<=NF&&i<=8;i++) printf "%s%s",$i,(i<NF&&i<8?"-":""); print ""}' \
    | sed 's/-\+/-/g')"
  slug="${slug:0:40}"
  slug="${slug%-}"
  task_id="goose-${slug}"
  worktree_abs="${repo_root}/${WORKTREE_ROOT}/${slug}"

  if [[ ! -d "${worktree_abs}" ]]; then
    branch="task/${slug}"
    git -C "${repo_root}" worktree add "${worktree_abs}" -b "${branch}" "${REMOTE}/main"
  fi
fi

# ---------------------------------------------------------------------------
# Write initial .agent-task.json snapshot
# ---------------------------------------------------------------------------

iso_now="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || python3 -c 'import datetime; print(datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))')"
worktree_rel="${WORKTREE_ROOT}/${slug}"

issue_number_json="null"
if [[ -n "${ISSUE_NUMBER}" ]]; then
  issue_number_json="${ISSUE_NUMBER}"
fi

description_display="${TASK_DESCRIPTION:-issue ${ISSUE_NUMBER}}"

cat > "${worktree_abs}/.agent-task.json" << SNAPSHOT
{
  "task_id": "${task_id}",
  "issue_number": ${issue_number_json},
  "state": "worktree-claimed",
  "slug": "${slug}",
  "worktree_path": "${worktree_rel}",
  "heartbeat": {
    "state": "worktree-claimed",
    "updated_at": "${iso_now}"
  },
  "model": null,
  "tokens": null,
  "cost": null,
  "observation": "Goose autonomous task started for: ${description_display}",
  "why_it_matters": "The task is active. Monitor this card to track planning, implementation, and validation progress.",
  "what_to_do": "Wait for goose to complete its work, then review the worktree at ${worktree_rel} and push the branch when ready."
}
SNAPSHOT

printf "\n"
printf "▶ Worktree ready: %s\n" "${worktree_abs}"
printf "▶ Snapshot written: %s/.agent-task.json\n" "${worktree_abs}"
printf "\n"
printf "To start goose (run in the worktree directory):\n"
printf "\n"
if [[ -n "${ISSUE_NUMBER}" ]]; then
  printf "  cd %s\n" "${worktree_abs}"
  printf "  goose run \\\n"
  printf "    --profile .agents/skills/autonomous-task/SKILL.md \\\n"
  printf "    --input \"issue #%s\" \\\n" "${ISSUE_NUMBER}"
  if [[ "${LOCAL_ONLY}" == "true" ]]; then
    printf "    --input \"local_only=true\"\n"
  fi
else
  printf "  cd %s\n" "${worktree_abs}"
  printf "  goose run \\\n"
  printf "    --profile .agents/skills/autonomous-task/SKILL.md \\\n"
  printf "    --input \"%s\" \\\n" "${TASK_DESCRIPTION}"
  if [[ "${LOCAL_ONLY}" == "true" ]]; then
    printf "    --input \"local_only=true\"\n"
  fi
fi
printf "\n"
printf "The IDP portal (/agent-work) will show this task once the BFF is restarted.\n"
printf "\n"
