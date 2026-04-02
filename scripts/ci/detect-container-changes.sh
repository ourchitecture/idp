#!/usr/bin/env bash

set -euo pipefail

BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"
OUTPUT_FILE="${OUTPUT_FILE:-}"

if [[ -z "${BASE_SHA}" ]]; then
  echo "BASE_SHA is required" >&2
  exit 1
fi

if [[ -z "${HEAD_SHA}" ]]; then
  echo "HEAD_SHA is required" >&2
  exit 1
fi

if [[ "${BASE_SHA}" == "0000000000000000000000000000000000000000" ]]; then
  BASE_SHA="$(git hash-object -t tree /dev/null)"
fi

mapfile -t changed_files < <(git diff --name-only "${BASE_SHA}" "${HEAD_SHA}")

run_go_containers="false"
run_node_containers="false"
run_tests_container="false"
run_all_containers="false"

for file in "${changed_files[@]}"; do
  case "${file}" in
    stacks/go/net-http/rest/*)
      run_go_containers="true"
      ;;
    stacks/nodejs/react-fastify/rest/*)
      run_node_containers="true"
      ;;
    tests/*)
      run_tests_container="true"
      ;;
    .github/workflows/container-build.yml)
      run_all_containers="true"
      ;;
  esac
done

if [[ "${run_all_containers}" == "true" ]]; then
  run_go_containers="true"
  run_node_containers="true"
  run_tests_container="true"
fi

run_any_containers="false"
if [[ "${run_go_containers}" == "true" || "${run_node_containers}" == "true" || "${run_tests_container}" == "true" ]]; then
  run_any_containers="true"
fi

echo "run_go_containers=${run_go_containers}"
echo "run_node_containers=${run_node_containers}"
echo "run_tests_container=${run_tests_container}"
echo "run_any_containers=${run_any_containers}"

if [[ -n "${OUTPUT_FILE}" ]]; then
  {
    printf "run_go_containers=%s\n" "${run_go_containers}"
    printf "run_node_containers=%s\n" "${run_node_containers}"
    printf "run_tests_container=%s\n" "${run_tests_container}"
    printf "run_any_containers=%s\n" "${run_any_containers}"
  } >> "${OUTPUT_FILE}"
fi
