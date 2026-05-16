#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "${ROOT_DIR}"

ALLOW_MAJOR="${OUR_IDP_UPGRADE_ALLOW_MAJOR:-false}"

case "${ALLOW_MAJOR}" in
  true|TRUE|1|yes|YES|on|ON)
    ALLOW_MAJOR="true"
    ;;
  false|FALSE|0|no|NO|off|OFF|"")
    ALLOW_MAJOR="false"
    ;;
  *)
    echo "ERROR: OUR_IDP_UPGRADE_ALLOW_MAJOR must be true or false." >&2
    exit 1
    ;;
esac

run_pnpm_upgrade() {
  echo "Upgrading pnpm workspace dependencies"
  pnpm update --recursive
  pnpm audit
}

run_backstage_yarn_upgrade() {
  local project_dir="tools/backstage"

  if [[ ! -f "${project_dir}/yarn.lock" ]]; then
    return 0
  fi

  echo "Upgrading Backstage Yarn dependencies in ${project_dir}"
  (
    cd "${project_dir}"
    corepack enable
    yarn up -R
    if [[ "${ALLOW_MAJOR}" == "true" ]]; then
      yarn npm audit --all --recursive
    else
      yarn npm audit
    fi
  )
}

run_go_upgrade() {
  local module_dir="$1"

  echo "Upgrading Go dependencies in ${module_dir}"
  (
    cd "${module_dir}"
    go get -u -t ./...
    go mod tidy
  )
}

run_uv_upgrade() {
  local project_dir="$1"

  echo "Upgrading uv dependencies in ${project_dir}"
  (
    cd "${project_dir}"
    uv lock --upgrade
  )
}

mapfile -t pnpm_lockfiles < <(git ls-files | grep --extended-regexp '(^|/)pnpm-lock\.yaml$' | sort)
mapfile -t backstage_yarn_lockfiles < <(git ls-files tools/backstage/yarn.lock | sort)
mapfile -t go_modfiles < <(git ls-files | grep --extended-regexp '(^|/)go\.mod$' | sort)
mapfile -t uv_lockfiles < <(git ls-files | grep --extended-regexp '(^|/)uv\.lock$' | sort)

if [[ ${#pnpm_lockfiles[@]} -eq 0 && ${#backstage_yarn_lockfiles[@]} -eq 0 && ${#go_modfiles[@]} -eq 0 && ${#uv_lockfiles[@]} -eq 0 ]]; then
  echo "No dependency lock or module files found."
  exit 0
fi

if [[ ${#pnpm_lockfiles[@]} -gt 0 ]]; then
  run_pnpm_upgrade
fi

run_backstage_yarn_upgrade

for modfile in "${go_modfiles[@]}"; do
  run_go_upgrade "$(dirname "${modfile}")"
done

for lockfile in "${uv_lockfiles[@]}"; do
  project_dir="$(dirname "${lockfile}")"
  if [[ -f "${project_dir}/pyproject.toml" ]]; then
    run_uv_upgrade "${project_dir}"
  else
    echo "Skipping ${lockfile}; no pyproject.toml found beside it."
  fi
done

echo "Dependency upgrade task completed."
