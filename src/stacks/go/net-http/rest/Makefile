.PHONY: help install build clean lint check-lint check-test check test test-contract run-web run-bff build-web build-bff

ROOT_DIR := ../../../../..
BIN_DIR := .bin
STACK_PATH := src/stacks/go/net-http/rest
WEB_TEST_HOST := 127.0.0.1
BFF_TEST_HOST := 127.0.0.1
WEB_TEST_PORT := 3300
BFF_TEST_PORT := 8300

ifeq ($(OS),Windows_NT)
EXE := .exe
else
EXE :=
endif

WEB_BIN := $(BIN_DIR)/idp-go-web$(EXE)
BFF_BIN := $(BIN_DIR)/idp-go-bff$(EXE)

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
	@printf "  build-web     Build stable web executable\n"
	@printf "  build-bff     Build stable BFF executable\n"
	@printf "  run-web       Start the web server\n"
	@printf "  run-bff       Start the BFF server\n"

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

check: check-lint check-test test-contract

test-contract: build
	@OUR_IDP_WEB_HOST="$(WEB_TEST_HOST)" OUR_IDP_PORT="$(WEB_TEST_PORT)" env -- "$(WEB_BIN)" >/dev/null 2>&1 & WEB_PID=$$!; \
	OUR_IDP_API_HOST="$(BFF_TEST_HOST)" OUR_IDP_API_PORT="$(BFF_TEST_PORT)" env -- "$(BFF_BIN)" >/dev/null 2>&1 & BFF_PID=$$!; \
	trap 'kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true' EXIT; \
	sleep 2; \
	IDP_WEB_URL="http://$(WEB_TEST_HOST):$(WEB_TEST_PORT)" IDP_BFF_URL="http://$(BFF_TEST_HOST):$(BFF_TEST_PORT)" IDP_STACK_PATH="$(STACK_PATH)" npm --prefix "$(ROOT_DIR)" run test:contract; \
	STATUS=$$?; \
	kill $$WEB_PID $$BFF_PID >/dev/null 2>&1 || true; \
	wait $$WEB_PID $$BFF_PID 2>/dev/null || true; \
	exit $$STATUS

build-web:
	@mkdir -p "$(BIN_DIR)"
	@go build -o "$(WEB_BIN)" ./web

build-bff:
	@mkdir -p "$(BIN_DIR)"
	@go build -o "$(BFF_BIN)" ./bff

run-web: build-web
	@env -- "$(WEB_BIN)"

run-bff: build-bff
	@env -- "$(BFF_BIN)"
