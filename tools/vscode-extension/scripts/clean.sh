#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")/.."

rm -rf dist node_modules
find . -maxdepth 1 -name '*.vsix' -delete
