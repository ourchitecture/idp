#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE=${COMPOSE:-docker compose -f compose.yaml}
$COMPOSE down
