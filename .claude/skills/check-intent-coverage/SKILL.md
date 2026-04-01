---
name: check-intent-coverage
version: 1.0.0
description: >
  Analyzes Layer 1 Gherkin intent specifications in tests/features/
  against Layer 2 contract test implementations in tests/src/profiles/
  and Layer 3 stack implementations to find coverage gaps. Produces
  a structured gap report and optionally generates new .feature
  scenarios, matching TypeScript test cases, and profile documentation
  to fill those gaps. Use this skill when you want to ensure the
  intent specifications fully cover the implemented behavior and
  that all three layers are synchronized.
author: "@idp-maintain"
domain: devops
tags:
  - testing
  - gherkin
  - contract
  - intent
  - coverage
  - automation
  - conformance
depends_on: []
inputs:
  - name: profile
    type: string
    required: false
    description: >
      Limit analysis to a single conformance profile name (e.g.,
      "core", "operational", "ui-profile"). When omitted, all
      profiles are analyzed.
  - name: stack_path
    type: string
    required: false
    description: >
      Relative path to a specific stack directory (e.g.,
      "stacks/go/net-http/rest"). When provided, Layer 3
      implementation analysis targets this stack. When omitted,
      all stacks under stacks/ are analyzed.
  - name: auto_fix
    type: boolean
    required: false
    default: false
    description: >
      When true, the skill generates new .feature scenarios,
      TypeScript test cases, and profile documentation to fill
      discovered gaps. When false (default), only the gap report
      is produced.
  - name: issue_number
    type: number
    required: false
    description: >
      GitHub Issue number to post the gap report to. When provided,
      results are posted as an issue comment. When omitted, results
      are output directly.
outputs:
  - name: gap_report
    type: object
    description: >
      Structured report of all discovered gaps organized by
      category (layer-sync, missing-scenarios, missing-tests,
      implementation-drift, documentation-gaps).
  - name: gaps_found
    type: number
    description: Total number of gaps discovered across all categories.
  - name: files_created
    type: array
    description: >
      List of file paths created or modified when auto_fix is true.
      Empty when auto_fix is false.
---

# Check Intent Coverage

Analyzes all three layers of the intent-driven architecture (ADR-0001,
ADR-0009) to find coverage gaps between Gherkin specifications, the
TypeScript contract test harness, and stack implementations. Optionally
generates artifacts to fill those gaps.

## Step 1: Inventory Layer 1 Intent Specifications

Read every `.feature` file in `tests/features/`:

```bash
ls tests/features/*.feature
```

For each `.feature` file, parse and extract:

1. **Feature name** -- the text after `Feature:` on the first
   non-blank line.
2. **Profile name** -- derived from the filename (e.g.,
   `core.feature` maps to profile `core`).
3. **Background steps** -- all Given/And steps under `Background:`.
4. **Scenarios** -- for each `Scenario:` block, extract:
   - Scenario title
   - All Given/When/Then/And steps with their exact text
   - Any data tables or doc strings

Build a structured inventory of every scenario and step across all
profiles.

If `profile` input is provided, filter to only the matching
`.feature` file.

## Step 2: Inventory Layer 2 Contract Tests

Read every TypeScript profile file in `tests/src/profiles/`:

```bash
ls tests/src/profiles/*.ts
```

Skip `index.ts` (it is the profile registry, not a profile
implementation).

For each profile file, parse and extract:

1. **Profile name** -- derived from the filename and the exported
   function name (e.g., `core.ts` exports `createCoreTests`).
2. **Test cases** -- for each object in the returned `TestCase[]`
   array, extract:
   - The `name` property (e.g., `"core:web responds to GET /"`)
   - The assertions performed in the `run` function body
   - The HTTP endpoint being tested (URL path)
   - The response fields being validated

Also read `tests/src/profiles/index.ts` to verify that every profile
file is registered in the `buildTestsForProfile` function.

## Step 3: Inventory Layer 3 Stack Implementations

Discover all stacks:

```bash
find stacks/ -name "stack.json" -type f
```

If `stack_path` input is provided, limit to that single stack.

For each stack, read `stack.json` to extract:

1. **Declared contract profiles** -- the `contractProfiles` array
2. **Declared capabilities** -- the `capabilities` object (e.g.,
   `ui.enabled`, `ui.mode`)
3. **Language, framework, interface** -- stack identity fields

Then explore the stack's source code to identify:

4. **BFF route handlers** -- search for HTTP route registrations
   (e.g., Go `http.HandleFunc`, Express/Fastify route definitions)
   and extract every registered endpoint path and HTTP method.
5. **Response shapes** -- for each route handler, identify the
   JSON fields being returned in the response body.
6. **Web server behavior** -- identify what the web server returns
   for `GET /` (HTML, static files, SPA shell, etc.).

## Step 4: Cross-Layer Gap Analysis

Compare the three inventories to identify gaps in five categories:

### Category A: Layer 1 / Layer 2 Sync Gaps

For each scenario in a `.feature` file, check whether a
corresponding test case exists in the matching profile `.ts` file.
Match by:

- Scenario title similarity to test case `name` property
- HTTP endpoint being tested (URL path)
- Response fields being validated

Flag gaps where:

- A `.feature` scenario has no matching test case in the `.ts`
  profile (**scenario without test**)
- A `.ts` test case has no matching scenario in the `.feature`
  file (**test without scenario**)
- A `.feature` scenario asserts a field or value that the `.ts`
  test does not validate (**assertion gap**)
- A `.ts` test validates something not specified in the `.feature`
  file (**undocumented assertion**)

### Category B: Missing Scenarios

Analyze the Layer 3 implementation to find behavior that is not
covered by any `.feature` scenario:

- BFF endpoints that exist in the implementation but have no
  scenario testing them
- Response fields returned by an endpoint that are not validated
  by any scenario
- HTTP methods supported by an endpoint that are not covered
- Error responses or edge cases (e.g., 404 for unknown routes,
  405 for unsupported methods) that have no scenario

### Category C: Missing Tests

For each `.feature` scenario, verify it has a corresponding test
case that validates every step:

- `Then the response status code is in the 2xx range` must map to
  a status assertion
- `And the JSON object contains a field named "X"` must map to a
  field-presence assertion
- `And the JSON field "X" is exactly "Y"` must map to an
  exact-value assertion
- `And the response Content-Type header contains "Z"` must map to
  a header assertion

Flag any step that lacks a matching assertion in the test case.

### Category D: Implementation Drift

Compare what the stack actually implements against what the intent
specifies:

- Stack returns fields not mentioned in any `.feature` scenario
  (potential undocumented contract)
- Stack endpoint behavior differs from the `.feature` scenario
  (e.g., different field names, different enum values)
- Stack declares capabilities in `stack.json` that have no
  matching `.feature` profile
- Stack's `contractProfiles` array references a profile that has
  no `.feature` file

### Category E: Documentation Gaps

Check that every profile has its documentation page:

```bash
ls docs/content/testing/profiles/
```

Flag gaps where:

- A `.feature` file exists but no matching doc page in
  `docs/content/testing/profiles/`
- A doc page exists but no matching `.feature` file
- A doc page exists but its content does not reflect the current
  scenarios in the `.feature` file (compare scenario titles)

## Step 5: Classify and Prioritize Gaps

For each gap found, assign:

1. **Severity**:
   - `critical` -- Layer 1/Layer 2 sync violation (the `.feature`
     and `.ts` disagree, violating ADR-0009)
   - `high` -- implemented behavior with no intent specification
     (undocumented contract surface)
   - `medium` -- intent scenario with incomplete test coverage
   - `low` -- documentation gaps or cosmetic mismatches

2. **Category** -- one of A through E from Step 4.

3. **Affected files** -- the specific `.feature`, `.ts`, stack
   source, or doc files involved.

4. **Suggested fix** -- a concrete description of what needs to
   change to close the gap.

## Step 6: Generate Gap Report

Produce a structured gap report organized by category and severity.
Format as a Markdown document:

```markdown
## Intent Coverage Gap Report

**Analyzed**: <date>
**Profiles**: <list of profiles analyzed>
**Stacks**: <list of stacks analyzed>
**Total gaps**: <count>

### Critical Gaps

| # | Category | Gap | Affected Files | Suggested Fix |
|---|----------|-----|----------------|---------------|
| 1 | A | ... | ... | ... |

### High Gaps

| # | Category | Gap | Affected Files | Suggested Fix |
|---|----------|-----|----------------|---------------|

### Medium Gaps

...

### Low Gaps

...
```

If `issue_number` is provided, post this report as a comment on
the issue using the GitHub MCP `add_issue_comment` tool or:

```bash
gh issue comment <issue_number> --body "<report>"
```

## Step 7: Auto-Fix Gaps (conditional)

If `auto_fix` is false, stop here and output the gap report.

If `auto_fix` is true, proceed to generate artifacts for each gap:

### 7a: Generate New Feature Scenarios

For Category B gaps (missing scenarios), create new Gherkin
scenarios and add them to the appropriate `.feature` file. Follow
these rules:

- Use the same Background as the existing scenarios in that
  `.feature` file.
- Write Given/When/Then steps using the exact same vocabulary and
  patterns as existing scenarios.
- Be explicit about HTTP methods, URL paths, status codes, field
  names, field types, and exact values.
- Each scenario should test exactly one behavior.
- Place new scenarios at the end of the file, after existing ones.

If a gap requires a new profile (an endpoint or capability that
does not fit any existing profile), create a new `.feature` file
following the naming convention: `tests/features/<profile-name>.feature`.

### 7b: Generate Matching TypeScript Test Cases

For every new or modified `.feature` scenario, create or update
the corresponding TypeScript test case in
`tests/src/profiles/<profile>.ts`:

- Follow the exact patterns of existing test case implementations.
- Import from `../assertions`, `../http`, `../runtime`, and
  `../types` as needed.
- Use `ensureServiceAvailable` before the first request to each
  service.
- Use `request(new URL("<path>", baseUrl))` for HTTP calls.
- Use `assert()` for all validations.
- Use `parseJsonOrThrow()` for JSON parsing.
- Name the test case as `"<profile>:<descriptive name>"`.

If a new profile was created in Step 7a, also:

1. Create `tests/src/profiles/<profile>.ts` with an exported
   `create<ProfileName>Tests(context: ContractContext): TestCase[]`
   function.
2. Update `tests/src/profiles/index.ts` to import and register
   the new profile in `buildTestsForProfile`.
3. Add the new profile name to the `ProfileName` union type in
   `tests/src/types.ts`.

### 7c: Generate Profile Documentation

For every new or modified profile, create or update the matching
documentation page at `docs/content/testing/profiles/<profile>.md`.

Follow the format and conventions of existing profile doc pages.

### 7d: Validate Generated Artifacts

After generating all artifacts:

1. Verify that every new `.feature` scenario has a matching test
   case.
2. Verify that every new test case matches a `.feature` scenario.
3. Run markdown linting on any new or modified `.md` files:

   ```bash
   npx markdownlint-cli2 <new-doc-files>
   ```

4. Verify TypeScript compiles without errors:

   ```bash
   npx tsc --noEmit -p tests/tsconfig.json
   ```

If any validation fails, fix the issue and re-validate before
reporting success.

## Step 8: Report Results

Output the structured `gap_report` object, `gaps_found` count,
and `files_created` list (empty if `auto_fix` was false).

If gaps were found and `auto_fix` was false, suggest that the user
re-run the skill with `auto_fix: true` to generate fixes, or
use the `/plan-work` skill to create an implementation plan for
the gaps.

If `auto_fix` was true and files were created, remind the user
to review the generated artifacts and use `/ship-changes` to
commit and merge them.
