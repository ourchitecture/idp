.PHONY: help all install build clean check-lint check-test check-contract check-ci check test package

ROOT_DIR := ../..
TOOL_PATH := tools/vscode-extension
PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all           Run full tool verification flow\n"
	@printf "  install       Install dependencies\n"
	@printf "  build         Compile TypeScript\n"
	@printf "  clean         Remove build artifacts and dependencies\n"
	@printf "  check-lint    Run lint checks\n"
	@printf "  check-test    Run type checks\n"
	@printf "  check-contract Run contract tests (none configured)\n"
	@printf "  check-ci      Run CI-safe validation checks\n"
	@printf "  check         Run lint and tests\n"
	@printf "  test          Alias for check-test\n"
	@printf "  package       Package extension as VSIX\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:all; \
	else \
		"$(MAKE)" install build check; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:install; \
	else \
		pnpm -C "$(ROOT_DIR)" install; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:build; \
	else \
		pnpm run build; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:clean; \
	else \
		rm -rf dist node_modules *.vsix; \
	fi

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:check-lint; \
	else \
		echo "No additional lint configured for vscode-extension"; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:check-test; \
	else \
		pnpm run typecheck; \
	fi

test: check-test

check-contract:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:check-contract; \
	else \
		echo "No contract tests configured for vscode-extension"; \
	fi

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:check-ci; \
	else \
		"$(MAKE)" install build check-test; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:check; \
	else \
		"$(MAKE)" check-lint check-test; \
	fi

package:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run vscode-extension:package; \
	else \
		pnpm run package; \
	fi
