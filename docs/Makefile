.PHONY: help all install build clean generate-diagrams check-diagrams check-lint check-test check-ci check run-dev run-serve

PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

help:
	@printf "Targets:\n"
	@printf "  all           Run full docs verification flow\n"
	@printf "  install       Install dependencies for the docs site\n"
	@printf "  build         Build the static docs site\n"
	@printf "  clean         Remove local build artifacts\n"
	@printf "  generate-diagrams Generate architecture diagram SVG assets\n"
	@printf "  check-diagrams Validate architecture diagram generation pipeline\n"
	@printf "  check-lint    Run lint checks (markdown)\n"
	@printf "  check-test    Run type checks\n"
	@printf "  check-ci      Run CI-safe validation checks\n"
	@printf "  check         Run lint and type checks\n"
	@printf "  run-dev       Start Docusaurus dev server\n"
	@printf "  run-serve     Serve the built site locally\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:all; \
	else \
		"$(MAKE)" install build check; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:install; \
	else \
		PUPPETEER_SKIP_DOWNLOAD=true pnpm install --frozen-lockfile; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:build; \
	else \
		pnpm run build; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:clean; \
	else \
		rm -rf build .docusaurus; \
	fi

generate-diagrams:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:generate-diagrams; \
	else \
		pnpm run generate:diagrams; \
	fi

check-diagrams:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:check-diagrams; \
	else \
		pnpm run check:diagrams; \
	fi

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:check-lint; \
	else \
		pnpm run lint:md; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:check-test; \
	else \
		pnpm run typecheck; \
	fi

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:check-ci; \
	else \
		"$(MAKE)" install build check-diagrams check-lint check-test; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:check; \
	else \
		"$(MAKE)" check-diagrams check-lint check-test; \
	fi

run-dev:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:run-dev; \
	else \
		pnpm run start; \
	fi

run-serve:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run docs-site:run-serve; \
	else \
		pnpm run serve; \
	fi
