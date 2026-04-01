---
sidebar_position: 5
---

# Security Guide

This guide explains how Stemix keeps sensitive data out of source control and
how maintainers can run reproducible privacy/security checks locally and in CI.

## Why this exists

The repository includes analytics configuration, contract fixtures, and
multi-stack runtime code. That creates risk for accidental secret exposure,
privacy regressions, and unintended tracking behavior. The security checks here
provide an automated baseline that protects both personal and organizational
data.

## Toolchain prerequisites

Use the pinned toolchain from `.prototools`:

```bash
proto install
```

Pinned security-tooling prerequisites:

- `go` for `gitleaks` execution via `proto run go -- run ...`
- `python` and `uv` for `semgrep` execution via `uv tool run`

Moon-facing Python integration uses `unstable_python` and `unstable_uv`
toolchains, backed by `.prototools [plugins.tools]` mappings.

No global `pip install` step is required.

## Privacy and secret scanning

Run the canonical privacy scan:

```bash
# moon canonical
moon run repo:check-privacy

# make convenience shortcut
make check-privacy
```

This runs:

- `gitleaks` filesystem scan (working tree)
- `gitleaks` git-history scan
- `semgrep` secrets ruleset (`p/secrets`)
- targeted checks for sensitive logging patterns
- targeted checks for analytics initialization boundaries

Generated reports are written to `.tmp/privacy-scan/`.

## Python environment approach

Python tooling is executed with `uv` using ephemeral isolated environments
(`uv tool run`). This avoids dependency drift and global-site-package conflicts.

If you need a persistent local environment for debugging scanner behavior:

```bash
proto run uv -- venv .venv/privacy
proto run uv -- pip install --python .venv/privacy/Scripts/python.exe semgrep==1.157.0
```

The canonical workflow remains `make check-privacy` or
`moon run repo:check-privacy`.

## Troubleshooting

- If `proto` is missing, install proto first and rerun `proto install`.
- If scans are slow, verify `.tmp/` and `.moon/cache/` remain ignored by your
  local scan inputs.
- If a finding is expected and non-sensitive, document a scoped allowlist entry
  in `.gitleaks.toml` with rationale in the related issue/PR.
