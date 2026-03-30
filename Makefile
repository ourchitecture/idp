.PHONY: help install build clean lint check-lint check-test check test test-contract dev

DEFAULT_STACK := src/stacks/go/net-http/rest
STACK ?= $(DEFAULT_STACK)

help:
	@printf "Targets:\n"
	@printf "  install       Install dependencies for selected stack\n"
	@printf "  build         Build selected stack artifacts\n"
	@printf "  clean         Clean selected stack artifacts\n"
	@printf "  check-lint    Run selected stack lint checks\n"
	@printf "  check-test    Run selected stack tests\n"
	@printf "  check         Run lint, tests, and contract checks\n"
	@printf "  test          Alias for check\n"
	@printf "  test-contract Run contract tests for selected stack\n"
	@printf "  dev           Start selected stack (web + BFF)\n"
	@printf "\n"
	@printf "Variables:\n"
	@printf "  STACK  Override stack path (default: %s)\n" "$(DEFAULT_STACK)"

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

check: check-lint check-test test-contract

test: check

test-contract:
	@"$(MAKE)" -C "$(STACK)" test-contract

dev:
	@printf "Starting stack at %s\n" "$(STACK)"
	@"$(MAKE)" -C "$(STACK)" run-web & \
	"$(MAKE)" -C "$(STACK)" run-bff & \
	wait
