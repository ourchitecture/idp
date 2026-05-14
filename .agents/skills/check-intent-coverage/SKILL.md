---
name: check-intent-coverage
version: 1.1.0
description: >
  Compares Layer 1 Gherkin specs (tests/features/), Layer 2 TS contract
  tests (tests/src/profiles/), and Layer 3 stack implementations to find
  coverage gaps. Optionally generates artifacts to fill gaps.
author: "@idp-maintain"
domain: devops
tags: [testing, gherkin, contract, intent, coverage, conformance]
depends_on: []
inputs:
  - name: profile
    type: string
    required: false
    description: Single profile name to analyze (e.g., "core"). Default: all.
  - name: stack_path
    type: string
    required: false
    description: Single stack directory. Default: all `stacks/`.
  - name: auto_fix
    type: boolean
    required: false
    default: false
    description: Generate new .feature scenarios, TS tests, and profile docs.
  - name: issue_number
    type: number
    required: false
    description: Optional issue to post the gap report to.
outputs:
  - name: gap_report
    type: object
    description: Gaps by category (layer-sync, missing-scenarios, missing-tests, drift, doc-gaps).
  - name: gaps_found
    type: number
    description: Total gap count.
  - name: files_created
    type: array
    description: Files created/modified when auto_fix=true (empty otherwise).
---

# Check Intent Coverage

Analyzes the three layers of the intent-driven architecture (ADR-0001,
ADR-0009) to find coverage gaps. GitHub API access:
[../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## 1. Inventory Layer 1 (`.feature` files)

`ls tests/features/*.feature`. For each: feature name (after `Feature:`),
profile name (from filename), background steps, and per-scenario title
and Given/When/Then/And steps (with tables/doc strings).

Filter to `profile` input if provided.

## 2. Inventory Layer 2 (`tests/src/profiles/*.ts`)

Skip `index.ts` (registry only). For each profile file: profile name
(from filename + exported `create<Name>Tests`), and per `TestCase[]` item
extract `name`, assertions in `run`, HTTP endpoint, and validated fields.

Verify every profile is registered in `buildTestsForProfile` in
`tests/src/profiles/index.ts`.

## 3. Inventory Layer 3 (stacks)

`find stacks/ -name "stack.json" -type f` (filter to `stack_path` if
given). From each `stack.json`: `contractProfiles[]`, `capabilities{}`,
language/framework/interface.

From stack source: BFF route registrations (Go `http.HandleFunc`,
Express/Fastify routes), every registered path/method, response body
JSON fields, and web-server behavior for `GET /` (HTML / static / SPA).

## 4. Gap analysis (five categories)

**A. Layer 1↔2 sync.** Match scenarios to test cases by title similarity,
URL path, validated fields. Flag: scenario without test; test without
scenario; assertion gap (scenario asserts a field/value the test
doesn't); undocumented assertion (test validates more than scenario).

**B. Missing scenarios.** Implementation endpoints/fields/methods/error
responses (404, 405) with no scenario.

**C. Missing tests.** Each scenario step needs a matching assertion:

- `Then the response status code is in the 2xx range` → status assertion.
- `And the JSON object contains a field named "X"` → field-presence.
- `And the JSON field "X" is exactly "Y"` → exact-value.
- `And the response Content-Type header contains "Z"` → header assertion.

**D. Implementation drift.** Stack returns fields not in any scenario;
behavior differs from scenario (field names, enum values);
`stack.json` capabilities with no matching profile; `contractProfiles[]`
referencing a profile with no `.feature` file.

**E. Documentation gaps.** `ls docs/content/testing/profiles/`. Flag:
`.feature` without doc page; doc page without `.feature`; doc page whose
scenario titles don't match the current `.feature`.

## 5. Classify and prioritize

Severity:

- `critical` — Layer 1/2 disagreement (violates ADR-0009; `.feature` wins).
- `high` — implementation has no intent spec (undocumented contract).
- `medium` — scenario with incomplete test coverage.
- `low` — doc gap or cosmetic mismatch.

Record category (A–E), affected files, suggested fix.

## 6. Report

Report findings grouped by severity (critical/high/medium/low) as a table:
`#, Category, Gap, Affected Files, Suggested Fix`; include analyzed date,
profiles/stacks reviewed, and total gap count.

If `issue_number`: post via `add_issue_comment` or
`gh issue comment <n> --body "<report>"`.

## 7. Auto-fix (only when `auto_fix=true`)

If `auto_fix=false`, stop after step 6.

### 7a. New `.feature` scenarios (category B)

Reuse the file's `Background`, match existing step vocabulary, be explicit
(method, path, status, field name/type/value). One behavior per scenario.
Append at the end of the file. New profile → new
`tests/features/<profile>.feature`.

### 7b. Matching TS test cases

Create/update `tests/src/profiles/<profile>.ts`:

- Import from `../assertions`, `../http`, `../runtime`, `../types`.
- `ensureServiceAvailable` before first request to each service.
- `request(new URL("<path>", baseUrl))` for HTTP calls.
- `assert()` for validations; `parseJsonOrThrow()` for JSON.
- Test case name: `"<profile>:<descriptive name>"`.

For a new profile: create the `.ts` with `create<Name>Tests(context:
ContractContext): TestCase[]`; register in `tests/src/profiles/index.ts`;
add to `ProfileName` in `tests/src/types.ts`.

### 7c. Profile documentation

Create/update `docs/content/testing/profiles/<profile>.md` following the
format of existing profile pages.

### 7d. Validate

- Every new scenario has a matching test case (and vice versa).
- `moon run repo:check-lint-md` passes on changed `.md`.
- `moon run docs-site:check-test` compiles cleanly.

Fix and re-validate on failure before reporting success.

## 8. Report results

Output `gap_report`, `gaps_found`, `files_created` (empty if
`auto_fix=false`). If gaps remain and `auto_fix` was false, suggest
re-running with `auto_fix=true` or using `/plan-work`. If `auto_fix=true`
and files were created, remind the user to review and `/ship-changes`.
