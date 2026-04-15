#!/usr/bin/env bash
# Delete remote branches that have zero commits ahead of the base branch and
# no associated open pull request. Writes a categorised summary to OUTPUT_FILE.
#
# Required environment variables:
#   GH_TOKEN — GitHub token with contents:write permission.
#
# Optional environment variables:
#   BASE_BRANCH     — Branch to compare against. Default: main
#   OUTPUT_FILE     — Path for the step summary. Defaults to /dev/stdout.
#                     Set to $GITHUB_STEP_SUMMARY in GitHub Actions.
#
# Exempt branches (never deleted):
#   main, master, and any branch whose name starts with "release-please--"
#
# Exit codes:
#   0 — Script completed (individual branch errors are non-fatal)
#   1 — gh CLI not found or GH_TOKEN not set
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"

if ! command -v gh &>/dev/null; then
  echo "::error::gh CLI is not installed or not in PATH"
  exit 1
fi

BASE_BRANCH="${BASE_BRANCH:-main}"
OUTPUT_FILE="${OUTPUT_FILE:-/dev/stdout}"

EXEMPT_EXACT=("main" "master")
EXEMPT_PREFIXES=("release-please--")

deleted=()
skipped_open_pr=()
skipped_commits=()

branches=$(gh api "repos/{owner}/{repo}/branches?per_page=100" --paginate -q '.[].name')

while IFS= read -r branch; do
  # Skip exempt exact matches
  exempt=false
  for exact in "${EXEMPT_EXACT[@]}"; do
    if [[ "$branch" == "$exact" ]]; then
      exempt=true
      break
    fi
  done
  $exempt && continue

  # Skip exempt prefixes
  for prefix in "${EXEMPT_PREFIXES[@]}"; do
    if [[ "$branch" == "$prefix"* ]]; then
      exempt=true
      break
    fi
  done
  $exempt && continue

  # Count commits ahead of base branch
  commit_count=$(git rev-list --count "origin/${BASE_BRANCH}..origin/${branch}" 2>/dev/null || echo "0")

  if [[ "$commit_count" -gt 0 ]]; then
    skipped_commits+=("${branch} (${commit_count} commits)")
    continue
  fi

  # Check for any open PR with this branch as head
  open_prs=$(gh pr list --head "$branch" --state open --json number -q 'length' 2>/dev/null || echo "0")

  if [[ "$open_prs" -gt 0 ]]; then
    skipped_open_pr+=("$branch")
    continue
  fi

  # Delete the orphaned branch
  gh api -X DELETE "repos/{owner}/{repo}/git/refs/heads/${branch}"
  deleted+=("$branch")

done <<< "$branches"

{
  echo "## Branch Cleanup Summary"
  echo ""
  echo "### Deleted (orphaned: zero commits ahead of \`${BASE_BRANCH}\`, no open PR)"
  if [[ ${#deleted[@]} -eq 0 ]]; then
    echo "_None_"
  else
    for b in "${deleted[@]}"; do echo "- \`${b}\`"; done
  fi
  echo ""
  echo "### Skipped (has open PR)"
  if [[ ${#skipped_open_pr[@]} -eq 0 ]]; then
    echo "_None_"
  else
    for b in "${skipped_open_pr[@]}"; do echo "- \`${b}\`"; done
  fi
  echo ""
  echo "### Skipped (has commits ahead of \`${BASE_BRANCH}\`)"
  if [[ ${#skipped_commits[@]} -eq 0 ]]; then
    echo "_None_"
  else
    for b in "${skipped_commits[@]}"; do echo "- \`${b}\`"; done
  fi
} >> "${OUTPUT_FILE}"
