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

mapfile -t changed_files < <(git diff --name-only "${BASE_SHA}" "${HEAD_SHA}")

if [[ ${#changed_files[@]} -eq 0 ]]; then
  changed_count=0
else
  changed_count=${#changed_files[@]}
fi

has_markdown_change="false"
has_non_markdown_change="false"
run_go_stack="false"
run_node_stack="false"
run_workflow_lint="false"
run_reference_all="false"

for file in "${changed_files[@]}"; do
  if [[ "${file}" == *.md ]]; then
    has_markdown_change="true"
  else
    has_non_markdown_change="true"
  fi

  case "${file}" in
    .github/workflows/*)
      run_workflow_lint="true"
      ;;
    scripts/ci/*)
      run_workflow_lint="true"
      ;;
    src/stacks/go/net-http/rest/*)
      run_go_stack="true"
      ;;
    src/stacks/nodejs/react-fastify/rest/*)
      run_node_stack="true"
      ;;
    Makefile|package.json|package-lock.json|tests/contract/*)
      run_reference_all="true"
      ;;
    *.md|.github/*|scripts/ci/*)
      ;;
    *)
      run_reference_all="true"
      ;;
  esac
done

if [[ "${has_markdown_change}" == "true" ]]; then
  run_markdown="true"
else
  run_markdown="false"
fi

if [[ "${has_markdown_change}" == "true" && "${has_non_markdown_change}" == "false" ]]; then
  markdown_only="true"
else
  markdown_only="false"
fi

if [[ "${run_reference_all}" == "true" ]]; then
  run_go_stack="true"
  run_node_stack="true"
fi

run_stack_validation="false"
if [[ "${run_go_stack}" == "true" || "${run_node_stack}" == "true" ]]; then
  run_stack_validation="true"
fi

if [[ "${markdown_only}" == "true" ]]; then
  run_stack_validation="false"
fi

stack_matrix='[]'
if [[ "${run_stack_validation}" == "true" ]]; then
  matrix_items=()

  if [[ "${run_go_stack}" == "true" ]]; then
    matrix_items+=("{\"project\":\"go-net-http-rest\",\"stack\":\"src/stacks/go/net-http/rest\",\"label\":\"go-net-http-rest\"}")
  fi

  if [[ "${run_node_stack}" == "true" ]]; then
    matrix_items+=("{\"project\":\"nodejs-react-fastify-rest\",\"stack\":\"src/stacks/nodejs/react-fastify/rest\",\"label\":\"nodejs-react-fastify-rest\"}")
  fi

  if [[ ${#matrix_items[@]} -gt 0 ]]; then
    stack_matrix="[$(IFS=,; echo "${matrix_items[*]}")]"
  fi
fi

echo "changed_count=${changed_count}"
echo "markdown_only=${markdown_only}"
echo "run_markdown=${run_markdown}"
echo "run_workflow_lint=${run_workflow_lint}"
echo "run_stack_validation=${run_stack_validation}"
echo "stack_matrix=${stack_matrix}"

if [[ -n "${OUTPUT_FILE}" ]]; then
  {
    printf "changed_count=%s\n" "${changed_count}"
    printf "markdown_only=%s\n" "${markdown_only}"
    printf "run_markdown=%s\n" "${run_markdown}"
    printf "run_workflow_lint=%s\n" "${run_workflow_lint}"
    printf "run_stack_validation=%s\n" "${run_stack_validation}"
    printf "stack_matrix=%s\n" "${stack_matrix}"
  } >> "${OUTPUT_FILE}"
fi
