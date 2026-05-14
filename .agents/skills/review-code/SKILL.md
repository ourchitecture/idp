---
name: review-code
version: 1.1.0
description: >
  Reviews code changes for quality, security, correctness, and adherence to
  repository standards. Validates style, tests, docs. Use before human review.
author: "@idp-maintain"
domain: devops
tags: [code-review, quality, security, validation, automation]
depends_on: []
inputs:
  - name: paths
    type: array
    required: false
    description: Specific paths to review. Default: working-tree changes.
  - name: pr_number
    type: number
    required: false
    description: PR to review (overrides working tree).
  - name: base_ref
    type: string
    required: false
    default: main
    description: Base branch for comparison.
  - name: include_security_scan
    type: boolean
    required: false
    default: true
    description: Run secret/privacy scanning on changed code.
  - name: strict_lint
    type: boolean
    required: false
    default: false
    description: Treat lint warnings as failures.
  - name: post_comment
    type: boolean
    required: false
    default: false
    description: If true (with pr_number), post findings as a PR comment.
outputs:
  - name: findings
    type: array
    description: Findings with severity, location, suggested fix.
  - name: overall_status
    type: string
    description: pass | warn | fail.
  - name: score
    type: number
    description: Quality score 0–100.
  - name: summary
    type: object
    description: Counts by category (style, security, bugs, docs, tests).
---

# Review Code

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).
Commit and PR title format: [../../docs/shared/commit-format.md](../../docs/shared/commit-format.md).

## 1. Scope

- If `pr_number`: MCP `pull_request_read` with `method: get_files`.
- Else if `paths`: review only those.
- Else: combine `git status --porcelain` + `git diff --name-only` (staged +
  unstaged). Filter to existing, non-binary files.

## 2. Classify

Source code (`.ts/.js/.go/.py/.java/…`), tests (`*.test.*`, `*.spec.*`,
`test`/`tests`/`__tests__` dirs), docs (`.md`), config
(`.json/.yaml/.yml/.toml`, manifests, lockfiles), build/CI (`Makefile`,
`moon.yml`, `.github/workflows/*.yml`), infrastructure (`Dockerfile`,
`docker-compose.yml`, `deploy/`).

## 3. Syntax and style validation

- Markdown: `moon run repo:check-lint-md` (never `markdownlint-cli2`
  directly — see [../../docs/ci-cd-make.md](../../docs/ci-cd-make.md)).
- TS/JS: stack lint task if defined.
- Go: `gofmt -l`, `go vet` for changed `.go` files.
- YAML: `yamllint` if available.
- Workflows: `moon run repo:check-lint-workflows` when workflow files change.

If `strict_lint=true`, warnings are failures.

## 4. Security/secret scan (conditional)

If `include_security_scan=true`: run `moon run repo:check-privacy`. Treat
detected secrets/credentials/PII as high-severity; recommend `.gitignore`
additions.

## 5. Code-pattern analysis

Source files: flag long/deep-nested functions, unclear naming, swallowed
errors, missing/outdated public-API docs, dead code. Heuristics; flag
medium/low by impact.

## 6. Test coverage check

For changed source: confirm corresponding tests exist or were updated.
Flag missing coverage. Do **not** run the full test suite — that's CI.

## 7. Documentation check

For changes to source/APIs/config/CLI/env-vars, confirm related `docs/`
updates exist. Flag missing/outdated docs by user impact.

## 8. Conventional Commits (PR only)

If `pr_number`: validate PR title against `<type>(<scope>): <subject>` and
check PR body for `Closes #N` / `Refs #N` when applicable. Full rules in
[../../docs/shared/commit-format.md](../../docs/shared/commit-format.md).

## 9. Score and status

Severity: **High** (security issues, syntax errors, broken imports,
secrets); **Medium** (code smells, missing tests, outdated docs,
complexity); **Low** (style, missing comments, clarity).

Score from 100: high `-20` (max `-60`), medium `-10` (max `-30`),
low `-5` (max `-20`). Clamp `[0,100]`.

- `fail` if any high; `warn` if only medium/low; `pass` if none.

## 10. Report

Return findings as `{severity, file, line, message, suggestion}` objects.
Sections: Summary (files, counts, score, status), Findings, Recommended
Actions.

## 11. Post PR comment (optional)

If `post_comment=true` and `pr_number`: MCP `add_issue_comment` (PRs use
the issue comment API). Fallback:
`gh pr comment <pr_number> --body "<report>"`.

## 12. Return

`findings`, `overall_status`, `score`, `summary`. If clean, return
`pass` / `100`.
