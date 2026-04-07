#!/usr/bin/env bash

set -euo pipefail

ISSUE_NUMBER="${ISSUE_NUMBER:-}"
ISSUE_TITLE="${ISSUE_TITLE:-}"
ISSUE_SLUG="${ISSUE_SLUG:-}"
WORKTREE_ROOT="${WORKTREE_ROOT:-.agents/worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-issue}"
POST_MERGE="${POST_MERGE:-false}"

if [[ -z "${ISSUE_NUMBER}" ]]; then
  echo "ISSUE_NUMBER is required" >&2
  exit 1
fi

normalize_path() {
  local path="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "${path}"
  else
    printf '%s\n' "${path}"
  fi
}

repo_root=""
worktree_relative=""
worktree_absolute=""
branch_name=""
slug=""

while IFS='=' read -r key value; do
  case "${key}" in
    repo_root)
      repo_root="${value}"
      ;;
    worktree_relative)
      worktree_relative="${value}"
      ;;
    worktree_absolute)
      worktree_absolute="${value}"
      ;;
    branch_name)
      branch_name="${value}"
      ;;
    slug)
      slug="${value}"
      ;;
  esac
done < <(
  ISSUE_NUMBER="${ISSUE_NUMBER}" \
  ISSUE_TITLE="${ISSUE_TITLE}" \
  ISSUE_SLUG="${ISSUE_SLUG}" \
  WORKTREE_ROOT="${WORKTREE_ROOT}" \
  BRANCH_PREFIX="${BRANCH_PREFIX}" \
  bash ./scripts/ci/worktree-path.sh
)

current_top_level="$(normalize_path "$(git rev-parse --show-toplevel)")"
if [[ "${current_top_level}" == "${worktree_absolute}" ]]; then
  echo "cleanup_status=blocked-current-worktree"
  echo "issue_number=${ISSUE_NUMBER}"
  echo "branch_name=${branch_name}"
  echo "worktree_relative=${worktree_relative}"
  echo "worktree_absolute=${worktree_absolute}"
  exit 0
fi

if [[ "${POST_MERGE}" != "true" ]]; then
  echo "cleanup_status=awaiting-post-merge-confirmation"
  echo "issue_number=${ISSUE_NUMBER}"
  echo "branch_name=${branch_name}"
  echo "worktree_relative=${worktree_relative}"
  echo "worktree_absolute=${worktree_absolute}"
  exit 0
fi

registered="false"
pending_path=""
pending_branch=""

while IFS= read -r line; do
  case "${line}" in
    path\ *)
      pending_path="$(normalize_path "${line#path }")"
      ;;
    branch\ refs/heads/*)
      pending_branch="${line#branch refs/heads/}"
      if [[ "${pending_path}" == "${worktree_absolute}" && "${pending_branch}" == "${branch_name}" ]]; then
        registered="true"
      fi
      ;;
    "")
      pending_path=""
      pending_branch=""
      ;;
  esac
done < <(git worktree list --porcelain)

if [[ "${registered}" != "true" ]]; then
  echo "cleanup_status=not-found"
  echo "issue_number=${ISSUE_NUMBER}"
  echo "branch_name=${branch_name}"
  echo "worktree_relative=${worktree_relative}"
  echo "worktree_absolute=${worktree_absolute}"
  exit 0
fi

if [[ -n "$(git -C "${worktree_absolute}" status --porcelain)" ]]; then
  echo "cleanup_status=skipped-dirty"
  echo "issue_number=${ISSUE_NUMBER}"
  echo "branch_name=${branch_name}"
  echo "worktree_relative=${worktree_relative}"
  echo "worktree_absolute=${worktree_absolute}"
  exit 0
fi

git worktree remove "${worktree_absolute}" >/dev/null

branch_deleted="false"
if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
  git branch -D "${branch_name}" >/dev/null
  branch_deleted="true"
fi

path_exists="false"
if [[ -e "${worktree_absolute}" ]]; then
  path_exists="true"
fi

echo "cleanup_status=removed"
echo "issue_number=${ISSUE_NUMBER}"
echo "branch_name=${branch_name}"
echo "branch_deleted=${branch_deleted}"
echo "worktree_relative=${worktree_relative}"
echo "worktree_absolute=${worktree_absolute}"
echo "path_exists=${path_exists}"
