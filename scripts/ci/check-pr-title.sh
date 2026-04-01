#!/usr/bin/env bash

set -euo pipefail

PR_TITLE="${PR_TITLE:-}"
IS_TEAM_MEMBER="${IS_TEAM_MEMBER:-false}"

pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|security|revert)(\(.+\))?!?: .+$'

if [[ ! "${PR_TITLE}" =~ ${pattern} ]]; then
  if [[ "${IS_TEAM_MEMBER}" == "true" ]]; then
    echo "::error::PR title does not follow Conventional Commits format."
    echo "Expected: <type>(<scope>): <description>"
    echo "Got: ${PR_TITLE}"
    exit 1
  fi

  echo "::notice::PR title does not follow Conventional Commits format, but this is not required for external contributors. A maintainer will set the final commit message on merge."
  exit 0
fi

if [[ ${#PR_TITLE} -gt 72 ]]; then
  if [[ "${IS_TEAM_MEMBER}" == "true" ]]; then
    echo "::error::PR title exceeds 72 characters (${#PR_TITLE})."
    exit 1
  fi

  echo "::notice::PR title exceeds 72 characters (${#PR_TITLE}), but this is not enforced for external contributors."
  exit 0
fi

echo "PR title is valid: ${PR_TITLE}"
