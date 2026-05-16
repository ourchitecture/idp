# Build, Lint, Test Commands

Make targets are **optional convenience wrappers** for canonical moon/pnpm
commands. Use any interchangeably.

## Repo-level

| Action | Moon (canonical) | Make (shortcut) |
| --- | --- | --- |
| Install deps | `pnpm install` | — |
| Install pinned toolchain | `proto install` | — |
| Privacy/secret scan | `moon run repo:check-privacy` | `make check-privacy` |
| Lint Markdown | `moon run repo:check-lint-md` | `make check-lint-md` |
| Lint workflows | — | `make check-lint-workflows` |
| Install workspace deps | `moon run repo:install` | — |
| Worktree path/ensure/cleanup/audit | `moon run repo:worktree-*` | `make worktree-*` |
| PR change-based plan | — | `BASE_SHA=… HEAD_SHA=… make check-pr-changes` |

## Stack run/dev (defaults)

| Action | Command |
| --- | --- |
| Run Go web | `pnpm run start:web` / `make run-web` |
| Run Go BFF | `pnpm run start:bff` / `make run-bff` |
| Run React web | `pnpm -C stacks/nodejs/react-fastify/rest run start:web` |
| Run React BFF | `pnpm -C stacks/nodejs/react-fastify/rest run start:bff` |
| Contract tests | `pnpm run test:contract` |
| Default web+BFF dev | `make dev` |
| Test running system | `make test` |
| Full build for all stacks | `make all` |
| CI-safe affected checks | `make ci` |
| CI-safe via moon | `moon ci go-net-http-rest:check-ci nodejs-react-fastify-rest:check-ci docs-site:check-ci` |

## Docs site

- Dev server: `moon run docs-site:run-dev`
- Build: `make -C docs build`
- Full validation: `make docs-site`
- Generate diagrams: `moon run docs-site:generate-diagrams` / `make -C docs generate-diagrams`
- Validate diagrams: `moon run docs-site:check-diagrams` / `make -C docs check-diagrams`

## MCP server

- Run HTTP: `make -C tools/mcp run-http`
- CI checks: `moon run mcp-tools:check-ci`
- Build container: `make -C tools/mcp build-container`
- Contract tests: `make -C tools/mcp check-contract`

## Moon project IDs

`repo`, `go-net-http-rest`, `nodejs-react-fastify-rest`, `contract-tests`,
`docs-site`, `mcp-tools`, `vscode-extension`, `backstage-tools`.

## Stack Makefile targets (per `stacks/<stack>/Makefile`)

`all`, `install`, `build`, `clean`, `check-lint`, `check-test`,
`check-contract`, `check-ci`, `check`, `test`, `test-contract`, `run-web`,
`run-bff`, `build-container-web`, `build-container-bff`, `build-containers`.

Container targets:

- Root: `make build-containers` (silently skips when docker not in PATH).
- Tests: `make -C tests build-container` / `make -C tests run-container`.

## Notes

- Markdown lint config: `.markdownlint.jsonc`, `.markdownlint-cli2.jsonc`.
- Docker is not managed by proto. Install separately. Container targets are
  opt-in and fail loudly if docker is absent.
- Docs install sets `PUPPETEER_SKIP_DOWNLOAD=true`; `check-diagrams` detects
  system Chrome at runtime via `PUPPETEER_EXECUTABLE_PATH` or common names.
