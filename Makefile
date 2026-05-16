.PHONY: help all ci install upgrade build clean reset lint check-lint-md check-lint-workflows check-privacy check-flow-insights-equivalence check-stack check-team-membership check-pr-changes issue-number issue-triage issue-signal-ready issue-setup-labels worktree-path worktree-ensure worktree-cleanup audit-worktrees check-lint check-test check-contract check test test-contract dev docs-site build-containers build-container-dev-tools gitlab-harness-up gitlab-harness-down gitlab-harness-seed gitlab-harness-reset gitlab-harness-wait-healthy gitlab-harness-wait-init gitlab-harness-token gitlab-harness-logs verify-tool-pins setup-hooks sync-skills check-skills-sync

DEFAULT_STACK := stacks/go/net-http/rest
STACK ?= $(DEFAULT_STACK)
STACK_MAKEFILES := $(wildcard stacks/*/*/*/Makefile)
STACKS := $(patsubst %/Makefile,%,$(STACK_MAKEFILES))
CI_SCRIPTS_DIR := scripts/ci

PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon
OUR_IDP_DOCKER_BUILD_NETWORK ?= default
OUR_IDP_DEV_TOOLS_DOCKER_BUILD_ARGS ?=

help:
	@printf "Targets:\n"
	@printf "  all           Bootstrap toolchain and validate all detected stacks\n"
	@printf "  ci            Run CI-safe checks for all stacks via moon ci (affected-aware)\n"
	@printf "  install       Install dependencies for selected stack\n"
	@printf "  upgrade       Upgrade tracked dependency locks across the repository\n"
	@printf "  build         Build selected stack artifacts\n"
	@printf "  clean         Clean all project artifacts (build, test, analyze caches)\n"
	@printf "  reset         Full reset: clean + remove all dependency caches\n"
	@printf "  check-lint-md Lint all Markdown files\n"
	@printf "  check-lint-workflows Lint GitHub workflow definitions\n"
	@printf "  check-privacy Run privacy and secret scanning\n"
	@printf "  check-flow-insights-equivalence Run cross-stack equivalence check for /api/flow/insights\n"
	@printf "  check-stack   Run full checks for STACK\n"
	@printf "  check-team-membership Check org team authorization\n"
	@printf "  check-pr-changes Detect path-based PR validation plan\n"
	@printf "  issue-number  Resolve issue number from trigger context\n"
	@printf "  issue-triage  Apply issue triage labels and comments\n"
	@printf "  issue-signal-ready Post agent-ready issue signal\n"
	@printf "  issue-setup-labels Bootstrap repository labels\n"
	@printf "  worktree-path Resolve the canonical issue worktree path and branch\n"
	@printf "  worktree-ensure Create or reuse the canonical issue worktree\n"
	@printf "  worktree-cleanup Remove a clean issue worktree after merge confirmation\n"
	@printf "  audit-worktrees Report stale or orphaned issue worktrees\n"
	@printf "  check-lint    Run selected stack lint checks\n"
	@printf "  check-test    Run selected stack tests\n"
	@printf "  check-contract Run selected stack contract checks\n"
	@printf "  check         Run lint, tests, and contract checks\n"
	@printf "  test          Alias for check\n"
	@printf "  test-contract Alias for check-contract\n"
	@printf "  dev           Bootstrap toolchain and start selected stack (web + BFF)\n"
	@printf "  docs-site     Build and validate the Stemix documentation site\n"
	@printf "  build-containers Build all container images for all stacks (opt-in, requires docker)\n"
	@printf "  build-container-dev-tools Build the dev-tools container image\n"
	@printf "  verify-tool-pins Assert pnpm version in .prototools matches package.json packageManager\n"
	@printf "  setup-hooks   Configure git to use .githooks/ (run once after clone)\n"
	@printf "  sync-skills   Copy .agents/skills → .claude/skills for Claude Code discovery\n"
	@printf "  check-skills-sync Assert .claude/skills matches .agents/skills (used by CI)\n"
	@printf "\n"
	@printf "Variables:\n"
	@printf "  STACK  Override stack path (default: %s)\n" "$(DEFAULT_STACK)"
	@printf "  OUR_IDP_DOCKER_BUILD_NETWORK  Docker build network mode for dev-tools (default: %s)\n" "$(OUR_IDP_DOCKER_BUILD_NETWORK)"
	@printf "  OUR_IDP_DEV_TOOLS_DOCKER_BUILD_ARGS     Extra docker build args for dev-tools\n"
	@printf "\n"
	@printf "Detected stacks:\n"
	@for stack in $(STACKS); do printf "  - %s\n" "$$stack"; done

setup-hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/pre-commit
	@printf "setup-hooks: git will now use .githooks/ for pre-commit enforcement\n"

sync-skills:
	@bash .agents/scripts/sync-skills.sh

check-skills-sync:
	@bash .agents/scripts/sync-skills.sh
	@git diff --exit-code .claude/skills/ || { printf "ERROR: .claude/skills/ is out of sync with .agents/skills/ -- run: make sync-skills\n" >&2; exit 1; }

verify-tool-pins:
	@proto_pnpm=$$(grep '^pnpm\s*=' .prototools | sed 's/.*=\s*"\?\([^"]*\)"\?.*/\1/' | tr -d '[:space:]'); \
	pkg_pnpm=$$(grep '"packageManager"' package.json | sed 's/.*pnpm@\([^"]*\)".*/\1/' | tr -d '[:space:]'); \
	if [ "$$proto_pnpm" != "$$pkg_pnpm" ]; then \
		printf "ERROR: pnpm version mismatch -- .prototools=%s, package.json packageManager=%s\n" "$$proto_pnpm" "$$pkg_pnpm" >&2; \
		exit 1; \
	fi; \
	printf "verify-tool-pins: pnpm@%s matches across .prototools and package.json\n" "$$proto_pnpm"

all:
	@$(MAKE) verify-tool-pins
	@if [ -x "$(PROTO_HOME)/bin/proto" ]; then \
		"$(PROTO_HOME)/bin/proto" install; \
	fi
	@set -e; \
	for stack in $(STACKS); do \
		printf "Running full build/test validation for %s\n" "$$stack"; \
		"$(MAKE)" -C "$$stack" all; \
	done; \
	printf "Running full build/test validation for docs-site\n"; \
	"$(MAKE)" -C docs all; \
	printf "Running full build/test validation for tools/vscode-extension\n"; \
	"$(MAKE)" -C tools/vscode-extension all; \
	printf "Running full build/test validation for tools/backstage\n"; \
	"$(MAKE)" -C tools/backstage all
	@if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then \
		printf "Docker daemon reachable -- building container images\n"; \
		"$(MAKE)" build-containers; \
	else \
		printf "Docker daemon not reachable -- skipping container builds (opt-in only)\n"; \
	fi

ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" ci go-net-http-rest:check-ci nodejs-react-fastify-rest:check-ci docs-site:check-ci vscode-extension:check-ci backstage-tools:check-ci; \
	else \
		set -e; \
		for stack in $(STACKS); do \
			printf "Running CI-safe checks for %s\n" "$$stack"; \
			"$(MAKE)" -C "$$stack" check-ci; \
		done; \
		"$(MAKE)" -C docs check-ci; \
		"$(MAKE)" -C tools/vscode-extension check-ci; \
		"$(MAKE)" -C tools/backstage check-ci; \
	fi
	@if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then \
		printf "Docker daemon reachable -- building container images\n"; \
		"$(MAKE)" build-containers; \
	else \
		printf "Docker daemon not reachable -- skipping container builds (opt-in only)\n"; \
	fi

check-lint-md:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-lint-md; \
	else \
		pnpm run lint:md; \
	fi

check-lint-workflows:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-lint-workflows; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/check-lint-workflows.sh"; \
	fi

check-privacy:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-privacy; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/check-privacy.sh"; \
	fi

check-flow-insights-equivalence:
	@"bash" "./$(CI_SCRIPTS_DIR)/run-flow-insights-equivalence.sh"

check-stack:
	@"$(MAKE)" -C "$(STACK)" all

check-team-membership:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-team-membership; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/check-team-membership.sh"; \
	fi

check-pr-changes:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-pr-changes; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/detect-pr-changes.sh"; \
	fi

issue-number:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:issue-number; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/issue-number-from-dispatch.sh"; \
	fi

issue-triage:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:issue-triage; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/issue-triage.sh"; \
	fi

issue-signal-ready:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:issue-signal-ready; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/issue-signal-ready.sh"; \
	fi

issue-setup-labels:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:issue-setup-labels; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/setup-labels.sh"; \
	fi

worktree-path:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:worktree-path; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/worktree-path.sh"; \
	fi

worktree-ensure:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:worktree-ensure; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/worktree-ensure.sh"; \
	fi

worktree-cleanup:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:worktree-cleanup; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/worktree-cleanup.sh"; \
	fi

audit-worktrees:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:audit-worktrees; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/audit-worktrees.sh"; \
	fi

install:
	@"$(MAKE)" -C "$(STACK)" install

upgrade:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:upgrade; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/upgrade-dependencies.sh"; \
	fi

build:
	@"$(MAKE)" -C "$(STACK)" build

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:clean; \
	else \
		set -e; \
		for stack in $(STACKS); do \
			"$(MAKE)" -C "$$stack" clean; \
		done; \
		"$(MAKE)" -C docs clean; \
		"$(MAKE)" -C tools/mcp clean; \
		"$(MAKE)" -C tools/mock-oauth clean; \
		"$(MAKE)" -C tools/vscode-extension clean; \
		"$(MAKE)" -C tools/backstage clean; \
		"$(MAKE)" -C tools/gitlab-harness down; \
		rm -rf tools/gitlab-harness/data; \
	fi

reset:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:reset; \
	else \
		"$(MAKE)" clean; \
		rm -rf .venv/ .pnpm-store/ node_modules/ \
			docs/node_modules/ \
			stacks/go/net-http/rest/node_modules/ \
			stacks/nodejs/react-fastify/rest/node_modules/ \
			tools/vscode-extension/node_modules/ \
			tools/backstage/node_modules/ \
			tools/mcp/node_modules/ \
			tools/mock-providers/node_modules/ \
			tools/mock-oauth/target/; \
	fi

lint: check-lint

check-lint:
	@"$(MAKE)" -C "$(STACK)" check-lint

check-test:
	@"$(MAKE)" -C "$(STACK)" check-test

check-contract:
	@"$(MAKE)" -C "$(STACK)" check-contract

check: check-lint check-test check-contract

test: check

test-contract: check-contract

dev:
	@printf "Starting stack at %s\n" "$(STACK)"
	@case "$(STACK)" in \
		stacks/go/net-http/rest) project="go-net-http-rest" ;; \
		stacks/nodejs/react-fastify/rest) project="nodejs-react-fastify-rest" ;; \
		*) project="" ;; \
	esac; \
	if [ -x "$(MOON_BIN)" ]; then \
		if [ -x "$(PROTO_HOME)/bin/proto" ]; then \
			"$(PROTO_HOME)/bin/proto" install; \
		fi; \
		if [ -n "$$project" ]; then \
			"$(MOON_BIN)" run "$$project:run-web" "$$project:run-bff"; \
		else \
			"$(MAKE)" -C "$(STACK)" run-web & \
			"$(MAKE)" -C "$(STACK)" run-bff & \
			wait; \
		fi; \
	else \
		"$(MAKE)" -C "$(STACK)" run-web & \
		"$(MAKE)" -C "$(STACK)" run-bff & \
		wait; \
	fi

docs-site:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:all; \
	else \
		"$(MAKE)" -C docs all; \
	fi

build-containers:
	@set -e; \
	for stack in $(STACKS); do \
		if [ -f "$$stack/Makefile" ]; then \
			printf "Building container images for %s\n" "$$stack"; \
			"$(MAKE)" -C "$$stack" build-containers; \
		fi; \
	done; \
	printf "Building container image for tools/mock-oauth\n"; \
	"$(MAKE)" -C tools/mock-oauth build-container; \
	printf "Building container image for tools/mcp\n"; \
	"$(MAKE)" -C tools/mcp build-container; \
	printf "Building container image for tests\n"; \
	"$(MAKE)" -C tests build-container; \
	printf "Building container image for dev-tools\n"; \
	"$(MAKE)" build-container-dev-tools

build-container-dev-tools:
	docker build --network="$(OUR_IDP_DOCKER_BUILD_NETWORK)" $(OUR_IDP_DEV_TOOLS_DOCKER_BUILD_ARGS) -t localhost/ourchitecture/idp/stemix-dev-tools:dev -f .devcontainer/Dockerfile .

gitlab-harness-up:
	@"$(MAKE)" -C tools/gitlab-harness up

gitlab-harness-down:
	@"$(MAKE)" -C tools/gitlab-harness down

gitlab-harness-seed:
	@"$(MAKE)" -C tools/gitlab-harness seed

gitlab-harness-reset:
	@"$(MAKE)" -C tools/gitlab-harness reset

gitlab-harness-wait-healthy:
	@"$(MAKE)" -C tools/gitlab-harness wait-healthy

gitlab-harness-wait-init:
	@"$(MAKE)" -C tools/gitlab-harness wait-init

gitlab-harness-token:
	@"$(MAKE)" -C tools/gitlab-harness token

gitlab-harness-logs:
	@"$(MAKE)" -C tools/gitlab-harness logs
