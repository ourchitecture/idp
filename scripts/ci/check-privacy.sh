#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "${ROOT_DIR}"

if [[ ! -d "${ROOT_DIR}/.git" ]]; then
  echo "ERROR: repository root not found" >&2
  exit 1
fi

GITLEAKS_VERSION="v8.30.1"
SEMGREP_VERSION="1.162.0"

TARGET_PATH="${ROOT_DIR}"

TMP_DIR="${ROOT_DIR}/.tmp/privacy-scan"
mkdir -p "${TMP_DIR}"

REPORT_PATH="${TMP_DIR}/gitleaks-report.sarif"
LEAKS_REPORT_PATH="${TMP_DIR}/gitleaks-git-report.sarif"
SEMGREP_REPORT_PATH="${TMP_DIR}/semgrep-secrets.json"

run_gitleaks() {
  if command -v proto >/dev/null 2>&1; then
    proto run go -- run "github.com/zricethezav/gitleaks/v8@${GITLEAKS_VERSION}" "$@"
    return 0
  fi

  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks "$@"
    return 0
  fi

  echo "ERROR: gitleaks is required but was not found in PATH" >&2
  echo "Install proto and run 'proto install', or install gitleaks manually." >&2
  exit 1
}

run_semgrep() {
  if command -v moon >/dev/null 2>&1 && moon bin unstable_uv >/dev/null 2>&1; then
    "$(moon bin unstable_uv)" tool run --from "semgrep==${SEMGREP_VERSION}" semgrep "$@"
    return 0
  fi

  if command -v proto >/dev/null 2>&1; then
    proto run uv -- tool run --from "semgrep==${SEMGREP_VERSION}" semgrep "$@"
    return 0
  fi

  if command -v uv >/dev/null 2>&1; then
    uv tool run --from "semgrep==${SEMGREP_VERSION}" semgrep "$@"
    return 0
  fi

  if command -v semgrep >/dev/null 2>&1; then
    semgrep "$@"
    return 0
  fi

  if command -v pysemgrep >/dev/null 2>&1; then
    pysemgrep "$@"
    return 0
  fi

  echo "ERROR: semgrep is required but was not found in PATH" >&2
  echo "Install proto and run 'proto install', or install uv/semgrep manually." >&2
  exit 1
}

echo "Running gitleaks filesystem scan..."
run_gitleaks dir "${TARGET_PATH}" \
  --config "${ROOT_DIR}/.gitleaks.toml" \
  --no-banner \
  --report-format sarif \
  --report-path "${REPORT_PATH}" \
  --redact=100

echo "Running gitleaks git history scan..."
run_gitleaks git "${TARGET_PATH}" \
  --config "${ROOT_DIR}/.gitleaks.toml" \
  --no-banner \
  --report-format sarif \
  --report-path "${LEAKS_REPORT_PATH}" \
  --redact=100

echo "Running semgrep secrets scan..."
SEMGREP_SEND_METRICS=off run_semgrep scan \
  --config "p/secrets" \
  --error \
  --json \
  --output "${SEMGREP_REPORT_PATH}" \
  --exclude ".moon/cache/**" \
  --exclude ".tmp/**" \
  "${TARGET_PATH}"

echo "Checking for potential sensitive data logging..."
SENSITIVE_LOG_HITS="$(git grep -n -E 'console\.(log|info|debug|warn|error).*(password|passwd|secret|token|authorization|cookie|session|email|phone|ssn)' -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.go' || true)"
if [[ -n "${SENSITIVE_LOG_HITS}" ]]; then
  echo "ERROR: possible sensitive data logging detected:" >&2
  echo "${SENSITIVE_LOG_HITS}" >&2
  exit 1
fi

echo "Checking analytics initialization boundaries..."
CLARITY_INIT_HITS="$(git grep -n 'Clarity.init(' -- . ':!docs/src/analytics/clarity.ts' || true)"
if [[ -n "${CLARITY_INIT_HITS}" ]]; then
  echo "ERROR: unexpected Clarity initialization outside consent wrapper:" >&2
  echo "${CLARITY_INIT_HITS}" >&2
  exit 1
fi

CLARITY_IMPORT_HITS="$(git grep -n '@microsoft/clarity' -- . ':!docs/src/analytics/clarity.ts' ':!docs/package.json' ':!docs/package-lock.json' || true)"
if [[ -n "${CLARITY_IMPORT_HITS}" ]]; then
  echo "ERROR: unexpected Microsoft Clarity import outside allowed files:" >&2
  echo "${CLARITY_IMPORT_HITS}" >&2
  exit 1
fi

echo "Gitleaks report written to ${REPORT_PATH}"
echo "Gitleaks git report written to ${LEAKS_REPORT_PATH}"
echo "Semgrep report written to ${SEMGREP_REPORT_PATH}"
echo "Privacy scan completed successfully."
