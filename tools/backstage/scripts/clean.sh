#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")/.."

rm -rf dist dist-types node_modules

for base in packages plugins; do
  if [ -d "$base" ]; then
    find "$base" -mindepth 2 -maxdepth 2 -type d \
      \( -name dist -o -name dist-types -o -name node_modules \) \
      -prune -exec rm -rf {} +
  fi
done
