.PHONY: help all ci install build clean lint check-lint-md check-lint-workflows check-stack check-team-membership check-pr-title check-pr-changes issue-number issue-triage issue-signal-ready issue-setup-labels check-lint check-test check-contract check test test-contract dev docs-site

DEFAULT_STACK := src/stacks/go/net-http/rest
STACK ?= $(DEFAULT_STACK)
STACK_MAKEFILES := $(wildcard src/stacks/*/*/*/Makefile)
STACKS := $(patsubst %/Makefile,%,$(STACK_MAKEFILES))
CI_SCRIPTS_DIR := scripts/ci

PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all           Bootstrap toolchain and validate all detected stacks\n"
	@printf "  ci            Run CI-safe checks for all stacks via moon ci (affected-aware)\n"
	@printf "  install       Install dependencies for selected stack\n"
	@printf "  build         Build selected stack artifacts\n"
	@printf "  clean         Clean selected stack artifacts\n"
	@printf "  check-lint-md Lint all Markdown files\n"
	@printf "  check-lint-workflows Lint GitHub workflow definitions\n"
	@printf "  check-stack   Run full checks for STACK\n"
	@printf "  check-team-membership Check org team authorization\n"
	@printf "  check-pr-title Validate PR title policy\n"
	@printf "  check-pr-changes Detect path-based PR validation plan\n"
	@printf "  issue-number  Resolve issue number from trigger context\n"
	@printf "  issue-triage  Apply issue triage labels and comments\n"
	@printf "  issue-signal-ready Post agent-ready issue signal\n"
	@printf "  issue-setup-labels Bootstrap repository labels\n"
	@printf "  check-lint    Run selected stack lint checks\n"
	@printf "  check-test    Run selected stack tests\n"
	@printf "  check-contract Run selected stack contract checks\n"
	@printf "  check         Run lint, tests, and contract checks\n"
	@printf "  test          Alias for check\n"
	@printf "  test-contract Alias for check-contract\n"
	@printf "  dev           Bootstrap toolchain and start selected stack (web + BFF)\n"
	@printf "  docs-site     Build and validate the Stemix documentation site\n"
	@printf "\n"
	@printf "Variables:\n"
	@printf "  STACK  Override stack path (default: %s)\n" "$(DEFAULT_STACK)"
	@printf "\n"
	@printf "Detected stacks:\n"
	@for stack in $(STACKS); do printf "  - %s\n" "$$stack"; done

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		if [ -x "$(PROTO_HOME)/bin/proto" ]; then \
			"$(PROTO_HOME)/bin/proto" install; \
		fi; \
		set -e; \
		for stack in $(STACKS); do \
			printf "Running full build/test validation for %s\n" "$$stack"; \
			case "$$stack" in \
				src/stacks/go/net-http/rest) project="go-net-http-rest" ;; \
				src/stacks/nodejs/react-fastify/rest) project="nodejs-react-fastify-rest" ;; \
				*) project="" ;; \
			esac; \
			if [ -n "$$project" ]; then \
				"$(MOON_BIN)" run "$$project:all"; \
			else \
				"$(MAKE)" -C "$$stack" all; \
			fi; \
		done; \
		printf "Running full build/test validation for docs-site\n"; \
		"$(MOON_BIN)" run docs-site:all; \
	else \
		set -e; \
		for stack in $(STACKS); do \
			printf "Running full build/test validation for %s\n" "$$stack"; \
			"$(MAKE)" -C "$$stack" all; \
		done; \
		printf "Running full build/test validation for docs-site\n"; \
		"$(MAKE)" -C src/docs all; \
	fi

ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" ci go-net-http-rest:check-ci nodejs-react-fastify-rest:check-ci docs-site:check-ci; \
	else \
		set -e; \
		for stack in $(STACKS); do \
			printf "Running CI-safe checks for %s\n" "$$stack"; \
			"$(MAKE)" -C "$$stack" check-ci; \
		done; \
		"$(MAKE)" -C src/docs check-ci; \
	fi

check-lint-md:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-lint-md; \
	else \
		"npx" markdownlint-cli2 "**/*.md"; \
	fi

check-lint-workflows:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-lint-workflows; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/check-lint-workflows.sh"; \
	fi

check-stack:
	@"$(MAKE)" -C "$(STACK)" all

check-team-membership:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-team-membership; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/check-team-membership.sh"; \
	fi

check-pr-title:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run repo:check-pr-title; \
	else \
		"bash" "./$(CI_SCRIPTS_DIR)/check-pr-title.sh"; \
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

install:
	@"$(MAKE)" -C "$(STACK)" install

build:
	@"$(MAKE)" -C "$(STACK)" build

clean:
	@"$(MAKE)" -C "$(STACK)" clean

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
		src/stacks/go/net-http/rest) project="go-net-http-rest" ;; \
		src/stacks/nodejs/react-fastify/rest) project="nodejs-react-fastify-rest" ;; \
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
		"$(MAKE)" -C src/docs all; \
	fi
