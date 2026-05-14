.PHONY: help all install build clean check-lint check-test check-ci check test dev run

# Backstage workspace root - ensure npm commands execute in the workspace context
BACKSTAGE_ROOT := $(shell pwd)
ROOT_DIR := ../..
TOOL_PATH := tools/backstage
PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all           Run full tool verification flow\n"
	@printf "  install       Install dependencies\n"
	@printf "  build         Build Backstage app\n"
	@printf "  clean         Remove build artifacts\n"
	@printf "  check-lint    Run lint checks\n"
	@printf "  check-test    Run type checks\n"
	@printf "  check-ci      Run CI-safe validation checks\n"
	@printf "  check         Run lint and tests\n"
	@printf "  test          Alias for check-test\n"
	@printf "  dev           Start Backstage dev servers\n"
	@printf "  run           Alias for dev\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:all; \
	else \
		cd "$(BACKSTAGE_ROOT)" && "$(MAKE)" install build check; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:install; \
	else \
		cd "$(BACKSTAGE_ROOT)" && npm install; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:build; \
	else \
		cd "$(BACKSTAGE_ROOT)" && npm run build:all; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:clean; \
	else \
		cd "$(BACKSTAGE_ROOT)" && rm -rf dist dist-types node_modules packages/*/dist packages/*/node_modules; \
	fi

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check-lint; \
	else \
		echo "No additional lint configured for backstage-tools"; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check-test; \
	else \
		cd "$(BACKSTAGE_ROOT)" && npm run typecheck; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check-ci; \
	else \
		cd "$(BACKSTAGE_ROOT)" && "$(MAKE)" install build check-test; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check; \
	else \
		cd "$(BACKSTAGE_ROOT)" && "$(MAKE)" check-lint check-test; \
	fi

dev:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:dev; \
	else \
		cd "$(BACKSTAGE_ROOT)" && npm run dev; \
	fi

run: dev
