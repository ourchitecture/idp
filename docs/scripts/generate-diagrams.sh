#!/usr/bin/env bash

set -euo pipefail

CHECK_ONLY="false"

if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY="true"
fi

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DIAGRAMS_DIR="${ROOT_DIR}/content/architecture/diagrams"
OUTPUT_DIR="${ROOT_DIR}/static/diagrams"
MMDC_BIN="${ROOT_DIR}/node_modules/.bin/mmdc"
PUPPETEER_CONFIG="${ROOT_DIR}/scripts/puppeteer-config.json"
CHROME_PATH="${PUPPETEER_EXECUTABLE_PATH:-}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

if [[ ! -x "${MMDC_BIN}" ]]; then
  echo "mmdc not found at ${MMDC_BIN}. Run 'npm install' in docs/." >&2
  exit 1
fi

if [[ -z "${CHROME_PATH}" ]]; then
  if command -v chromium >/dev/null 2>&1; then
    CHROME_PATH="$(command -v chromium)"
  elif command -v chromium-browser >/dev/null 2>&1; then
    CHROME_PATH="$(command -v chromium-browser)"
  elif command -v google-chrome >/dev/null 2>&1; then
    CHROME_PATH="$(command -v google-chrome)"
  elif command -v google-chrome-stable >/dev/null 2>&1; then
    CHROME_PATH="$(command -v google-chrome-stable)"
  elif command -v msedge >/dev/null 2>&1; then
    CHROME_PATH="$(command -v msedge)"
  elif command -v microsoft-edge >/dev/null 2>&1; then
    CHROME_PATH="$(command -v microsoft-edge)"
  fi
fi

if [[ -z "${CHROME_PATH}" ]]; then
  windows_browser_candidates=(
    "/c/Program Files/Google/Chrome/Application/chrome.exe"
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
    "/c/Program Files/Microsoft/Edge/Application/msedge.exe"
    "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  )

  for candidate in "${windows_browser_candidates[@]}"; do
    if [[ -x "${candidate}" ]]; then
      CHROME_PATH="${candidate}"
      break
    fi
  done
fi

if [[ -z "${CHROME_PATH}" ]]; then
  echo "No Chromium-based browser detected for mmdc." >&2
  echo "Set PUPPETEER_EXECUTABLE_PATH to a local browser binary and re-run." >&2
  echo "Example (PowerShell): \$env:PUPPETEER_EXECUTABLE_PATH=\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\"" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

markdown_files=(
  "${DIAGRAMS_DIR}/level-1-system-context.md"
  "${DIAGRAMS_DIR}/level-2-containers-go.md"
  "${DIAGRAMS_DIR}/level-2-containers-nodejs.md"
  "${DIAGRAMS_DIR}/level-2-containers-mcp.md"
  "${DIAGRAMS_DIR}/level-3-component-bff.md"
)

for source in "${markdown_files[@]}"; do
  if [[ ! -f "${source}" ]]; then
    echo "Missing diagram source: ${source}" >&2
    exit 1
  fi

  base_name="$(basename "${source}" .md)"
  input_file="${TMP_DIR}/${base_name}.mmd"

  awk '
    BEGIN { in_block = 0; found = 0 }
    /^```mermaid[[:space:]]*$/ { in_block = 1; found = 1; next }
    in_block && /^```[[:space:]]*$/ { in_block = 0; exit }
    in_block { print }
    END {
      if (found == 0) {
        exit 2
      }
    }
  ' "${source}" > "${input_file}" || {
    echo "Failed to extract Mermaid block from: ${source}" >&2
    exit 1
  }

  if [[ ! -s "${input_file}" ]]; then
    echo "No Mermaid content extracted from: ${source}" >&2
    exit 1
  fi

  if [[ "${CHECK_ONLY}" == "true" ]]; then
    output="${TMP_DIR}/${base_name}.check.svg"
  else
    output="${OUTPUT_DIR}/${base_name}.svg"
    rm -f "${output}" "${OUTPUT_DIR}/${base_name}-"*.svg
  fi

  PUPPETEER_EXECUTABLE_PATH="${CHROME_PATH}" "${MMDC_BIN}" \
    --input "${input_file}" \
    --output "${output}" \
    --outputFormat svg \
    --puppeteerConfigFile "${PUPPETEER_CONFIG}" \
    --quiet
done

echo "Diagram generation completed (check=${CHECK_ONLY})."
