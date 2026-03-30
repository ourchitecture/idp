#!/usr/bin/env bash

set -euo pipefail

EVENT_NAME="${EVENT_NAME:-}"
DISPATCH_ISSUE_NUMBER="${DISPATCH_ISSUE_NUMBER:-}"
EVENT_ISSUE_NUMBER="${EVENT_ISSUE_NUMBER:-}"
OUTPUT_FILE="${OUTPUT_FILE:-}"

if [[ "${EVENT_NAME}" == "workflow_dispatch" ]]; then
  issue_number="${DISPATCH_ISSUE_NUMBER}"
else
  issue_number="${EVENT_ISSUE_NUMBER}"
fi

if [[ -z "${issue_number}" ]]; then
  echo "Unable to determine issue number" >&2
  exit 1
fi

echo "Resolved issue number: ${issue_number}"

if [[ -n "${OUTPUT_FILE}" ]]; then
  printf "number=%s\n" "${issue_number}" >> "${OUTPUT_FILE}"
fi
