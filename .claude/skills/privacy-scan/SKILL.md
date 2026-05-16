---
name: privacy-scan
version: 1.1.0
description: >
  Runs privacy/sensitive-data scanning (gitleaks + semgrep) via canonical
  moon/make tasks. Produces a triage report with findings and remediation.
author: "@idp-maintain"
domain: security
tags: [privacy, security, secrets, pii, semgrep, gitleaks, moon]
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: false
    description: Optional GitHub Issue to post the report as a comment.
  - name: strict
    type: boolean
    required: false
    default: true
    description: When true, any finding marks the report status `fail`.
  - name: include_history
    type: boolean
    required: false
    default: true
    description: Include git-history scanning in addition to working tree.
outputs:
  - name: report
    type: object
    description: Privacy scan summary — tooling, counts, severity, actions.
  - name: findings
    type: array
    description: Flattened findings with source tool, location, severity.
  - name: artifacts
    type: array
    description: Generated SARIF/JSON artifacts under .tmp/privacy-scan/.
---

# Privacy Scan

GitHub API access (for the optional issue comment) follows
[../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## 1. Prepare pinned toolchain

`proto install` — needs `go` (gitleaks), `python` + `uv` (semgrep).

## 2. Run canonical scan

`moon run repo:check-privacy` (fallback: `make check-privacy`). The scan runs:

1. gitleaks filesystem scan.
2. gitleaks git-history scan.
3. semgrep `p/secrets` ruleset.
4. Targeted checks for sensitive logging patterns.
5. Targeted checks for analytics initialization boundaries.

## 3. Collect artifacts

From `.tmp/privacy-scan/`:

- `gitleaks-report.sarif`
- `gitleaks-git-report.sarif`
- `semgrep-secrets.json`

If `include_history=false`, drop history findings from
`gitleaks-git-report.sarif` in the classification.

## 4. Classify

Categories: **Secrets exposure** (keys/tokens/credentials), **PII exposure**
(email/phone/session/auth/cookie in logs or persisted data), **Tracking
governance drift** (analytics outside consent boundaries), **Operational
privacy gaps** (telemetry/logging exposing sensitive data).

Severity: `critical` active credential leak or broad PII; `high` historical
leak or high-confidence sensitive log; `medium` likely privacy regression;
`low` hardening recommendation without active evidence.

## 5. Produce report

```markdown
## Privacy Scan Report

**Status**: pass | warn | fail
**Tools**: gitleaks, semgrep, targeted checks
**Artifacts**: <paths>

### Critical / High / Medium / Low
- ...
```

If `strict=true` and any finding exists, status is `fail`.

## 6. Report to issue (optional)

If `issue_number` is provided:
`gh issue comment <issue_number> --body "<report>"`.

## 7. Return

`report`, `findings`, `artifacts`. If no findings, explicitly state the repo
passed scanning for the working tree (and history, when enabled).
