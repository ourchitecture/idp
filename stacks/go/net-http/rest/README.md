# Go net/http (REST)

This stack is the default and canonical reference implementation for the IDP
portal runtime. It uses the Go standard library `net/http` package for both the
web server and the BFF server.

## Components

- **Web**: Go `net/http` server for the web tier
- **BFF**: Go `net/http` server for REST endpoints

## Port Contract

- Web default: `3000` (`OUR_IDP_PORT` then `PORT` override)
- BFF default: `8000` (`OUR_IDP_API_PORT` override)

## Host Contract

- Web default host: `127.0.0.1` (override with `OUR_IDP_WEB_HOST`)
- BFF default host: `127.0.0.1` (override with `OUR_IDP_API_HOST`)

## Contract Profiles

- `core`
- `operational`

This stack does not declare UI capability and does not run `ui-profile` tests.

## Platform Note

Default run targets build and execute stable binaries in `.bin/` to avoid
ephemeral executable paths and repeated trust prompts on Windows.

## Commands

Moon (maintainer/CI canonical):

- `moon run go-net-http-rest:all`
- `moon run go-net-http-rest:check-ci`
- `moon run go-net-http-rest:check-contract`
- `moon run go-net-http-rest:run-web`
- `moon run go-net-http-rest:run-bff`
- `moon run go-net-http-rest:setup-debug-tools`
- `moon run go-net-http-rest:build-debug-web`
- `moon run go-net-http-rest:build-debug-bff`

GNU Make (compatibility):

- `make -C stacks/go/net-http/rest all`
- `make -C stacks/go/net-http/rest install`
- `make -C stacks/go/net-http/rest build`
- `make -C stacks/go/net-http/rest clean`
- `make -C stacks/go/net-http/rest check-lint`
- `make -C stacks/go/net-http/rest check-test`
- `make -C stacks/go/net-http/rest check-contract`
- `make -C stacks/go/net-http/rest check-ci`
- `make -C stacks/go/net-http/rest check`
- `make -C stacks/go/net-http/rest test` (alias for `check-test`)
- `make -C stacks/go/net-http/rest run-web`
- `make -C stacks/go/net-http/rest run-bff`
- `make -C stacks/go/net-http/rest test-contract` (alias for `check-contract`)
- `make -C stacks/go/net-http/rest setup-debug-tools`
- `make -C stacks/go/net-http/rest build-debug-web`
- `make -C stacks/go/net-http/rest build-debug-bff`

### Native Tooling Shortcuts

- `go test ./...`
- `go vet ./...`
- `go build -o .bin/idp-go-web ./web`
- `go build -o .bin/idp-go-bff ./bff`

## Container Images

Container images are built from the `Dockerfile` at the stack root using a
`SERVICE` build arg to select `web` or `bff`.

### Prerequisites

- Docker (or compatible runtime such as Rancher Desktop with dockerd/moby)

### Build

```bash
make -C stacks/go/net-http/rest build-container-web
make -C stacks/go/net-http/rest build-container-bff
make -C stacks/go/net-http/rest build-containers
```

### Run

```bash
docker run --rm -p 3300:3300 localhost/stemix-go-net-http-rest-web:latest
docker run --rm -p 8300:8300 localhost/stemix-go-net-http-rest-bff:latest
```

### Environment Variables

Containers default to `0.0.0.0` host binding (overriding the native-dev
`127.0.0.1` loopback default per ADR-0006).

- `OUR_IDP_WEB_HOST` / `OUR_IDP_API_HOST` — bind address (default `0.0.0.0`)
- `OUR_IDP_PORT` — web port (default `3300`)
- `OUR_IDP_API_PORT` — BFF port (default `8300`)

### Published Images

- `ghcr.io/ourchitecture/idp/stemix-go-net-http-rest-web`
- `ghcr.io/ourchitecture/idp/stemix-go-net-http-rest-bff`
