.PHONY: help install build clean lint check-lint check-test check test test-contract run-web run-bff

ROOT_DIR := ../../../../..
STACK_PATH := src/stacks/nodejs/react-fastify/rest
WEB_TEST_HOST := 127.0.0.1
BFF_TEST_HOST := 127.0.0.1
WEB_TEST_PORT := 3400
BFF_TEST_PORT := 8400

help:
	@printf "Targets:\n"
	@printf "  install       Install dependencies for this stack\n"
	@printf "  build         Build stack artifacts\n"
	@printf "  clean         Remove local build artifacts\n"
	@printf "  check-lint    Run lint checks\n"
	@printf "  check-test    Run stack tests\n"
	@printf "  check         Run lint, tests, and contract checks\n"
	@printf "  test          Alias for check-test\n"
	@printf "  test-contract Run contract tests against this stack\n"
	@printf "  run-web       Start the web server\n"
	@printf "  run-bff       Start the BFF server\n"

install:
	@npm --prefix "$(ROOT_DIR)" install


build:
	@npm --prefix "$(ROOT_DIR)" run build:web:react-fastify

clean:
	@rm -rf web/dist

lint: check-lint

check-lint:
	@npm --prefix "$(ROOT_DIR)" run lint:md

check-test:
	@npm --prefix "$(ROOT_DIR)" run typecheck:stack:react-fastify

test: check-test

check: check-lint check-test test-contract

test-contract:
	@OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:web:react-fastify >/dev/null 2>&1 & WEB_PID=$$!; \
	OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify >/dev/null 2>&1 & BFF_PID=$$!; \
	trap 'kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true' EXIT; \
	sleep 3; \
	IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" IDP_STACK_PATH="$(STACK_PATH)" IDP_CONTRACT_PROFILES="core,operational,ui-profile" npm --prefix "$(ROOT_DIR)" run test:contract; \
	STATUS=$$?; \
	kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true; \
	wait $$WEB_PID $$BFF_PID 2>/dev/null || true; \
	exit $$STATUS

run-web:
	@npm --prefix "$(ROOT_DIR)" run start:web:react-fastify

run-bff:
	@npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify
