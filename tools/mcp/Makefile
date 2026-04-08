.PHONY: help all install build clean check-lint check-test check-contract check-ci check test test-contract run run-http build-container

ROOT_DIR := ../..
TOOL_PATH := tools/mcp
MCP_TEST_HOST := 127.0.0.1
MCP_TEST_PORT := 8580
BFF_TEST_HOST := 127.0.0.1
BFF_TEST_PORT := 8300
CONTAINER_LOCAL_PREFIX := localhost/ourchitecture/idp
CONTAINER_IMAGE_BASE := stemix-mcp-server
PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all           Run full tool verification flow\n"
	@printf "  install       Install dependencies\n"
	@printf "  build         Compile TypeScript\n"
	@printf "  clean         Remove build artifacts\n"
	@printf "  check-lint    Run lint checks\n"
	@printf "  check-test    Run type checks\n"
	@printf "  check-contract Run contract tests against this MCP server\n"
	@printf "  check-ci      Run CI-safe validation checks\n"
	@printf "  check         Run lint, tests, and contract checks\n"
	@printf "  test          Alias for check-test\n"
	@printf "  test-contract Alias for check-contract\n"
	@printf "  run           Start MCP server in stdio mode\n"
	@printf "  run-http      Start MCP server in HTTP mode on port 8080\n"
	@printf "  build-container Build container image (requires docker)\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:all; \
	else \
		"$(MAKE)" install build check; \
	fi
	@if command -v docker >/dev/null 2>&1; then \
		"$(MAKE)" build-container; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:install; \
	else \
		npm install; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:build; \
	else \
		npm run build; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:clean; \
	else \
		rm -rf dist; \
	fi

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:check-lint; \
	else \
		echo "No additional lint configured for mcp-tools"; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:check-test; \
	else \
		npm run typecheck; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:check-ci; \
	else \
		"$(MAKE)" install build check-test; \
	fi
	@if command -v docker >/dev/null 2>&1; then \
		"$(MAKE)" build-container; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:check; \
	else \
		"$(MAKE)" check-lint check-test check-contract; \
	fi

check-contract:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:check-contract; \
	else \
		npm --prefix "$(ROOT_DIR)" install; \
		MCP_HTTP_PORT="$(MCP_TEST_PORT)" IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" node dist/server.js >/dev/null 2>&1 & MCP_PID=$$!; \
		trap 'kill $$MCP_PID >/dev/null 2>&1 || true' EXIT; \
		sleep 2; \
		IDP_MCP_URL="http://$(MCP_TEST_HOST):$(MCP_TEST_PORT)" IDP_STACK_PATH="$(TOOL_PATH)" IDP_CONTRACT_PROFILES="mcp-profile" npm --prefix "$(ROOT_DIR)" run test:contract; \
		STATUS=$$?; \
		kill $$MCP_PID >/dev/null 2>&1 || true; \
		wait $$MCP_PID 2>/dev/null || true; \
		exit $$STATUS; \
	fi

test-contract: check-contract

run:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:run; \
	else \
		node dist/server.js; \
	fi

run-http:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mcp-tools:run-http; \
	else \
		MCP_HTTP_PORT=8080 node dist/server.js; \
	fi

build-container:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE):latest" \
		.
