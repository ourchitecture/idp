.PHONY: help all install build build-stemix clean check-lint check-test check-stemix check-ci check test dev run

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
	@printf "  build-stemix  Build the standalone Stemix plugin packages\n"
	@printf "  clean         Remove build artifacts\n"
	@printf "  check-lint    Run lint checks\n"
	@printf "  check-test    Run type checks\n"
	@printf "  check-stemix  Run standalone Stemix plugin validation\n"
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
		cd "$(BACKSTAGE_ROOT)" && yarn install; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:build; \
	else \
		cd "$(BACKSTAGE_ROOT)" && yarn run build:all; \
	fi

build-stemix:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:build-stemix; \
	else \
		cd "$(BACKSTAGE_ROOT)" && yarn run build:stemix; \
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
		cd "$(BACKSTAGE_ROOT)" && yarn run fix:check; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check-test; \
	else \
		cd "$(BACKSTAGE_ROOT)" && yarn run typecheck && yarn run test:stemix; \
	fi

check-stemix:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check-stemix; \
	else \
		cd "$(BACKSTAGE_ROOT)" && yarn run check:stemix; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run backstage-tools:check-ci; \
	else \
		cd "$(BACKSTAGE_ROOT)" && "$(MAKE)" install build check-lint check-test; \
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
		cd "$(BACKSTAGE_ROOT)" && yarn run dev; \
	fi

run: dev
