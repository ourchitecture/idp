# Cross-Platform Developer Experience

Local startup must be smooth on Windows, macOS, and Linux.

## Defaults

- Default local `run-web` and `run-bff` should bind to loopback (`127.0.0.1`)
  to reduce OS firewall interruptions and accidental LAN exposure.
- LAN, container, or remote-device exposure must be explicit and opt-in via
  documented environment overrides.
- Compiled-language stacks should avoid ephemeral executable paths for
  default local run targets on Windows (e.g., repeated `go run` temp
  executables); prefer stable repo-local binary paths.

## Windows specifics

- Prefer PowerShell-native commands for Windows-first workflows.
- Use an explicit Git Bash path for Bash-based repo helpers; don't rely on
  a bare `bash` resolution (may point at WSL or another unintended runtime).
- On PowerShell, when an interactive Bash shell is needed, first try
  `& "C:\Program Files\Git\bin\bash.exe" --login -i` before plain `bash`.

## Helpers

- When a helper would otherwise need separate Bash and PowerShell
  implementations, prefer one portable Python or Node.js script with thin
  task wrappers over duplicating shell logic.

## Bash tool calls (Claude Code)

- Do not prefix Bash tool commands with `cd <path> &&`. The working
  directory is already the repo root, and the `cd` prefix breaks permission
  allowlist patterns (`Bash(git *)` will not match `cd ... && git ...`).
- To run in a subdirectory, either issue a separate `cd` command first or
  pass absolute/relative paths as arguments.

## Documentation

Platform caveats and first-run behavior must be documented alongside run
commands for each stack.
