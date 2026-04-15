#!/usr/bin/env bash
# Re-tag the highest stable semver release as :latest for all known container
# images. Requires `crane` to be installed and authenticated.
#
# Required environment variables:
#   IMAGE_PREFIX — Registry + org prefix (e.g. ghcr.io/ourchitecture/idp)
#
# Exit codes:
#   0 — All images processed (individual image skips are non-fatal)
#   1 — crane is not installed or IMAGE_PREFIX is missing
set -euo pipefail

: "${IMAGE_PREFIX:?IMAGE_PREFIX is required}"

if ! command -v crane &>/dev/null; then
  echo "::error::crane is not installed or not in PATH"
  exit 1
fi

IMAGES=(
  "stemix-go-net-http-rest-web"
  "stemix-go-net-http-rest-bff"
  "stemix-nodejs-react-fastify-rest-web"
  "stemix-nodejs-react-fastify-rest-bff"
  "stemix-contract-tests"
  "stemix-mcp-server"
  "stemix-mock-oauth"
  "stemix-dev-tools"
)

for IMAGE in "${IMAGES[@]}"; do
  FULL="${IMAGE_PREFIX}/${IMAGE}"

  # List all tags, filter stable semver (no pre-release suffix), sort ascending
  HIGHEST=$(crane ls "${FULL}" 2>/dev/null \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V \
    | tail -n 1 || true)

  if [[ -z "${HIGHEST}" ]]; then
    echo "No stable release found for ${IMAGE}, skipping latest tag"
    continue
  fi

  DIGEST=$(crane digest "${FULL}:${HIGHEST}")
  echo "Re-tagging ${IMAGE}:${HIGHEST} (digest ${DIGEST}) as latest"
  crane tag "${FULL}@${DIGEST}" latest
done
