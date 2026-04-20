.PHONY: help all install clean check-lint check-test check-ci check test run-github run-gitlab

ROOT_DIR := ../..
TOOL_PATH := tools/mock-providers
GITHUB_MOCK_PORT ?= 8601
GITLAB_MOCK_PORT ?= 8602
PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all             Run full tool verification flow\n"
	@printf "  install         Install dependencies\n"
	@printf "  clean           Remove build artifacts\n"
	@printf "  check-lint      Run lint checks (typecheck)\n"
	@printf "  check-test      Run adapter integration tests\n"
	@printf "  check-ci        Run CI-safe validation checks\n"
	@printf "  check           Run lint and tests\n"
	@printf "  test            Alias for check-test\n"
	@printf "  run-github      Start GitHub mock provider\n"
	@printf "  run-gitlab      Start GitLab mock provider\n"
	@printf "\n"
	@printf "Variables:\n"
	@printf "  GITHUB_MOCK_PORT  Port for GitHub mock (default: 8601)\n"
	@printf "  GITLAB_MOCK_PORT  Port for GitLab mock (default: 8602)\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:all; \
	else \
		"$(MAKE)" install check; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:install; \
	else \
		npm install; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:clean; \
	else \
		echo "No build artifacts to clean"; \
	fi

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:check-lint; \
	else \
		npm run typecheck; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:check-test; \
	else \
		npm test; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:check-ci; \
	else \
		"$(MAKE)" install check-lint check-test; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:check; \
	else \
		"$(MAKE)" check-lint check-test; \
	fi

run-github:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:run-github; \
	else \
		OUR_IDP_GITHUB_MOCK_PORT="$(GITHUB_MOCK_PORT)" npm run start:github; \
	fi

run-gitlab:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-providers:run-gitlab; \
	else \
		OUR_IDP_GITLAB_MOCK_PORT="$(GITLAB_MOCK_PORT)" npm run start:gitlab; \
	fi
