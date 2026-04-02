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

if [[ ${#changed_files[@]} -eq 0 ]]; then
  changed_count=0
else
  changed_count=${#changed_files[@]}
fi

has_markdown_change="false"
has_non_markdown_change="false"
run_go_stack="false"
run_node_stack="false"
run_mcp_tools="false"
run_workflow_lint="false"
run_reference_all="false"
run_docs_validation="false"
run_go_containers="false"
run_node_containers="false"
run_mcp_containers="false"
run_tests_container="false"

container_detection_output="$({
  BASE_SHA="${BASE_SHA}" \
    HEAD_SHA="${HEAD_SHA}" \
    bash ./scripts/ci/detect-container-changes.sh
})"

if [[ -n "${container_detection_output}" ]]; then
  while IFS='=' read -r key value; do
    case "${key}" in
      run_go_containers)
        run_go_containers="${value}"
        ;;
      run_node_containers)
        run_node_containers="${value}"
        ;;
      run_tests_container)
        run_tests_container="${value}"
        ;;
      run_any_containers)
        run_any_containers="${value}"
        ;;
    esac
  done <<< "${container_detection_output}"
fi

for file in "${changed_files[@]}"; do
  if [[ "${file}" == *.md ]]; then
    has_markdown_change="true"
  else
    has_non_markdown_change="true"
  fi

  case "${file}" in
    .release-please-manifest.json|release-please-config.json)
      ;;
    .github/workflows/*)
      run_workflow_lint="true"
      ;;
    scripts/ci/*)
      run_workflow_lint="true"
      ;;
    stacks/go/net-http/rest/*)
      run_go_stack="true"
      ;;
    stacks/nodejs/react-fastify/rest/*)
      run_node_stack="true"
      ;;
    tools/mcp/*)
      run_mcp_tools="true"
      run_mcp_containers="true"
      ;;
    # docs/* includes architecture diagram sources under
    # docs/content/architecture/diagrams/* and generated assets under docs/static/diagrams/*.
    docs/*)
      run_docs_validation="true"
      ;;
    Makefile|package.json|package-lock.json|tests/*)
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
  run_mcp_tools="true"
  run_go_containers="true"
  run_node_containers="true"
  run_mcp_containers="true"
  run_tests_container="true"
fi

run_stack_validation="false"
if [[ "${run_go_stack}" == "true" || "${run_node_stack}" == "true" || "${run_mcp_tools}" == "true" ]]; then
  run_stack_validation="true"
fi

if [[ "${markdown_only}" == "true" ]]; then
  run_stack_validation="false"
  run_go_containers="false"
  run_node_containers="false"
  run_mcp_containers="false"
  run_tests_container="false"
fi

run_any_containers="false"
if [[ "${run_go_containers}" == "true" || "${run_node_containers}" == "true" || \
      "${run_tests_container}" == "true" || "${run_mcp_containers}" == "true" ]]; then
  run_any_containers="true"
fi

stack_matrix='[]'
if [[ "${run_stack_validation}" == "true" ]]; then
  matrix_items=()

  if [[ "${run_go_stack}" == "true" ]]; then
    matrix_items+=("{\"project\":\"go-net-http-rest\",\"stack\":\"stacks/go/net-http/rest\",\"label\":\"go-net-http-rest\"}")
  fi

  if [[ "${run_node_stack}" == "true" ]]; then
    matrix_items+=("{\"project\":\"nodejs-react-fastify-rest\",\"stack\":\"stacks/nodejs/react-fastify/rest\",\"label\":\"nodejs-react-fastify-rest\"}")
  fi

  if [[ "${run_mcp_tools}" == "true" ]]; then
    matrix_items+=("{\"project\":\"mcp-tools\",\"stack\":\"tools/mcp\",\"label\":\"mcp-tools\"}")
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
echo "run_docs_validation=${run_docs_validation}"
echo "run_go_containers=${run_go_containers}"
echo "run_node_containers=${run_node_containers}"
echo "run_mcp_containers=${run_mcp_containers}"
echo "run_tests_container=${run_tests_container}"
echo "run_any_containers=${run_any_containers}"

if [[ -n "${OUTPUT_FILE}" ]]; then
  {
    printf "changed_count=%s\n" "${changed_count}"
    printf "markdown_only=%s\n" "${markdown_only}"
    printf "run_markdown=%s\n" "${run_markdown}"
    printf "run_workflow_lint=%s\n" "${run_workflow_lint}"
    printf "run_stack_validation=%s\n" "${run_stack_validation}"
    printf "stack_matrix=%s\n" "${stack_matrix}"
    printf "run_docs_validation=%s\n" "${run_docs_validation}"
    printf "run_go_containers=%s\n" "${run_go_containers}"
    printf "run_node_containers=%s\n" "${run_node_containers}"
    printf "run_mcp_containers=%s\n" "${run_mcp_containers}"
    printf "run_tests_container=%s\n" "${run_tests_container}"
    printf "run_any_containers=%s\n" "${run_any_containers}"
  } >> "${OUTPUT_FILE}"
fi
