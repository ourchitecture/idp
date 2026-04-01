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

if [[ ! -x "${MMDC_BIN}" ]]; then
  echo "mmdc not found at ${MMDC_BIN}. Run 'npm install' in docs/." >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

markdown_files=(
  "${DIAGRAMS_DIR}/level-1-system-context.md"
  "${DIAGRAMS_DIR}/level-2-containers-go.md"
  "${DIAGRAMS_DIR}/level-2-containers-nodejs.md"
  "${DIAGRAMS_DIR}/level-3-component-bff.md"
)

for source in "${markdown_files[@]}"; do
  if [[ ! -f "${source}" ]]; then
    echo "Missing diagram source: ${source}" >&2
    exit 1
  fi

  base_name="$(basename "${source}" .md)"
  if [[ "${CHECK_ONLY}" == "true" ]]; then
    output="${OUTPUT_DIR}/${base_name}.check.svg"
  else
    output="${OUTPUT_DIR}/${base_name}.svg"
  fi

  "${MMDC_BIN}" \
    --input "${source}" \
    --output "${output}" \
    --outputFormat svg \
    --puppeteerConfigFile "${PUPPETEER_CONFIG}" \
    --quiet

  if [[ "${CHECK_ONLY}" == "true" ]]; then
    rm -f "${output}"
  fi
done

echo "Diagram generation completed (check=${CHECK_ONLY})."
