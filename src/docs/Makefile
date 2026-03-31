.PHONY: help all install build clean check-lint check-test check-ci check run-dev run-serve

ROOT_DIR := ../../..
DOCS_PATH := src/docs

help:
	@printf "Targets:\n"
	@printf "  all           Run full docs verification flow\n"
	@printf "  install       Install dependencies for the docs site\n"
	@printf "  build         Build the static docs site\n"
	@printf "  clean         Remove local build artifacts\n"
	@printf "  check-lint    Run lint checks (markdown)\n"
	@printf "  check-test    Run type checks\n"
	@printf "  check-ci      Run CI-safe validation checks\n"
	@printf "  check         Run lint and type checks\n"
	@printf "  run-dev       Start Docusaurus dev server\n"
	@printf "  run-serve     Serve the built site locally\n"

all: install build check

install:
	@npm install

build:
	@npm run build

clean:
	@rm -rf build .docusaurus

check-lint:
	@npm --prefix "$(ROOT_DIR)" run lint:md

check-test:
	@npm run typecheck

check-ci: install build check-lint check-test

check: check-lint check-test

run-dev:
	@npm run start

run-serve:
	@npm run serve
