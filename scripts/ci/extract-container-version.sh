#!/usr/bin/env bash
# Extract semantic version components from a release tag and write them to
# GitHub Actions output (or stdout for local use).
#
# Required environment variables:
#   TAG     — Full git tag name (e.g. go-net-http-rest-v1.2.3)
#   PREFIX  — Prefix to strip to obtain the bare version (e.g. go-net-http-rest-v)
#
# Optional environment variables:
#   OUTPUT_FILE — Path to write key=value pairs. Defaults to /dev/stdout.
#                 Set to $GITHUB_OUTPUT in GitHub Actions.
#
# Outputs (written to OUTPUT_FILE):
#   version       — Full semver string (e.g. 1.2.3)
#   major         — Major component (e.g. 1)
#   major_minor   — Major.minor string (e.g. 1.2)
set -euo pipefail

: "${TAG:?TAG is required}"
: "${PREFIX:?PREFIX is required}"

OUTPUT_FILE="${OUTPUT_FILE:-/dev/stdout}"

VERSION="${TAG#"${PREFIX}"}"
MAJOR="${VERSION%%.*}"
MINOR_PATCH="${VERSION#*.}"
MINOR="${MINOR_PATCH%%.*}"

{
  echo "version=${VERSION}"
  echo "major=${MAJOR}"
  echo "major_minor=${MAJOR}.${MINOR}"
} >> "${OUTPUT_FILE}"
