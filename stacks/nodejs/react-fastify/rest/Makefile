.PHONY: help all install build clean lint check-lint check-test check-contract check-ci check test test-contract e2e run-web run-bff build-container-web build-container-bff build-containers

ROOT_DIR := ../../../..
STACK_PATH := stacks/nodejs/react-fastify/rest
WEB_TEST_HOST := 127.0.0.1
BFF_TEST_HOST := 127.0.0.1
WEB_TEST_PORT := 3400
BFF_TEST_PORT := 8400
CONTAINER_LOCAL_PREFIX := localhost
CONTAINER_IMAGE_BASE := stemix-nodejs-react-fastify-rest

help:
	@printf "Targets:\n"
	@printf "  all           Run full stack verification flow\n"
	@printf "  install       Install dependencies for this stack\n"
	@printf "  build         Build stack artifacts\n"
	@printf "  clean         Remove local build artifacts\n"
	@printf "  check-lint    Run lint checks\n"
	@printf "  check-test    Run stack tests\n"
	@printf "  check-contract Run contract tests against this stack\n"
	@printf "  check-ci      Run CI-safe validation checks\n"
	@printf "  check         Run lint, tests, and contract checks\n"
	@printf "  test          Alias for check-test\n"
	@printf "  test-contract Alias for check-contract\n"
	@printf "  e2e           Start stack, wait for readiness, run e2e tests\n"
	@printf "  run-web       Start the web server\n"
	@printf "  run-bff       Start the BFF server\n"
	@printf "  build-container-web Build web container image (requires docker)\n"
	@printf "  build-container-bff Build BFF container image (requires docker)\n"
	@printf "  build-containers  Build all container images (requires docker)\n"

all: install build check

install:
	@npm --prefix "$(ROOT_DIR)" install
	@npm ci

build:
	@npm --prefix "$(ROOT_DIR)" run build:web:react-fastify

clean:
	@rm -rf web/dist

lint: check-lint

check-lint:
	@npm run lint:md

check-test:
	@npm --prefix "$(ROOT_DIR)" run typecheck:stack:react-fastify

test: check-test

check-ci: install build check-lint check-test

check: check-lint check-test check-contract

check-contract:
	@OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:web:react-fastify >/dev/null 2>&1 & WEB_PID=$$!; \
	OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify >/dev/null 2>&1 & BFF_PID=$$!; \
	trap 'kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true' EXIT; \
	sleep 3; \
	IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" IDP_STACK_PATH="$(STACK_PATH)" IDP_CONTRACT_PROFILES="core,operational,ui-profile" npm --prefix "$(ROOT_DIR)" run test:contract; \
	STATUS=$$?; \
	kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true; \
	wait $$WEB_PID $$BFF_PID 2>/dev/null || true; \
	exit $$STATUS

test-contract: check-contract

e2e:
	@STACK_PATH="$(STACK_PATH)" \
	WEB_START_CMD='OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:web:react-fastify' \
	BFF_START_CMD='OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify' \
	WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" \
	BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" \
	CONTRACT_PROFILES="core,operational,ui-profile" \
	ROOT_DIR="$(ROOT_DIR)" \
	bash "$(ROOT_DIR)/scripts/e2e/run-stack-e2e.sh"

run-web:
	@npm --prefix "$(ROOT_DIR)" run start:web:react-fastify

run-bff:
	@npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify

build-container-web:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-web:latest" \
		-f web/Dockerfile \
		"$(ROOT_DIR)"

build-container-bff:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-bff:latest" \
		-f bff/Dockerfile \
		"$(ROOT_DIR)"

build-containers: build-container-web build-container-bff
