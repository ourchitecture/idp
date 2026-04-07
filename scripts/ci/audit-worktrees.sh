#!/usr/bin/env bash

set -euo pipefail

WORKTREE_ROOT="${WORKTREE_ROOT:-.agents/worktrees}"
REMOTE="${REMOTE:-upstream}"
ISSUE_NUMBER="${ISSUE_NUMBER:-}"

case "${WORKTREE_ROOT}" in
  ""|/*|*..*)
    echo "WORKTREE_ROOT must be a repo-relative path inside the repository root" >&2
    exit 1
    ;;
esac

git_common_dir="$(git rev-parse --git-common-dir)"
repo_root="$(cd "${git_common_dir}/.." && pwd -P)"
worktree_root_absolute="${repo_root}/${WORKTREE_ROOT%/}"
current_top_level="$(git rev-parse --show-toplevel)"

if [[ ! -d "${worktree_root_absolute}" ]]; then
  echo "Worktree audit: no canonical worktree root found at ${WORKTREE_ROOT%/}"
  echo "overall_status=pass"
  echo "registered_worktrees=0"
  echo "filesystem_paths=0"
  echo "findings=0"
  exit 0
fi

declare -a finding_lines=()
declare -A issue_counts=()
declare -A registered_paths=()

registered_count=0
pending_path=""
pending_branch=""
pending_prunable="false"

parse_issue_number() {
  local value="$1"
  if [[ "${value}" =~ (^|[/-])issue-?([0-9]+)([/-]|$) ]]; then
    printf '%s\n' "${BASH_REMATCH[2]}"
    return 0
  fi
  if [[ "${value}" =~ (^|[/-])([0-9]+)([/-]|$) ]]; then
    printf '%s\n' "${BASH_REMATCH[2]}"
    return 0
  fi
  return 1
}

append_finding() {
  local severity="$1"
  local kind="$2"
  local details="$3"
  finding_lines+=("[${severity}] ${kind}: ${details}")
}

normalize_path() {
  local path="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "${path}"
  else
    printf '%s\n' "${path}"
  fi
}

current_top_level="$(normalize_path "${current_top_level}")"

while IFS= read -r line; do
  case "${line}" in
    path\ *)
      pending_path="$(normalize_path "${line#path }")"
      pending_branch=""
      pending_prunable="false"
      ;;
    branch\ refs/heads/*)
      pending_branch="${line#branch refs/heads/}"
      ;;
    prunable*)
      pending_prunable="true"
      ;;
    "")
      if [[ "${pending_path}" == "${worktree_root_absolute}"* ]]; then
        registered_paths["${pending_path}"]="true"
        registered_count=$((registered_count + 1))

        issue_hint="$(parse_issue_number "${pending_branch}" || parse_issue_number "${pending_path}" || true)"
        if [[ -n "${issue_hint}" ]]; then
          issue_counts["${issue_hint}"]=$(( ${issue_counts["${issue_hint}"]:-0} + 1 ))
        fi

        if [[ "${pending_prunable}" == "true" ]]; then
          append_finding "warn" "prunable-worktree" "${pending_path} (${pending_branch}) is marked prunable by git worktree."
        fi

        if [[ -n "${pending_branch}" && ! -e "${pending_path}" ]]; then
          append_finding "warn" "missing-path" "${pending_path} (${pending_branch}) is registered but missing on disk."
        fi

        if [[ -n "${pending_branch}" ]] && ! git show-ref --verify --quiet "refs/heads/${pending_branch}"; then
          append_finding "warn" "missing-branch-ref" "${pending_branch} for ${pending_path} is no longer present locally."
        fi

        if [[ -d "${pending_path}" ]]; then
          is_dirty="false"
          if [[ -n "$(git -C "${pending_path}" status --porcelain)" ]]; then
            is_dirty="true"
            append_finding "warn" "dirty-worktree" "${pending_path} (${pending_branch}) has uncommitted changes."
          fi

          if [[ -n "${pending_branch}" && "${is_dirty}" == "false" ]] && ! git show-ref --verify --quiet "refs/remotes/${REMOTE}/${pending_branch}"; then
            append_finding "warn" "likely-stale-cleanup" "${pending_path} (${pending_branch}) has no remote tracking ref under ${REMOTE}; confirm whether cleanup is pending."
          fi
        fi
      fi

      pending_path=""
      pending_branch=""
      pending_prunable="false"
      ;;
  esac
done < <(git worktree list --porcelain)

for issue_id in "${!issue_counts[@]}"; do
  if (( issue_counts["${issue_id}"] > 1 )); then
    append_finding "warn" "duplicate-issue-worktrees" "Issue #${issue_id} maps to ${issue_counts["${issue_id}"]} registered worktrees under ${WORKTREE_ROOT%/}."
  fi
done

filesystem_count=0
while IFS= read -r path; do
  filesystem_count=$((filesystem_count + 1))
  if [[ -z "${registered_paths["${path}"]:-}" ]]; then
    append_finding "warn" "filesystem-orphan" "${path} exists on disk under ${WORKTREE_ROOT%/} but is not registered with git worktree."
  fi
done < <(find "${worktree_root_absolute}" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ -n "${ISSUE_NUMBER}" ]]; then
  canonical_path=""
  while IFS='=' read -r key value; do
    case "${key}" in
      worktree_absolute)
        canonical_path="${value}"
        ;;
    esac
  done < <(
    ISSUE_NUMBER="${ISSUE_NUMBER}" \
    WORKTREE_ROOT="${WORKTREE_ROOT}" \
    bash ./scripts/ci/worktree-path.sh
  )

  if [[ -n "${registered_paths["${canonical_path}"]:-}" && "${current_top_level}" != "${canonical_path}" ]]; then
    append_finding "warn" "wrong-checkout" "A canonical issue worktree already exists for issue #${ISSUE_NUMBER} at ${canonical_path}, but the current checkout is ${current_top_level}."
  fi
fi

finding_count="${#finding_lines[@]}"
overall_status="pass"
if (( finding_count > 0 )); then
  overall_status="warn"
fi

echo "Worktree audit for ${repo_root}"
echo "Canonical root: ${WORKTREE_ROOT%/}"
echo "Registered canonical worktrees: ${registered_count}"
echo "Filesystem paths under canonical root: ${filesystem_count}"
echo "Findings: ${finding_count}"

if (( finding_count == 0 )); then
  echo
  echo "No orphaned or stale worktree findings detected."
else
  echo
  echo "Findings:"
  for line in "${finding_lines[@]}"; do
    echo "${line}"
  done
fi

echo
echo "overall_status=${overall_status}"
echo "registered_worktrees=${registered_count}"
echo "filesystem_paths=${filesystem_count}"
echo "findings=${finding_count}"
