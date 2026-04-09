#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: gh-cache-delete.sh [--id <id> | --key <key> | --all --confirm-all] [--ref <ref>] [--succeed-on-no-caches]

Options:
  --id <id>                 Delete cache by cache ID
  --key <key>               Delete cache by cache key
  --all                     Delete all caches (requires --confirm-all)
  --confirm-all             Explicit opt-in required for --all deletions
  --ref <ref>               Limit operations to a specific ref
  --succeed-on-no-caches    Exit 0 when --all finds no caches
  -h, --help                Show this help
EOF
}

CACHE_ID=""
CACHE_KEY=""
DELETE_ALL="false"
CONFIRM_ALL="false"
REF=""
SUCCEED_ON_EMPTY="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --id)
      CACHE_ID="${2:-}"
      shift 2
      ;;
    --key)
      CACHE_KEY="${2:-}"
      shift 2
      ;;
    --all)
      DELETE_ALL="true"
      shift
      ;;
    --confirm-all)
      CONFIRM_ALL="true"
      shift
      ;;
    --ref)
      REF="${2:-}"
      shift 2
      ;;
    --succeed-on-no-caches)
      SUCCEED_ON_EMPTY="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required for gh cache commands" >&2
  exit 1
fi

if [[ -n "${CACHE_ID}" && -n "${CACHE_KEY}" ]]; then
  echo "Specify only one of --id or --key" >&2
  exit 1
fi

if [[ "${DELETE_ALL}" == "true" && ( -n "${CACHE_ID}" || -n "${CACHE_KEY}" ) ]]; then
  echo "--all cannot be combined with --id or --key" >&2
  exit 1
fi

if [[ "${DELETE_ALL}" == "false" && -z "${CACHE_ID}${CACHE_KEY}" ]]; then
  echo "No target provided. Use --id, --key, or --all." >&2
  usage
  exit 1
fi

REPO="${REPO:-${GITHUB_REPOSITORY:-}}"
repo_args=()
if [[ -n "${REPO}" ]]; then
  repo_args+=(--repo "${REPO}")
fi

ref_args=()
if [[ -n "${REF}" ]]; then
  ref_args+=(--ref "${REF}")
fi

list_caches() {
  gh cache list "${repo_args[@]}" "${ref_args[@]}" --json id,key,ref,sizeInBytes,lastAccessedAt --jq '.[] | "\(.id)\t\(.key)\t\(.ref // "")\t\(.sizeInBytes)\t\(.lastAccessedAt // "")"' || true
}

echo "Listing caches before deletion..."
before_list="$(list_caches)"
if [[ -z "${before_list}" ]]; then
  echo "No caches found."
else
  echo "${before_list}"
fi

if [[ "${DELETE_ALL}" == "true" ]]; then
  if [[ "${CONFIRM_ALL}" != "true" ]]; then
    echo "--confirm-all is required when using --all to avoid destructive deletions" >&2
    exit 1
  fi

  if [[ -z "${before_list}" ]]; then
    echo "No caches to delete."
    if [[ "${SUCCEED_ON_EMPTY}" == "true" ]]; then
      exit 0
    fi
    exit 1
  fi

  delete_cmd=(gh cache delete --all --confirm)
  delete_cmd+=("${repo_args[@]}" "${ref_args[@]}")
  echo "Running: ${delete_cmd[*]}"
  "${delete_cmd[@]}"
  echo "All caches requested for deletion."
else
  target_flag=("--id" "${CACHE_ID}")
  target_label="id ${CACHE_ID}"
  if [[ -n "${CACHE_KEY}" ]]; then
    target_flag=("${CACHE_KEY}")
    target_label="key ${CACHE_KEY}"
  fi

  delete_cmd=(gh cache delete "${target_flag[@]}")
  delete_cmd+=("${repo_args[@]}" "${ref_args[@]}")
  echo "Running: ${delete_cmd[*]}"

  if ! "${delete_cmd[@]}"; then
    echo "::error::Cache ${target_label} could not be deleted (not found or API error)" >&2
    exit 1
  fi
fi

echo "Listing caches after deletion..."
after_list="$(list_caches)"
if [[ -z "${after_list}" ]]; then
  echo "No caches remain."
else
  echo "${after_list}"
fi
