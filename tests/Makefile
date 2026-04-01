.PHONY: help build-container run-container

CONTAINER_LOCAL_PREFIX := localhost
CONTAINER_IMAGE_NAME := stemix-contract-tests
ROOT_DIR := ..

help:
	@printf "Targets:\n"
	@printf "  build-container   Build the contract test container image (requires docker)\n"
	@printf "  run-container     Run the contract tests container image (requires docker)\n"
	@printf "\n"
	@printf "Variables:\n"
	@printf "  IDP_WEB_URL       Web server URL passed to tests (default: http://localhost:3300)\n"
	@printf "  IDP_BFF_URL       BFF server URL passed to tests (default: http://localhost:8300)\n"
	@printf "  IDP_STACK_PATH    Stack path label passed to tests\n"

build-container:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker build \
		-t "$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_NAME):latest" \
		-f Dockerfile \
		"$(ROOT_DIR)"

run-container:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "ERROR: docker is required but not found in PATH" >&2; \
		exit 1; \
	fi
	@docker run --rm \
		-e IDP_WEB_URL="${IDP_WEB_URL:-http://localhost:3300}" \
		-e IDP_BFF_URL="${IDP_BFF_URL:-http://localhost:8300}" \
		-e IDP_STACK_PATH="${IDP_STACK_PATH:-}" \
		"$(CONTAINER_LOCAL_PREFIX)/$(CONTAINER_IMAGE_NAME):latest"
