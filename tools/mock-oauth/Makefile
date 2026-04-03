.PHONY: help all install build clean check-lint check-test check-ci check test run build-container

ROOT_DIR := ../..
TOOL_PATH := tools/mock-oauth
MOCK_OAUTH_PORT ?= 9000
CONTAINER_LOCAL_PREFIX := localhost
CONTAINER_IMAGE_BASE := stemix-mock-oauth
PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all             Run full tool verification flow\n"
	@printf "  install         Resolve Maven dependencies\n"
	@printf "  build           Package the application (tests skipped)\n"
	@printf "  clean           Remove build artifacts\n"
	@printf "  check-lint      Run lint checks\n"
	@printf "  check-test      Run tests with Maven verify\n"
	@printf "  check-ci        Run CI-safe validation checks\n"
	@printf "  check           Run lint and tests\n"
	@printf "  test            Alias for check-test\n"
	@printf "  run             Start the mock OAuth server on MOCK_OAUTH_PORT\n"
	@printf "  build-container Build container image (requires docker)\n"
	@printf "\n"
	@printf "Variables:\n"
	@printf "  MOCK_OAUTH_PORT  Port for the mock OAuth server (default: 9000)\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:all; \
	else \
		"$(MAKE)" install build check; \
	fi
	@if command -v docker >/dev/null 2>&1; then \
		"$(MAKE)" build-container; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:install; \
	else \
		./mvnw dependency:resolve -q -B; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:build; \
	else \
		./mvnw package -q -DskipTests; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:clean; \
	else \
		./mvnw clean -q; \
	fi

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:check-lint; \
	else \
		echo "No additional lint configured for mock-oauth"; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:check-test; \
	else \
		./mvnw verify -q; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:check-ci; \
	else \
		"$(MAKE)" install build check-test; \
	fi
	@if command -v docker >/dev/null 2>&1; then \
		"$(MAKE)" build-container; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:check; \
	else \
		"$(MAKE)" check-lint check-test; \
	fi

run:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run mock-oauth:run; \
	else \
		MOCK_OAUTH_PORT="$(MOCK_OAUTH_PORT)" ./mvnw spring-boot:run -q; \
	fi

build-container:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE):latest" \
		.
