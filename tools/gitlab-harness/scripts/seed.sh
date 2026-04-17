#!/bin/bash
set -euo pipefail

TOKEN_FILE=${TOKEN_FILE:-.secrets/gitlab-harness.token}

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Root token missing at $TOKEN_FILE. Run 'make token' after the stack is healthy." >&2
  exit 1
fi

./seed/seed-all.sh
