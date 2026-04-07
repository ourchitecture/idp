#!/usr/bin/env bash

set -euo pipefail

ISSUE_NUMBER="${ISSUE_NUMBER:-}"
ISSUE_TITLE="${ISSUE_TITLE:-}"
ISSUE_SLUG="${ISSUE_SLUG:-}"
WORKTREE_ROOT="${WORKTREE_ROOT:-.agents/worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-issue}"
SLUG_MAX_LENGTH="${SLUG_MAX_LENGTH:-40}"

if [[ -z "${ISSUE_NUMBER}" ]]; then
  echo "ISSUE_NUMBER is required" >&2
  exit 1
fi

if [[ ! "${ISSUE_NUMBER}" =~ ^[0-9]+$ ]]; then
  echo "ISSUE_NUMBER must be numeric" >&2
  exit 1
fi

case "${WORKTREE_ROOT}" in
  ""|/*|*..*)
    echo "WORKTREE_ROOT must be a repo-relative path inside the repository root" >&2
    exit 1
    ;;
esac

git_common_dir="$(git rev-parse --git-common-dir)"
repo_root="$(cd "${git_common_dir}/.." && pwd -P)"
slug_source="${ISSUE_SLUG}"

if [[ -z "${slug_source}" ]]; then
  slug_source="${ISSUE_TITLE}"
fi

if [[ -z "${slug_source}" ]] && command -v gh >/dev/null 2>&1; then
  slug_source="$(gh issue view "${ISSUE_NUMBER}" --json title --jq '.title' 2>/dev/null || true)"
fi

if [[ -z "${slug_source}" ]]; then
  slug_source="work"
fi

slug="$(
  printf '%s' "${slug_source}" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
)"

if [[ -z "${slug}" ]]; then
  slug="work"
fi

if (( ${#slug} > SLUG_MAX_LENGTH )); then
  slug="${slug:0:SLUG_MAX_LENGTH}"
  slug="${slug%-}"
fi

worktree_root_relative="${WORKTREE_ROOT%/}"
worktree_relative="${worktree_root_relative}/issue-${ISSUE_NUMBER}-${slug}"
worktree_absolute="${repo_root}/${worktree_relative}"
branch_name="${BRANCH_PREFIX}/issue-${ISSUE_NUMBER}-${slug}"

case "${worktree_absolute}" in
  "${repo_root}"/*)
    ;;
  *)
    echo "Resolved worktree path escapes the repository root" >&2
    exit 1
    ;;
esac

echo "repo_root=${repo_root}"
echo "issue_number=${ISSUE_NUMBER}"
echo "slug=${slug}"
echo "worktree_root_relative=${worktree_root_relative}"
echo "worktree_relative=${worktree_relative}"
echo "worktree_absolute=${worktree_absolute}"
echo "branch_name=${branch_name}"
