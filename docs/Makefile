.PHONY: help all install build clean generate-diagrams check-diagrams check-lint check-test check-ci check run-dev run-serve

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

all: install build check

install:
	@npm ci

build:
	@npm run build

clean:
	@rm -rf build .docusaurus

generate-diagrams:
	@npm run generate:diagrams

check-diagrams:
	@npm run check:diagrams

check-lint:
	@npm run lint:md

check-test:
	@npm run typecheck

check-ci: install build generate-diagrams check-lint check-test

check: check-lint check-test

run-dev:
	@npm run start

run-serve:
	@npm run serve
