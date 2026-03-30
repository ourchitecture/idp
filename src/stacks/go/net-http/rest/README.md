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

- `make -C src/stacks/go/net-http/rest install`
- `make -C src/stacks/go/net-http/rest build`
- `make -C src/stacks/go/net-http/rest clean`
- `make -C src/stacks/go/net-http/rest check-lint`
- `make -C src/stacks/go/net-http/rest check-test`
- `make -C src/stacks/go/net-http/rest check`
- `make -C src/stacks/go/net-http/rest test` (alias for `check-test`)
- `make -C src/stacks/go/net-http/rest run-web`
- `make -C src/stacks/go/net-http/rest run-bff`
- `make -C src/stacks/go/net-http/rest test-contract`

### Native Tooling Shortcuts

- `go test ./...`
- `go vet ./...`
- `go build -o .bin/idp-go-web ./web`
- `go build -o .bin/idp-go-bff ./bff`
