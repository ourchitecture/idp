#!/usr/bin/env bash

set -euo pipefail

REPO="${REPO:-}"

if [[ -z "${REPO}" ]]; then
  echo "REPO is required" >&2
  exit 1
fi

create_label() {
  local name="$1"
  local color="$2"
  local description="$3"
  gh label create "${name}" --color "${color}" --description "${description}" --repo "${REPO}" --force
}

create_label "requirement" "0075ca" "New feature or capability"
create_label "bug" "d73a4a" "Something is not working"
create_label "task" "006b75" "Maintenance or operational work"
create_label "spike" "d4c5f9" "Time-boxed research or investigation"
create_label "design" "c2e0c6" "Design proposal or discussion"
create_label "epic" "3e4b9e" "Groups related issues"
create_label "chore" "ededed" "Routine maintenance"

create_label "p0-critical" "b60205" "Must fix immediately"
create_label "p1-high" "d93f0b" "Fix in current cycle"
create_label "p2-medium" "fbca04" "Plan for upcoming cycle"
create_label "p3-low" "0e8a16" "Nice to have"

create_label "security" "ee0701" "Security domain"
create_label "ai" "1d76db" "AI domain"
create_label "mcp" "5319e7" "MCP domain"
create_label "infrastructure" "bfd4f2" "Infrastructure domain"
create_label "plugin" "c5def5" "Plugin domain"
create_label "api" "0052cc" "API domain"
create_label "ui" "f9d0c4" "UI domain"
create_label "devops" "b4a8d1" "DevOps domain"
create_label "docs" "0075ca" "Documentation domain"

create_label "needs-triage" "e4e669" "Awaiting maintainer review"
create_label "ready" "0e8a16" "Triaged and ready for work"
create_label "in-progress" "1d76db" "Actively being worked on"
create_label "blocked" "b60205" "Blocked by dependency or question"
create_label "needs-review" "fbca04" "Awaiting review or approval"

create_label "agent-eligible" "6f42c1" "Suitable for autonomous AI agent processing"

echo "All labels created or updated successfully."
