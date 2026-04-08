.PHONY: help all install build clean lint check-lint check-test check-contract check-ci check test test-contract run-web run-bff setup-debug-tools build-web build-bff build-debug-web build-debug-bff build-container-web build-container-bff build-containers check-java build-mock-oauth check-contract-auth

ROOT_DIR := ../../../..
BIN_DIR := .bin
STACK_PATH := stacks/go/net-http/rest
WEB_TEST_HOST := 127.0.0.1
BFF_TEST_HOST := 127.0.0.1
WEB_TEST_PORT := 3300
BFF_TEST_PORT := 8300
MOCK_OAUTH_DIR := $(ROOT_DIR)/tools/mock-oauth
MOCK_OAUTH_JAR := $(MOCK_OAUTH_DIR)/target/mock-oauth.jar
OUR_IDP_OAUTH_MOCK_PORT ?= 9000
CONTAINER_LOCAL_PREFIX := localhost/ourchitecture/idp
CONTAINER_IMAGE_BASE := stemix-go-net-http-rest
PROTO_HOME ?= $(HOME)/.proto
PROTO_BIN := $(PROTO_HOME)/bin/proto
MOON_BIN := $(PROTO_HOME)/shims/moon
DLV_VERSION ?= v1.25.2

ifeq ($(OS),Windows_NT)
EXE := .exe
else
EXE :=
endif

WEB_BIN := $(BIN_DIR)/idp-go-web$(EXE)
BFF_BIN := $(BIN_DIR)/idp-go-bff$(EXE)
DLV_BIN := $(BIN_DIR)/dlv$(EXE)

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
	@printf "  build-web     Build stable web executable\n"
	@printf "  build-bff     Build stable BFF executable\n"
	@printf "  setup-debug-tools Ensure delve debugger for F5 workflows\n"
	@printf "  build-debug-web Build web executable with debug symbols\n"
	@printf "  build-debug-bff Build BFF executable with debug symbols\n"
	@printf "  run-web       Start the web server\n"
	@printf "  build-container-web Build web container image (requires docker)\n"
	@printf "  build-container-bff Build BFF container image (requires docker)\n"
	@printf "  build-containers  Build all container images (requires docker)\n"
	@printf "  check-java        Verify java is in PATH (fail fast with install hint)\n"
	@printf "  build-mock-oauth  Build the mock OAuth JAR (requires java)\n"
	@printf "  check-contract-auth Run auth-profile end-to-end contract validation\n"

all:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:all; \
	else \
		"$(MAKE)" install build check; \
	fi
	@if command -v docker >/dev/null 2>&1; then "$(MAKE)" build-containers; fi

install:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:install; \
	else \
		go mod download; \
	fi

build:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:build; \
	else \
		"$(MAKE)" build-web build-bff; \
	fi

clean:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:clean; \
	else \
		rm -rf "$(BIN_DIR)"; \
	fi

lint: check-lint

check-lint:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:check-lint; \
	else \
		go vet ./...; \
	fi

check-test:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:check-test; \
	else \
		go test ./...; \
	fi

test: check-test

check-ci:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:check-ci; \
	else \
		"$(MAKE)" build check-lint check-test; \
	fi

check:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:check; \
	else \
		"$(MAKE)" check-lint check-test check-contract; \
	fi

check-contract:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:check-contract; \
	else \
		"$(MAKE)" build-web build-bff; \
		STACK_PATH="$(STACK_PATH)" \
		WEB_START_CMD='OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" env -- "$(abspath $(WEB_BIN))"' \
		BFF_START_CMD='OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" OUR_IDP_STATUS_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" env -- "$(abspath $(BFF_BIN))"' \
		WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" \
		BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" \
		ROOT_DIR="$(ROOT_DIR)" \
		python3 "$(ROOT_DIR)/scripts/ci/run-contract-check.py"; \
	fi

test-contract: check-contract

build-web:
	@mkdir -p "$(BIN_DIR)"
	@go build -o "$(WEB_BIN)" ./web

build-bff:
	@mkdir -p "$(BIN_DIR)"
	@go build -o "$(BFF_BIN)" ./bff

setup-debug-tools:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:setup-debug-tools; \
	else \
		mkdir -p "$(BIN_DIR)"; \
		if [ -x "$(PROTO_BIN)" ]; then \
			GOBIN="$(abspath $(BIN_DIR))" "$(PROTO_BIN)" run go -- install -v github.com/go-delve/delve/cmd/dlv@$(DLV_VERSION); \
		else \
			GOBIN="$(abspath $(BIN_DIR))" go install -v github.com/go-delve/delve/cmd/dlv@$(DLV_VERSION); \
		fi; \
		if [ ! -x "$(DLV_BIN)" ]; then \
			echo "ERROR: delve install failed; expected $(DLV_BIN)" >&2; \
			exit 1; \
		fi; \
	fi

build-debug-web:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:build-debug-web; \
	else \
		"$(MAKE)" setup-debug-tools; \
		mkdir -p "$(BIN_DIR)"; \
		go build -gcflags="all=-N -l" -o "$(WEB_BIN)" ./web; \
	fi

build-debug-bff:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:build-debug-bff; \
	else \
		"$(MAKE)" setup-debug-tools; \
		mkdir -p "$(BIN_DIR)"; \
		go build -gcflags="all=-N -l" -o "$(BFF_BIN)" ./bff; \
	fi

run-web:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:run-web; \
	else \
		"$(MAKE)" build-web; \
		env -- "$(WEB_BIN)"; \
	fi

run-bff:
	@if [ -x "$(MOON_BIN)" ]; then \
		"$(MOON_BIN)" run go-net-http-rest:run-bff; \
	else \
		"$(MAKE)" build-bff; \
		env -- "$(BFF_BIN)"; \
	fi

build-container-web:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		--build-arg SERVICE=web \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-web:latest" \
		-f Dockerfile \
		.

build-container-bff:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		--build-arg SERVICE=bff \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_BASE)-bff:latest" \
		-f Dockerfile \
		.

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
		"$(MOON_BIN)" run go-net-http-rest:check-contract-auth; \
	else \
		"$(MAKE)" build-web build-bff build-mock-oauth; \
		STACK_PATH="$(STACK_PATH)" \
		WEB_START_CMD='OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" env -- "$(abspath $(WEB_BIN))"' \
		BFF_START_CMD='OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" OUR_IDP_STATUS_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" OUR_IDP_OAUTH_PROVIDER=mock OUR_IDP_OAUTH_MOCK_PORT="$(OUR_IDP_OAUTH_MOCK_PORT)" OUR_IDP_OAUTH_REDIRECT_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)/auth/callback" env -- "$(abspath $(BFF_BIN))"' \
		MOCK_OAUTH_START_CMD='java -jar "$(abspath $(MOCK_OAUTH_JAR))"' \
		MOCK_OAUTH_URL="http://127.0.0.1:$(OUR_IDP_OAUTH_MOCK_PORT)" \
		WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" \
		BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" \
		CONTRACT_PROFILES=auth-profile \
		ROOT_DIR="$(ROOT_DIR)" \
		python3 "$(ROOT_DIR)/scripts/ci/run-contract-check.py"; \
	fi
