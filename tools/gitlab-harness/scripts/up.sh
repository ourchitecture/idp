#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
make ensure-dirs >/dev/null
COMPOSE=${COMPOSE:-docker compose -f compose.yaml}
$COMPOSE up -d
