#!/usr/bin/env bash

set -euo pipefail

ISSUE_NUMBER="${ISSUE_NUMBER:-}"
ISSUE_TITLE="${ISSUE_TITLE:-}"
ISSUE_SLUG="${ISSUE_SLUG:-}"
WORKTREE_ROOT="${WORKTREE_ROOT:-.agents/worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-issue}"
REMOTE="${REMOTE:-upstream}"
BASE_BRANCH="${BASE_BRANCH:-main}"

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
worktree_root_relative=""
worktree_relative=""
worktree_absolute=""
branch_name=""
slug=""

while IFS='=' read -r key value; do
  case "${key}" in
    repo_root)
      repo_root="${value}"
      ;;
    worktree_root_relative)
      worktree_root_relative="${value}"
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

if [[ "${current_top_level}" != "${repo_root}" && "${current_top_level}" != "${worktree_absolute}" ]]; then
  echo "Run worktree setup from the repository root or the matching issue worktree." >&2
  echo "Current checkout: ${current_top_level}" >&2
  echo "Expected worktree: ${worktree_absolute}" >&2
  exit 1
fi

if [[ "${current_top_level}" == "${worktree_absolute}" ]]; then
  echo "status=already-current"
  echo "issue_number=${ISSUE_NUMBER}"
  echo "slug=${slug}"
  echo "branch_name=${branch_name}"
  echo "worktree_relative=${worktree_relative}"
  echo "worktree_absolute=${worktree_absolute}"
  exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing to create or reuse an issue worktree from a dirty checkout." >&2
  echo "Commit, stash, or move the current changes before continuing." >&2
  exit 1
fi

registered_path=""
registered_branch=""
pending_path=""
pending_branch=""

while IFS= read -r line; do
  case "${line}" in
    worktree\ *|path\ *)
      pending_path="$(normalize_path "${line#* }")"
      ;;
    branch\ refs/heads/*)
      pending_branch="${line#branch refs/heads/}"
      if [[ "${pending_path}" == "${worktree_absolute}" ]]; then
        registered_path="${pending_path}"
        registered_branch="${pending_branch}"
      fi
      if [[ "${pending_branch}" == "${branch_name}" && "${pending_path}" != "${worktree_absolute}" ]]; then
        echo "Canonical branch ${branch_name} is already checked out elsewhere: ${pending_path}" >&2
        exit 1
      fi
      ;;
    "")
      pending_path=""
      pending_branch=""
      ;;
  esac
done < <(git worktree list --porcelain)

if [[ -n "${registered_path}" ]]; then
  if [[ "${registered_branch}" != "${branch_name}" ]]; then
    echo "Canonical worktree path is already registered to a different branch: ${registered_branch}" >&2
    exit 1
  fi

  echo "status=reused"
  echo "issue_number=${ISSUE_NUMBER}"
  echo "slug=${slug}"
  echo "branch_name=${branch_name}"
  echo "worktree_relative=${worktree_relative}"
  echo "worktree_absolute=${worktree_absolute}"
  exit 0
fi

if [[ -e "${worktree_absolute}" ]]; then
  echo "Canonical worktree path already exists on disk but is not registered: ${worktree_absolute}" >&2
  exit 1
fi

mkdir -p "${repo_root}/${worktree_root_relative}"

base_ref="${BASE_BRANCH}"
if git remote get-url "${REMOTE}" >/dev/null 2>&1; then
  git fetch "${REMOTE}" "${BASE_BRANCH}" >/dev/null 2>&1 || true
  if git show-ref --verify --quiet "refs/remotes/${REMOTE}/${BASE_BRANCH}"; then
    base_ref="refs/remotes/${REMOTE}/${BASE_BRANCH}"
  fi
fi

if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
  git worktree add "${worktree_absolute}" "${branch_name}" >/dev/null
else
  git worktree add -b "${branch_name}" "${worktree_absolute}" "${base_ref}" >/dev/null
fi

echo "status=created"
echo "issue_number=${ISSUE_NUMBER}"
echo "slug=${slug}"
echo "branch_name=${branch_name}"
echo "worktree_relative=${worktree_relative}"
echo "worktree_absolute=${worktree_absolute}"
echo "base_ref=${base_ref}"
