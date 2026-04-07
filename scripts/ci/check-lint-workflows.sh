#!/usr/bin/env bash

set -euo pipefail

if command -v actionlint >/dev/null 2>&1; then
  actionlint
  exit 0
fi

if command -v go >/dev/null 2>&1; then
  go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.8
  exit 0
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  # Prefer Docker only when the daemon is running Linux containers; Windows runners
  # using Windows containers cannot pull the Linux-only actionlint image.
  if docker info --format '{{.OSType}}' 2>/dev/null | grep -iq "linux"; then
    host_path="$(pwd)"

    case "$(uname -s 2>/dev/null || true)" in
      MINGW*|MSYS*|CYGWIN*)
        host_path="$(pwd -W 2>/dev/null || pwd)"
        host_path="${host_path//\\//}"
        MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' \
          docker run --rm -v "${host_path}:/repo" -w "/repo" rhysd/actionlint:1.7.8
        ;;
      *)
        docker run --rm -v "${host_path}:/repo" -w "/repo" rhysd/actionlint:1.7.8
        ;;
    esac

    exit 0
  fi
fi

echo "actionlint is required. Install actionlint locally or run on a machine with Docker or Go." >&2
exit 1
