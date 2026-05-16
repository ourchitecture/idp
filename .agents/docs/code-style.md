# Code Style

## General

- Match existing patterns before introducing new ones.
- Default to ASCII; keep diffs focused and minimal.
- Clarity over cleverness; avoid magic behavior.
- Keep public APIs versioned; document schema changes.

## Imports

- Order: standard libs, third-party, internal modules.
- Use type-only imports when supported.
- Avoid deep relative paths; prefer module-level entry points.

## Formatting

- Follow existing formatting; do not reformat unrelated code.
- Markdown must pass markdownlint; long lines allowed.
- Consistent indentation and line endings within a file.
- Keep markdown files markdownlint-compliant (headings, blank lines, list spacing).
- In Makefiles and shell snippets, wrap executable paths and variables in
  double quotes for spaces on Windows Git Bash:
  `"$(MAKE)" -C "$(STACK)" run-web`.

## Types

- Prefer explicit types at module boundaries and public APIs.
- Avoid `any`; use narrow types and discriminated unions.
- Use `unknown` with validation for external input.

## Naming

- `camelCase` for variables/functions, `PascalCase` for types/classes.
- `SCREAMING_SNAKE_CASE` for true constants.
- Intent-revealing names; avoid abbreviations unless common.

## Error handling

- Fail fast on invalid input; validate boundaries.
- Wrap external errors with context; do not swallow exceptions.
- Return structured error info for APIs; don't leak secrets.

## Logging and observability

- Structured JSON logs with correlation IDs.
- Don't log secrets or PII.
- Prefer OpenTelemetry-friendly patterns for tracing.

## CLI and Script Invocations

- Prefer long-form flags in scripts and code files (`--silent` not `-s`,
  `--output` not `-o`) for readability and self-documentation.
- Apply only where the long form is cross-platform: `curl`, `docker`, and
  `grep`/`git grep` long forms work on both GNU/Linux and BSD/macOS.
- Do NOT expand: `sed -E`, `tr -d`, `tail -n`, `cut -d`, `cut -f` — BSD
  variants on macOS do not support long-form equivalents; keep the
  single-letter flags for these tools.
- The `-C` flag for `make` has no long-form equivalent; keep it.
