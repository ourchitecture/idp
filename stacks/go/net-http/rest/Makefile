.PHONY: help all install build clean lint check-lint check-test check-contract check-ci check test test-contract run-web run-bff setup-debug-tools build-web build-bff build-debug-web build-debug-bff build-container-web build-container-bff build-containers

ROOT_DIR := ../../../..
BIN_DIR := .bin
STACK_PATH := stacks/go/net-http/rest
WEB_TEST_HOST := 127.0.0.1
BFF_TEST_HOST := 127.0.0.1
WEB_TEST_PORT := 3300
BFF_TEST_PORT := 8300
CONTAINER_LOCAL_PREFIX := localhost
CONTAINER_IMAGE_BASE := stemix-go-net-http-rest
PROTO_HOME ?= $(HOME)/.proto
PROTO_BIN := $(PROTO_HOME)/bin/proto
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

all: install build check
	@if command -v docker >/dev/null 2>&1; then "$(MAKE)" build-containers; fi

install:
	@go mod download


build: build-web build-bff

clean:
	@rm -rf "$(BIN_DIR)"

lint: check-lint

check-lint:
	@go vet ./...

check-test:
	@go test ./...

test: check-test

check-ci: build check-lint check-test

check: check-lint check-test check-contract

check-contract: build
	@OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" env -- "$(WEB_BIN)" >/dev/null 2>&1 & WEB_PID=$$!; \
	OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" OUR_IDP_STATUS_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" env -- "$(BFF_BIN)" >/dev/null 2>&1 & BFF_PID=$$!; \
	trap 'kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true' EXIT; \
	sleep 2; \
	IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" IDP_STACK_PATH="$(STACK_PATH)" npm --prefix "$(ROOT_DIR)" run test:contract; \
	STATUS=$$?; \
	kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true; \
	wait $$WEB_PID $$BFF_PID 2>/dev/null || true; \
	exit $$STATUS

test-contract: check-contract

build-web:
	@mkdir -p "$(BIN_DIR)"
	@go build -o "$(WEB_BIN)" ./web

build-bff:
	@mkdir -p "$(BIN_DIR)"
	@go build -o "$(BFF_BIN)" ./bff

setup-debug-tools:
	@mkdir -p "$(BIN_DIR)"
	@if [ -x "$(PROTO_BIN)" ]; then \
		GOBIN="$(abspath $(BIN_DIR))" "$(PROTO_BIN)" run go -- install -v github.com/go-delve/delve/cmd/dlv@$(DLV_VERSION); \
	else \
		GOBIN="$(abspath $(BIN_DIR))" go install -v github.com/go-delve/delve/cmd/dlv@$(DLV_VERSION); \
	fi
	@if [ ! -x "$(DLV_BIN)" ]; then \
		echo "ERROR: delve install failed; expected $(DLV_BIN)" >&2; \
		exit 1; \
	fi

build-debug-web: setup-debug-tools
	@mkdir -p "$(BIN_DIR)"
	@go build -gcflags="all=-N -l" -o "$(WEB_BIN)" ./web

build-debug-bff: setup-debug-tools
	@mkdir -p "$(BIN_DIR)"
	@go build -gcflags="all=-N -l" -o "$(BFF_BIN)" ./bff

run-web: build-web
	@env -- "$(WEB_BIN)"

run-bff: build-bff
	@env -- "$(BFF_BIN)"

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
