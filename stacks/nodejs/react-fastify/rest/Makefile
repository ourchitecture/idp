.PHONY: help all install build clean lint check-lint check-test check-contract check-ci check test test-contract e2e run-web run-bff build-container-web build-container-bff build-containers check-java build-mock-oauth check-contract-auth

ROOT_DIR := ../../../..
STACK_PATH := stacks/nodejs/react-fastify/rest
WEB_TEST_HOST := 127.0.0.1
BFF_TEST_HOST := 127.0.0.1
WEB_TEST_PORT := 3400
BFF_TEST_PORT := 8400
MOCK_OAUTH_DIR := $(ROOT_DIR)/tools/mock-oauth
MOCK_OAUTH_JAR := $(MOCK_OAUTH_DIR)/target/mock-oauth.jar
OUR_IDP_OAUTH_MOCK_PORT ?= 9000
CONTAINER_LOCAL_PREFIX := localhost/ourchitecture/idp
CONTAINER_IMAGE_BASE := stemix-nodejs-react-fastify-rest
PROTO_HOME ?= $(HOME)/.proto
MOON_BIN := $(PROTO_HOME)/shims/moon

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
	@printf "  check-java        Verify java is in PATH (fail fast with install hint)\n"
	@printf "  build-mock-oauth  Build the mock OAuth JAR (requires java)\n"
	@printf "  check-contract-auth Run auth-profile end-to-end contract validation\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:all; \
	else \
		"$(MAKE)" install build check; \
	fi
	@if command -v docker >/dev/null 2>&1; then \
		"$(MAKE)" build-containers; \
	fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:install; \
	else \
		npm --prefix "$(ROOT_DIR)" install; \
		npm ci; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:build; \
	else \
		npm --prefix "$(ROOT_DIR)" run build:web:react-fastify; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:clean; \
	else \
		rm -rf web/dist; \
	fi

lint: check-lint

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:check-lint; \
	else \
		npm run lint:md; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:check-test; \
	else \
		npm --prefix "$(ROOT_DIR)" run test:stack:react-fastify; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:check-ci; \
	else \
		"$(MAKE)" install build check-lint check-test; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:check; \
	else \
		"$(MAKE)" check-lint check-test check-contract; \
	fi

check-contract:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:check-contract; \
	else \
		"$(MAKE)" -C "$(MOCK_OAUTH_DIR)" build; \
		OUR_IDP_STACK_PATH="$(STACK_PATH)" \
		OUR_IDP_WEB_START_CMD='OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:web:react-fastify' \
		OUR_IDP_BFF_START_CMD='OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" OUR_IDP_STATUS_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" OUR_IDP_OAUTH_PROVIDER=mock OUR_IDP_OAUTH_MOCK_PORT="$(OUR_IDP_OAUTH_MOCK_PORT)" OUR_IDP_OAUTH_CLIENT_ID=mock-client-id OUR_IDP_OAUTH_CLIENT_SECRET=mock-client-secret OUR_IDP_OAUTH_REDIRECT_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)/auth/callback" npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify' \
		OUR_IDP_MOCK_OAUTH_START_CMD='java -jar "$(abspath $(MOCK_OAUTH_JAR))"' \
		OUR_IDP_MOCK_OAUTH_URL="http://127.0.0.1:$(OUR_IDP_OAUTH_MOCK_PORT)" \
		OUR_IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" \
		OUR_IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" \
		OUR_IDP_CONTRACT_PROFILES="core,operational,status-profile,ui-profile" \
		OUR_IDP_ROOT_DIR="$(ROOT_DIR)" \
		python3 "$(ROOT_DIR)/scripts/ci/run-contract-check.py"; \
	fi

test-contract: check-contract

e2e:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:e2e; \
	else \
		OUR_IDP_STACK_PATH="$(STACK_PATH)" \
		OUR_IDP_WEB_START_CMD='OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:web:react-fastify' \
		OUR_IDP_BFF_START_CMD='OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" OUR_IDP_STATUS_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify' \
		OUR_IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" \
		OUR_IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" \
		OUR_IDP_CONTRACT_PROFILES="core,operational,status-profile,ui-profile" \
		OUR_IDP_ROOT_DIR="$(ROOT_DIR)" \
		bash "$(ROOT_DIR)/scripts/e2e/run-stack-e2e.sh"; \
	fi

run-web:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:run-web; \
	else \
		npm --prefix "$(ROOT_DIR)" run start:web:react-fastify; \
	fi

run-bff:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:run-bff; \
	else \
		npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify; \
	fi

build-container-web:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@echo "==> Building container: $(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-web:latest"
	@docker build \
		--progress=plain \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-web:latest" \
		-f web/Dockerfile \
		"$(ROOT_DIR)"
	@echo "==> Done: $(CONTAINER_IMAGE_BASE)-web"

build-container-bff:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@echo "==> Building container: $(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-bff:latest"
	@docker build \
		--progress=plain \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-bff:latest" \
		-f bff/Dockerfile \
		"$(ROOT_DIR)"
	@echo "==> Done: $(CONTAINER_IMAGE_BASE)-bff"

build-containers: build-container-web build-container-bff

check-java:
	@if ! command -v java >/dev/null 2>&1; then \
		echo "ERROR: java is required but not found in PATH." >&2; \
		echo "  Install Java 21 or later: https://adoptium.net/" >&2; \
		exit 1; \
	fi

build-mock-oauth: check-java
	@"$(MAKE)" -C "$(MOCK_OAUTH_DIR)" build

check-contract-auth:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run nodejs-react-fastify-rest:check-contract-auth; \
	else \
		"$(MAKE)" build-mock-oauth; \
		OUR_IDP_STACK_PATH="$(STACK_PATH)" \
		OUR_IDP_WEB_START_CMD='OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" npm --prefix "$(ROOT_DIR)" run start:web:react-fastify' \
		OUR_IDP_BFF_START_CMD='OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" OUR_IDP_STATUS_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" OUR_IDP_OAUTH_PROVIDER=mock OUR_IDP_OAUTH_MOCK_PORT="$(OUR_IDP_OAUTH_MOCK_PORT)" OUR_IDP_OAUTH_REDIRECT_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)/auth/callback" npm --prefix "$(ROOT_DIR)" run start:bff:react-fastify' \
		OUR_IDP_MOCK_OAUTH_START_CMD='java -jar "$(abspath $(MOCK_OAUTH_JAR))"' \
		OUR_IDP_MOCK_OAUTH_URL="http://127.0.0.1:$(OUR_IDP_OAUTH_MOCK_PORT)" \
		OUR_IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" \
		OUR_IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" \
		OUR_IDP_CONTRACT_PROFILES=auth-profile \
		OUR_IDP_ROOT_DIR="$(ROOT_DIR)" \
		python3 "$(ROOT_DIR)/scripts/ci/run-contract-check.py"; \
	fi
