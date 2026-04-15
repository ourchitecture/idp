#!/bin/bash
set -euo pipefail

TOKEN_FILE=${TOKEN_FILE:-.secrets/gitlab-harness.token}
COMPOSE=${COMPOSE:-docker compose -f compose.yaml}

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Root token missing at $TOKEN_FILE. Run 'make token' after the stack is healthy." >&2
  exit 1
fi

echo "Seeding scripts are not implemented yet."
exit 1
