---
name: review-code
version: 1.0.0
description: >
  Reviews code changes for quality, security, correctness, and adherence
  to repository standards. Validates code style, tests, documentation,
  and potential issues. Use this skill to perform automated code review
  on changed files in a working tree or pull request before human review.
author: "@idp-maintain"
domain: devops
tags:
  - code-review
  - quality
  - security
  - validation
  - automation
depends_on: []
inputs:
  - name: paths
    type: array
    required: false
    description: >
      Specific file paths to review. If not provided, reviews all
      uncommitted changes in the working tree.
  - name: pr_number
    type: number
    required: false
    description: >
      Pull request number to review. If provided, reviews all changed
      files in the PR instead of local working tree.
  - name: base_ref
    type: string
    required: false
    default: main
    description: Base branch to compare against when reviewing changes.
  - name: include_security_scan
    type: boolean
    required: false
    default: true
    description: >
      Whether to run security and secret scanning on changed code.
  - name: strict_lint
    type: boolean
    required: false
    default: false
    description: >
      If true, treat linting warnings as failures.
  - name: post_comment
    type: boolean
    required: false
    default: false
    description: >
      If true and pr_number is provided, post review findings as PR
      comments.
outputs:
  - name: findings
    type: array
    description: >
      List of code review findings with severity, location, and
      suggested fixes.
  - name: overall_status
    type: string
    description: Overall review result: pass, warn, or fail.
  - name: score
    type: number
    description: Code quality score from 0 to 100.
  - name: summary
    type: object
    description: >
      Review summary with counts by category: style issues, security
      concerns, bugs, documentation gaps, and test coverage.
---

# Review Code

Reviews code changes for quality, security, and adherence to repository
conventions before human review.

## Step 1: Determine Review Scope

Identify which files to review based on the inputs:

1. If `pr_number` is provided, use GitHub MCP `pull_request_read` with
   `method: get_files` to list all changed files in the PR.
2. If `paths` is provided, review only those specific paths.
3. Otherwise, review all uncommitted changes in the working tree:

   ```bash
   git status --porcelain
   git diff --name-only
   git diff --cached --name-only
   ```

Combine unstaged and staged changes. Filter to files that exist and are
not binary.

## Step 2: Classify Changed Files

Group files by type for targeted review:

- **Source code**: `.ts`, `.js`, `.go`, `.py`, `.java`, etc.
- **Tests**: Files in `test`, `tests`, `__tests__` directories or
  matching `*.test.*`, `*.spec.*` patterns.
- **Documentation**: `.md` files.
- **Configuration**: `.json`, `.yaml`, `.yml`, `.toml`, package
  manifests, lock files.
- **Build and CI**: `Makefile`, `moon.yml`, `.github/workflows/*.yml`.
- **Infrastructure**: `Dockerfile`, `docker-compose.yml`, `deploy/`.

## Step 3: Run Syntax and Style Validation

For each file type, run appropriate linters and formatters:

- **Markdown**: `moon run repo:check-lint-md` (never invoke
  `markdownlint-cli2` directly).
- **TypeScript/JavaScript**: If the repo defines a lint task for the
  affected stack, run it.
- **Go**: `gofmt -l`, `go vet` for changed `.go` files.
- **YAML**: `yamllint` if available.
- **Workflows**: `moon run repo:check-lint-workflows` if workflow files
  changed.

Capture all violations. If `strict_lint` is true, treat warnings as
failures. Otherwise, warnings are advisory only.

## Step 4: Security and Secret Scanning (conditional)

If `include_security_scan` is true:

1. Run the repository privacy scan on changed files:

   ```bash
   moon run repo:check-privacy
   ```

2. Identify any detected secrets, credentials, API keys, tokens, or PII.
3. If secrets are found, add high-severity findings and recommend adding
   files to `.gitignore`.

## Step 5: Analyze Code Patterns and Quality

For source code files, analyze:

1. **Complexity**: Look for long functions, deep nesting, or high
   cyclomatic complexity.
2. **Naming**: Check for unclear variable/function names or inconsistent
   conventions.
3. **Error handling**: Verify that errors are handled and not silently
   swallowed.
4. **Documentation**: Check for missing or outdated comments on public
   APIs.
5. **Dead code**: Identify unused imports, variables, or functions.

This step uses heuristics and pattern matching. Flag issues as medium or
low severity depending on impact.

## Step 6: Check Test Coverage (conditional)

If the changed files are source code:

1. Identify corresponding test files following repository test
   conventions.
2. Check whether tests exist for new or modified source files.
3. If tests are missing or do not cover new functionality, add a finding
   recommending test additions.

Do not run the full test suite during review — that is a CI
responsibility. Only flag missing or clearly inadequate test coverage.

## Step 7: Check Documentation Updates

If source code, APIs, or configuration changed:

1. Check whether related documentation files in `docs/` need updates.
2. If the change touches public APIs, ensure corresponding docs exist or
   are updated.
3. If the change modifies CLI commands or environment variables, verify
   that documentation reflects the change.

Flag missing or outdated docs as low or medium severity depending on
user impact.

## Step 8: Validate Conventional Commit Style (PR only)

If `pr_number` is provided:

1. Fetch the PR title and body via GitHub MCP `pull_request_read` with
   `method: get`.
2. Validate that the PR title follows Conventional Commits format:
   `<type>(<scope>): <description>`.
3. Verify that the PR body contains issue references (`Closes #N` or
   `Refs #N`) when applicable.
4. Check that the description is clear and sufficient for review.

Add findings for any violations.

## Step 9: Score and Classify Findings

Assign severity to each finding:

- **High**: Security issues, syntax errors, broken imports, secrets.
- **Medium**: Code smells, missing tests, outdated docs, complexity
  issues.
- **Low**: Style inconsistencies, missing comments, minor clarity
  improvements.

Calculate a quality score starting from 100:

- High: `-20` each (max penalty 60)
- Medium: `-10` each (max penalty 30)
- Low: `-5` each (max penalty 20)

Clamp final score to `[0, 100]`.

Set `overall_status`:

- `fail` if any high-severity finding exists
- `warn` if no high findings but medium/low findings exist
- `pass` if no findings exist

## Step 10: Generate Review Report

Produce a structured report:

1. **Summary**: Total files reviewed, findings by severity, final score
   and status.
2. **Findings**: Each finding with severity, file path, line number (if
   applicable), description, and suggested fix.
3. **Recommended Actions**: Prioritized list of fixes.

Example finding structure:

```json
{
  "severity": "high",
  "file": "src/auth/handler.ts",
  "line": 42,
  "message": "API key exposed in source code",
  "suggestion": "Move credentials to environment variables and add to .gitignore"
}
```

## Step 11: Post PR Comment (conditional)

If `post_comment` is true and `pr_number` is provided:

1. Format the review report as a GitHub-flavored Markdown comment.
2. Post the comment using GitHub MCP `add_issue_comment` (PRs are issues
   for comment purposes).

Fallback:

```bash
gh pr comment <pr_number> --body "<review_report_markdown>"
```

The comment should start with a clear header:

```markdown
## 🤖 Automated Code Review

> Posted by AI agent. Review findings below.
```

## Step 12: Return Outputs

Return:

- `findings` array
- `overall_status`
- `score`
- `summary` object with counts by category

If no issues found, return a passing status and a score of 100 with an
explicit statement that the code passes automated review checks.

## Definition of Done

This skill is complete when:

1. All in-scope files have been reviewed.
2. Findings are categorized by severity and include actionable guidance.
3. A quality score and overall status are computed.
4. If `post_comment` was true, the review comment was successfully
   posted to the PR.
