---
name: privacy-scan
version: 1.0.0
description: >
  Runs repository privacy and sensitive-data scanning for both personal and
  organizational risk across docs, tests, and implementation stacks using FOSS
  tools (gitleaks and semgrep) through canonical moon/make tasks. Produces a
  triage report with findings, impact, and remediation actions.
author: "@idp-maintain"
domain: security
tags:
  - privacy
  - security
  - secrets
  - pii
  - semgrep
  - gitleaks
  - moon
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: false
    description: >
      Optional GitHub Issue number to post the final privacy scan report as a
      comment.
  - name: strict
    type: boolean
    required: false
    default: true
    description: >
      When true, treat any scanner finding as a blocking failure. When false,
      include findings in the report without failing the workflow.
  - name: include_history
    type: boolean
    required: false
    default: true
    description: >
      Whether to include git-history leakage analysis in addition to current
      working-tree scanning.
outputs:
  - name: report
    type: object
    description: >
      Structured privacy scan summary including tooling status, finding counts,
      severity, and remediation actions.
  - name: findings
    type: array
    description: Flattened list of findings with source tool, location, and severity.
  - name: artifacts
    type: array
    description: Generated report artifacts (SARIF/JSON) under .tmp/privacy-scan/.
---

# Privacy Scan

Run privacy-focused scanning for personal and organizational exposure using the
repository's canonical tooling integration.

## Step 1: Prepare pinned toolchain

Install pinned tools from `.prototools`:

```bash
proto install
```

Expected relevant toolchain components:

- `go` (for gitleaks execution)
- `python` and `uv` (for semgrep execution with isolated environments)

## Step 2: Run canonical privacy scan

Use the repo task (moon canonical):

```bash
moon run repo:check-privacy
```

Fallback:

```bash
make check-privacy
```

The canonical scan runs:

1. gitleaks filesystem scan
2. gitleaks git-history scan
3. semgrep `p/secrets` ruleset
4. targeted checks for sensitive logging patterns
5. targeted checks for analytics initialization boundaries

## Step 3: Collect generated artifacts

Read scanner artifacts from `.tmp/privacy-scan/`:

- `gitleaks-report.sarif`
- `gitleaks-git-report.sarif`
- `semgrep-secrets.json`

If `include_history` is false, ignore history findings from
`gitleaks-git-report.sarif` in the final classification.

## Step 4: Classify findings

Classify findings into privacy risk categories:

1. **Secrets exposure**: API keys, tokens, credentials, private keys.
2. **PII exposure**: logs or persisted data containing email, phone, session,
   authorization, cookie, or other personal identifiers.
3. **Tracking governance drift**: analytics initialization outside explicit
   consent boundaries.
4. **Operational privacy gaps**: telemetry/logging behavior that can expose
   user or organizational sensitive data.

Severity guidance:

- `critical`: active credential leak or broad PII exposure.
- `high`: historical credential leak or high-confidence sensitive log pattern.
- `medium`: likely privacy regression needing code hardening.
- `low`: hardening recommendation without active evidence.

## Step 5: Produce report

Return a structured report containing:

- Scan timestamp and repository context
- Toolchain versions used (go/python/uv/semgrep/gitleaks)
- Findings grouped by severity and category
- Affected file paths
- Remediation actions and owner recommendations

Use this report shape:

```markdown
## Privacy Scan Report

**Status**: pass | warn | fail
**Tools**: gitleaks, semgrep, targeted checks
**Artifacts**: <paths>

### Critical
- ...

### High
- ...

### Medium
- ...

### Low
- ...
```

If `strict=true` and any finding exists, mark status as `fail`.

## Step 6: Report to issue (optional)

If `issue_number` is provided, post the final report to the issue:

```bash
gh issue comment <issue_number> --body "<privacy-scan-report>"
```

## Step 7: Output

Return:

- `report`
- `findings`
- `artifacts`

If no findings exist, explicitly state that the repository passed privacy and
sensitive-data scanning for both working tree and git history (when enabled).
