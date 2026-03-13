# AGENTS.md - Intelligent Development Portal (IDP)

## Project Overview

This project is an **Intelligent Development Portal (IDP)** -- a modern, AI-native evolution of the Internal Developer Portal concept. While it shares the IDP acronym intentionally, this project goes beyond traditional developer portals by deeply integrating AI and web technologies to improve the entire development experience.

The IDP connects the development process and the digital/software supply chain to an organization's broader product development lifecycle, providing strategic alignment between engineering execution and business outcomes.

## Core Principles

All contributions -- human or AI -- must align with these principles, listed in priority order:

1. **Secure by Default**: Security is not an add-on. Every feature, endpoint, dependency, and configuration must be secure out of the box. Follow zero-trust principles. Never store secrets in code. Encrypt data at rest and in transit. Apply the principle of least privilege everywhere.

2. **Container-First**: All services, tools, and environments must be designed to run in containers as the primary deployment target. Local development should use containers. CI/CD pipelines produce container images. Infrastructure assumes container orchestration (e.g., Kubernetes).

3. **AI-First**: AI capabilities are core to the platform, not bolted on. Features should leverage AI to reduce toil, improve developer experience, and automate repetitive tasks. Design APIs and data models with AI consumption and generation in mind.

4. **AI over MCP-First**: Prefer the Model Context Protocol (MCP) as the standard integration layer for AI capabilities. MCP servers and tools should be the primary mechanism for AI agents to interact with the platform. Design services to be MCP-compatible before considering alternative integration patterns.

5. **Extensible via Plug-ins**: The platform must support a plug-in/extension architecture. Core functionality should be minimal and opinionated, while allowing customization and extension without forking. Design clear extension points, APIs, and contracts.

6. **Self-Service Hosting**: Provide clear, tested guidance and tooling for private/on-premise hosting. Organizations must be able to run the full IDP stack independently with minimal operational burden.

7. **Multi-Tenant SaaS Ready**: Architecture must support eventual public SaaS hosting with strong tenant isolation, including options for dedicated and segregated physical infrastructure for customers with strict data sovereignty or compliance requirements.

## Work Management via GitHub Issues

GitHub Issues are the **primary driver of all work** on this project. AI agents and human contributors alike must use GitHub Issues as the source of truth for requirements, design, and task tracking.

### GitHub MCP Server

The GitHub MCP server is the required integration point for AI agents interacting with project management. Agents must use the GitHub MCP tools (not CLI fallbacks) for all issue and repository operations when available.

Key MCP tools agents should use:

- `create_issue` -- Create new issues for requirements, bugs, tasks, or design proposals.
- `list_issues` -- Query open issues to find assigned work, prioritize tasks, or check for duplicates before creating new issues.
- `get_issue` -- Read full issue details, comments, and context before beginning work.
- `update_issue` -- Update issue status, add labels, or modify descriptions as work progresses.
- `add_issue_comment` -- Post progress updates, design decisions, questions, and completion summaries directly on issues.
- `create_pull_request` -- Link PRs to issues using `Closes #N` or `Fixes #N` in the PR body.
- `search_repositories`, `search_issues` -- Discover related work, prior art, or duplicate issues.

### Authorized Teams and Issue Prioritization

AI agent automation is restricted to work authorized by the following GitHub organization teams:

- **`@idp-admin`** -- Administrative authority. Issues created or assigned by members of this team take highest priority.
- **`@idp-maintain`** -- Maintainer authority. Issues created or assigned by members of this team are eligible for agent processing.

**Agents must enforce these constraints:**

1. **Only process authorized issues.** Before picking up any issue, verify that the issue was created by, assigned by, or explicitly approved (via comment or label) by a member of `@idp-admin` or `@idp-maintain`. Do not process issues from external contributors unless an authorized team member has triaged and approved the issue.
2. **Priority order.** When multiple issues are available, prioritize in this order:
   - Issues assigned by `@idp-admin` members
   - Issues assigned by `@idp-maintain` members
   - Issues created by `@idp-admin` members
   - Issues created by `@idp-maintain` members
   - Then by label priority (`p0` > `p1` > `p2` > `p3`)
3. **External contributions.** Issues or PRs from contributors outside these teams must not be automatically processed. Agents may add a comment noting the issue needs triage by an authorized team member, but must not begin implementation work.
4. **Team verification.** Use the GitHub MCP server to check issue author and assignee membership. If team membership cannot be verified, treat the issue as external and do not process it.

### Issue-Driven Workflow

1. **Before starting work**: Query open issues to find the next task. Verify the issue is authorized per the team constraints above. Do not begin untracked or unauthorized work.
2. **Understand the issue**: Read the full issue, including all comments, before writing code. If the issue is ambiguous, add a comment asking for clarification rather than guessing.
3. **Claim the work**: Assign yourself (or note in a comment) that work is in progress to avoid duplication.
4. **Report progress**: Add comments on the issue for significant milestones, design decisions, or blockers encountered during implementation.
5. **Link deliverables**: PRs must reference their source issue. Use `Closes #N` in PR descriptions to auto-close issues on merge.
6. **Close the loop**: After a PR is merged, verify the issue is resolved. If follow-up work is needed, create a new issue referencing the original.

### Issue Structure and Labels

Issues should be categorized with labels to enable efficient triage and agent processing:

- **Type**: `requirement`, `design`, `bug`, `task`, `spike`, `epic`
- **Priority**: `p0-critical`, `p1-high`, `p2-medium`, `p3-low`
- **Domain**: `security`, `ai`, `mcp`, `infrastructure`, `plugin`, `api`, `ui`
- **Status**: `needs-triage`, `ready`, `in-progress`, `blocked`, `needs-review`
- **Agent**: `agent-eligible` -- Marks issues suitable for autonomous AI agent processing.

### Requirements and Design in Issues

- **Requirements** should be captured as issues with the `requirement` label. Use the issue body for acceptance criteria written as clear, testable statements.
- **Design proposals** use the `design` label. The issue body should describe the problem, proposed solution, alternatives considered, and trade-offs. Design issues should be discussed via comments before implementation begins.
- **Epics** group related issues. Use task lists (`- [ ] #N`) in epic issue bodies to track constituent work items.
- **Spikes** are time-boxed research tasks. The deliverable is a comment or linked document summarizing findings and recommendations, not code.

### AI Agent Coordination

- Multiple AI agents may operate on this repository concurrently. Always check issue assignments and `in-progress` labels before picking up work.
- **Team gate applies.** Agents must only pick up issues authorized by `@idp-admin` or `@idp-maintain` members. Never auto-process external issues.
- Agents should create issues for discovered problems (bugs, tech debt, security concerns) rather than fixing them silently in unrelated PRs.
- When an agent completes an issue, it must add a summary comment describing what was done, any decisions made, and any follow-up items before closing.
- Agents must not close issues opened by humans without explicit approval or a merged PR that addresses the issue.
- If an external contributor opens an issue or PR, agents should label it `needs-triage` and notify the `@idp-maintain` team via a comment, then move on.

## Architecture Guidelines

### Data Security and Isolation

- All data storage must support encryption at rest using industry-standard algorithms.
- All data transmission must use TLS 1.3 or higher.
- Multi-tenant data must be logically isolated by default, with options for physically segregated storage and compute for premium/compliance tiers.
- Personally identifiable information (PII) and secrets require additional access controls and audit logging.
- Design for data residency requirements from the start (region-aware storage and processing).

### Container and Infrastructure

- Every service must include a `Dockerfile` (or equivalent container build definition).
- Use multi-stage builds to minimize image size and attack surface.
- Base images should be pinned to specific versions and scanned for vulnerabilities.
- Services must be stateless where possible; state belongs in managed data stores.
- Health check, readiness, and liveness endpoints are required for all services.
- Configuration must be externalized via environment variables or mounted config files, never hardcoded.

### API and Integration Design

- Prefer REST or gRPC for service-to-service communication.
- All public APIs must be versioned from day one.
- MCP tool definitions should accompany any new capability that AI agents may invoke.
- OpenAPI/Swagger specs are required for all HTTP APIs.
- Rate limiting, authentication, and authorization must be enforced at the API gateway level.

### AI and MCP Integration

- New platform capabilities should expose MCP tool definitions alongside traditional APIs.
- AI agent workflows should be composable and observable (logging, tracing, audit trails).
- Prompt templates and AI configurations should be version-controlled and testable.
- LLM provider integrations must be abstracted behind a common interface to avoid vendor lock-in.
- Prefer Anthropic Claude models as the default LLM where applicable, but always behind an abstraction layer.

### Plug-in / Extension Architecture

- Plug-ins must be sandboxed and run with minimal permissions by default.
- Define clear lifecycle hooks: install, activate, deactivate, uninstall.
- Plug-in APIs should be versioned independently of the core platform.
- Plug-ins must not be able to bypass security controls or tenant isolation.

## Development Standards

### Code Quality

- Write clean, readable, well-tested code. Prefer clarity over cleverness.
- All code must pass linting and formatting checks before commit.
- Tests are required for new functionality: unit tests at minimum, integration tests for service boundaries.
- Code reviews (human or AI-assisted) are mandatory before merging to main branches.

### Dependency Management

- Pin all dependency versions. Use lock files.
- Regularly audit dependencies for known vulnerabilities.
- Prefer well-maintained, widely-adopted libraries. Minimize dependency count.
- No dependency should be added without understanding its license implications.

### Documentation

- Public APIs must have inline documentation and generated reference docs.
- Architecture decisions should be recorded as Architecture Decision Records (ADRs).
- Runbooks for operational tasks (deployment, scaling, incident response) should accompany infrastructure changes.

### Versioning

- **Semantic Versioning is mandatory.** All version numbers maintained within the project -- including code packages, skills, container images, APIs, plug-ins, and any other versioned artifact -- must strictly follow [Semantic Versioning 2.0.0](https://semver.org/) (SemVer). Use the `MAJOR.MINOR.PATCH` format:
  - **MAJOR** -- Increment for incompatible or breaking changes (e.g., removing an input, changing output schema, altering behavior in a non-backward-compatible way).
  - **MINOR** -- Increment for backward-compatible new functionality (e.g., adding a new input with a default, adding a new output, new non-breaking capability).
  - **PATCH** -- Increment for backward-compatible bug fixes, documentation corrections, or internal-only changes that do not affect the public interface.
- All new versioned artifacts start at `1.0.0` unless there is a documented reason for starting at `0.x.y` (e.g., pre-release/experimental status).
- Pre-release versions use SemVer pre-release syntax (e.g., `1.0.0-alpha.1`, `2.0.0-rc.1`).
- Version numbers must be updated in the same commit or PR that introduces the change. Do not batch version bumps across unrelated changes.

### Git and Version Control

- **Conventional Commits are mandatory.** All commit messages -- whether authored by humans or AI agents -- must strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Commits that do not conform must be rejected or amended before merge.

- **Commit message format:**

  ```text
  <type>(<optional scope>): <description>

  [optional body]

  [optional footer(s)]
  ```

- **Allowed types:**
  - `feat` -- A new feature
  - `fix` -- A bug fix
  - `docs` -- Documentation only changes
  - `style` -- Formatting, whitespace, semicolons (no logic change)
  - `refactor` -- Code change that neither fixes a bug nor adds a feature
  - `perf` -- Performance improvement
  - `test` -- Adding or correcting tests
  - `build` -- Changes to build system or external dependencies
  - `ci` -- CI/CD pipeline changes
  - `chore` -- Maintenance tasks that do not modify src or test files
  - `security` -- Security-related changes (custom type for this project)
  - `revert` -- Reverts a previous commit

- **Breaking changes** must include `BREAKING CHANGE:` in the commit footer or append `!` after the type/scope (e.g., `feat(api)!: remove v1 endpoints`).

- **Scope** should reference the affected module, service, or domain (e.g., `feat(auth):`, `fix(mcp-tools):`, `docs(adr):`).

- **Issue references** are required. Include `Refs #N` or `Closes #N` in the commit body or footer to link to the source GitHub Issue.

- **Examples:**

  ```text
  feat(plugin-sdk): add lifecycle hook for plugin deactivation

  Implements the deactivate hook in the plugin lifecycle manager,
  allowing plugins to clean up resources before being unloaded.

  Closes #42
  ```

  ```text
  fix(auth): prevent token refresh race condition

  Adds a mutex around the token refresh flow to avoid concurrent
  refresh requests issuing duplicate tokens.

  Refs #87
  ```

  ```text
  security(api)!: enforce TLS 1.3 minimum for all endpoints

  Removes support for TLS 1.2 connections. All clients must
  upgrade to TLS 1.3.

  BREAKING CHANGE: TLS 1.2 is no longer accepted.
  Closes #103
  ```

- Branch names should follow: `<type>/<short-description>` (e.g., `feat/mcp-tool-registry`).
- Keep commits atomic and focused. One logical change per commit.
- Never commit secrets, credentials, or environment-specific configuration.

## Change Verification and Promotion

Every change must be classified, verified through the appropriate flow, and promoted through successive layers before it is considered production-ready. Agents must determine the change type and execute the corresponding verification steps. A change may span multiple categories -- apply all that match.

### Step 1: Classify the Change

Inspect the diff and categorize the change into one or more of the following types:

| Change Type | Trigger | Examples |
| --- | --- | --- |
| **Code** | Source files modified in `/src/` or service directories | New feature, bug fix, refactor |
| **API** | OpenAPI specs, route definitions, MCP tool definitions changed | New endpoint, schema change, MCP tool added |
| **Infrastructure** | Dockerfiles, Kubernetes manifests, Helm charts, CI/CD pipelines | Container config, deploy scripts, health checks |
| **Dependency** | Lock files, package manifests changed | Added/removed/upgraded package |
| **Configuration** | Environment templates, feature flags, app config schemas | New config key, default value change |
| **Documentation** | Markdown, ADRs, runbooks, inline doc changes only | README update, new ADR, API doc refresh |
| **Security** | Auth logic, encryption, access control, secrets handling | Permission change, TLS config, auth flow |

### Step 2: Execute Verification Flow by Type

Each change type has a prescribed verification flow. Execute all flows that apply to the change.

#### Code Changes

1. **Static Analysis** -- Run linting and formatting checks. Fix all violations before proceeding.
2. **Unit Tests** -- Run unit tests scoped to the modified modules. All must pass. New code requires new tests.
3. **Integration Tests** -- If the change crosses service or module boundaries, run integration tests for affected interfaces.
4. **Coverage Check** -- Verify test coverage has not decreased. New code should meet or exceed the project's coverage threshold.
5. **Build Verification** -- Confirm the project builds cleanly with no warnings treated as errors.

#### API Changes

1. **Schema Validation** -- Validate OpenAPI/Swagger specs and MCP tool definitions are syntactically correct and internally consistent.
2. **Backward Compatibility** -- Check that existing API consumers are not broken. If a breaking change is intentional, confirm it is gated behind a version increment and documented.
3. **Contract Tests** -- Run consumer-driven contract tests where available.
4. **API Documentation** -- Verify generated docs reflect the change accurately.
5. **MCP Compliance** -- If the change involves an MCP tool, verify the tool definition is complete (name, description, input schema, output schema) and functional via a smoke test.

#### Infrastructure Changes

1. **Dockerfile Lint** -- Lint Dockerfiles (e.g., hadolint). Verify multi-stage build, pinned base image, no secrets baked in.
2. **Container Build** -- Build the container image successfully.
3. **Container Scan** -- Scan the built image for known vulnerabilities (e.g., Trivy, Grype).
4. **Manifest Validation** -- Validate Kubernetes manifests, Helm charts, or equivalent against schema (e.g., kubeval, helm lint).
5. **Dry-Run Deploy** -- Where possible, perform a dry-run or template rendering to catch deployment errors without applying changes.
6. **Health Check Verification** -- Confirm health, readiness, and liveness endpoints respond correctly in the built container.

#### Dependency Changes

1. **License Audit** -- Verify the new or updated dependency's license is compatible with MIT.
2. **Vulnerability Scan** -- Run dependency audit (e.g., `npm audit`, `cargo audit`, language-appropriate tool) and resolve critical/high findings.
3. **Version Pinning** -- Confirm the dependency is pinned to an exact version in the lock file.
4. **Transitive Impact** -- Check for transitive dependency conflicts or bloat.
5. **Rebuild and Test** -- Run the full Code Changes flow to verify nothing regressed.

#### Configuration Changes

1. **Schema Validation** -- If a config schema exists, validate the change conforms to it.
2. **Default Safety** -- Verify that new defaults are secure and sensible. No default should weaken security posture.
3. **Environment Parity** -- Confirm the change works across local, CI, and production-equivalent environments (or document environment-specific behavior).
4. **Secret Detection** -- Scan for accidentally committed secrets or credentials.

#### Documentation Changes

1. **Link Validation** -- Check that all internal and external links resolve.
2. **Accuracy Review** -- Verify the documentation reflects the current state of the code and architecture.
3. **Spelling and Grammar** -- Run a basic prose linter if available.

#### Security Changes

1. **Threat Assessment** -- Describe the security impact of the change in the PR description. What attack surface is affected?
2. **Full Code Changes Flow** -- Execute the complete code verification flow above.
3. **Security-Specific Tests** -- Run or write tests that validate the security property (e.g., unauthorized access returns 403, encrypted fields are not stored in plaintext).
4. **Dependency Audit** -- If new dependencies are involved, run the full Dependency Changes flow.
5. **Secrets Scan** -- Run a secrets detection tool (e.g., gitleaks, truffleHog) against the entire diff.
6. **Human Review Required** -- Security changes must not be merged without explicit human approval, even if all automated checks pass.

### Step 3: Promote Through Layers

Changes that pass verification are promoted through successive environments. A change must pass each layer before advancing.

```text
Local Dev --> PR Checks --> Staging --> Pre-Production --> Production
```

#### Layer 1: Local Development

- Developer or agent runs the applicable verification flows locally.
- All checks must pass before creating a PR.
- Commit messages must reference the issue number.

#### Layer 2: PR Checks (CI)

- Automated CI pipeline re-runs all applicable verification flows in a clean environment.
- At least one human or authorized AI reviewer must approve the PR.
- Security-labeled changes require explicit human approval.
- CI must report status back to the PR via GitHub checks.

#### Layer 3: Staging

- Merged changes deploy automatically to a staging environment.
- End-to-end tests run against the staged deployment.
- Smoke tests verify critical user journeys and API contracts.
- MCP tool integrations are validated with live agent interactions where applicable.

#### Layer 4: Pre-Production

- A production-mirror environment with realistic data volumes and tenant isolation.
- Performance and load tests run at this layer for changes that affect throughput or latency.
- Multi-tenant isolation is verified: tenant A's operations must not leak to tenant B.
- Data migration scripts (if any) are validated against a production-like dataset.

#### Layer 5: Production

- Deployment via progressive rollout (canary or blue-green).
- Automated rollback triggers if error rates or latency exceed thresholds.
- Post-deployment health checks confirm all services are nominal.
- The source GitHub Issue is updated with a comment confirming production deployment.

### Verification Failure Protocol

When any verification step fails:

1. **Stop promotion.** Do not advance to the next layer.
2. **Diagnose.** Identify the root cause. Do not retry blindly.
3. **Fix forward.** Apply a corrective change and re-run the full verification flow for the affected change type.
4. **Report.** Add a comment on the GitHub Issue describing the failure, root cause, and fix applied.
5. **Never skip.** Do not bypass a failing check. If a check is believed to be flawed, file an issue to fix the check itself -- do not disable it.

## Agent Skills

AI agent capabilities in this project are defined as **Skills** -- discrete, reusable units of agent behavior with a standardized open format. Skills make agent capabilities discoverable, composable, version-controlled, and auditable.

### Skill Definition Format

Skills follow the open [agentskills.io](https://agentskills.io/specification) standard. Each skill lives in its own directory under `/.claude/skills/` with a `SKILL.md` file as the entry point.

```text
/.claude/skills/
  <skill-name>/
    SKILL.md              # Skill definition (required)
    scripts/              # Supporting scripts (optional)
    references/           # Reference material (optional)
    assets/               # Static assets (optional)
```

The `SKILL.md` file consists of YAML frontmatter (metadata, inputs, outputs, constraints) followed by Markdown body (execution instructions).

```markdown
---
name: <skill-name>                     # Unique identifier, kebab-case (e.g., "run-unit-tests")
version: <semver>                      # Semantic version (e.g., "1.0.0")
description: <what the skill does and when to use it>
author: <team or individual>

# Categorization
domain: <domain>                       # One of: security, ai, mcp, infrastructure, plugin, api, ui, devops, docs
tags:
  - <tag1>
  - <tag2>

# Composition
depends_on:
  - <skill-name>                       # Skills that must complete first

# Typed inputs
inputs:
  - name: <param-name>
    type: <string|number|boolean|array|object>
    required: <true|false>
    description: <what this input controls>
    default: <optional default>

# Typed outputs
outputs:
  - name: <output-name>
    type: <string|number|boolean|array|object>
    description: <what this output contains>
---

# Skill Title

Step-by-step execution instructions in Markdown.
Each step should be a headed section (## Step N: ...).
```

### Action Types

Skills execute through four action types:

- **`mcp-tool`** -- Invoke an MCP server tool. The preferred action type, consistent with the AI over MCP-First principle. Specify `tool` and any required `inputs` for the MCP call.
- **`shell`** -- Execute a shell command. Use for build tools, linters, test runners, and other CLI operations. Commands must be deterministic and safe to re-run.
- **`skill`** -- Invoke another skill by its `id`. Enables composition of complex workflows from smaller building blocks. The invoked skill's outputs are available to subsequent steps.
- **`prompt`** -- Send a prompt to an AI agent for reasoning, analysis, or decision-making. Use for tasks that require judgment (e.g., code review, threat assessment, documentation accuracy).

### Skill Conventions

#### Naming

- Skill IDs use `kebab-case` and should be descriptive: `lint-dockerfiles`, `scan-dependencies`, `create-mcp-tool-definition`.
- Prefix with the domain when clarity is needed: `security-scan-secrets`, `api-validate-openapi`.

#### Skill Versioning

- Skills follow semantic versioning. Breaking changes to inputs, outputs, or behavior require a major version bump.
- The skill manifest includes the version. Consumers may pin to a specific version or range.
- Deprecated skills must include a `deprecated` field with a migration path.

#### Triggers

| Trigger Type | Value | Example |
| --- | --- | --- |
| `manual` | (none) | Agent or human explicitly invokes the skill |
| `issue-label` | Label name | Triggered when an issue receives the specified label |
| `file-change` | Glob pattern | Triggered when matching files are modified in a PR |
| `schedule` | Cron expression | Runs on a recurring schedule |
| `event` | Event name | Triggered by a platform or webhook event |

#### Permissions

Skills declare the minimum permissions they require. The runtime must enforce these -- a skill cannot exceed its declared permissions. Common permissions:

- `read:issues`, `write:issues` -- GitHub issue access
- `read:code`, `write:code` -- Source code access
- `execute:containers` -- Build or run containers
- `read:secrets` -- Access to secrets manager (never raw secrets in logs or outputs)
- `invoke:mcp` -- Call MCP server tools
- `invoke:llm` -- Make LLM API calls

#### Composition

Skills can compose other skills via the `skill` action type. Composition rules:

- A skill may only invoke skills it lists in `depends_on` or references in its steps.
- Circular dependencies are not allowed and must be detected at registration time.
- Composed skills inherit the parent's execution context but run with their own declared permissions (never elevated).
- Outputs from composed skills are namespaced by step ID to avoid collisions.

### Skill Lifecycle

1. **Define** -- Create a `<skill-name>/SKILL.md` directory and file in `/.claude/skills/`.
2. **Validate** -- The skill frontmatter must pass schema validation before merge. Required fields and input/output declarations are checked.
3. **Register** -- On merge, skills are registered in the skill registry and become discoverable by agents.
4. **Discover** -- Agents query available skills by domain, tag, or trigger type when determining how to fulfill an issue.
5. **Execute** -- The agent (or automation) invokes the skill, passing required inputs. Execution is logged and traceable.
6. **Audit** -- All skill executions are recorded with inputs, outputs, duration, and outcome. Failures include error context.
7. **Deprecate** -- Skills that are superseded receive a `deprecated` field. Agents must prefer non-deprecated alternatives.

### Example Skills

#### Lint and Test Skill

```markdown
---
name: verify-code-changes
version: 1.0.0
description: >
  Runs static analysis, unit tests, and coverage checks for code changes.
  Use when source files in src/ have been modified.
author: "@idp-maintain"
domain: devops
tags:
  - verification
  - testing
  - ci
inputs:
  - name: modules
    type: array
    required: false
    description: Specific modules to test. If empty, tests all modified modules.
outputs:
  - name: lint_passed
    type: boolean
    description: Whether all linting checks passed.
  - name: tests_passed
    type: boolean
    description: Whether all unit tests passed.
  - name: coverage_percent
    type: number
    description: Test coverage percentage for modified code.
---

# Verify Code Changes

## Step 1: Run Static Analysis

Run `npm run lint`. Fix all violations before proceeding.

## Step 2: Run Unit Tests

Run `npm run test:unit -- --coverage`. All tests must pass.

## Step 3: Check Coverage Threshold

Analyze the coverage report and verify it meets the project threshold.
Report the coverage percentage.
```

#### Security Scan Skill

```markdown
---
name: security-scan-secrets
version: 1.0.0
description: >
  Scans the diff for accidentally committed secrets or credentials.
  Use when any files have been modified in a PR.
author: "@idp-admin"
domain: security
tags:
  - security
  - secrets
  - verification
inputs:
  - name: diff_ref
    type: string
    required: true
    description: "Git ref or range to scan (e.g., 'HEAD~1..HEAD')."
outputs:
  - name: secrets_found
    type: boolean
    description: Whether any secrets were detected.
  - name: findings
    type: array
    description: List of detected secret locations and types.
---

# Scan for Leaked Secrets

## Step 1: Run Gitleaks

Run gitleaks against the specified diff range:

\`\`\`bash
gitleaks detect --source . --log-opts '<diff_ref>' --report-format json
\`\`\`

If secrets are detected, stop and report the findings.

## Step 2: Report Findings

Use the GitHub MCP `add_issue_comment` tool to report the scan results
on the relevant issue, if one is associated.
```

### Creating New Skills

When creating a new agent skill:

1. Check existing skills in `/.claude/skills/` to avoid duplication.
2. Create a new directory: `/.claude/skills/<skill-name>/`.
3. Write a `SKILL.md` file with YAML frontmatter and Markdown execution instructions following the agentskills.io format.
4. Write a clear description that explains both what the skill does and when to use it.
5. Document all inputs and outputs with types in the frontmatter.
6. Use step-by-step Markdown sections (`## Step N: ...`) for execution instructions.
7. Prefer MCP tool calls over shell commands where an MCP tool exists.
8. Compose existing skills via `depends_on` rather than reimplementing their logic.
9. Place supporting scripts in a `scripts/` subdirectory within the skill folder.
10. Submit the skill definition in a PR with a `feat(skills):` conventional commit referencing the source issue.

## Agent-Specific Instructions

### When Working on This Project

- **Start from an issue.** Always query GitHub Issues via the MCP server to find or verify the issue driving your work before writing code.
- Always check for and respect existing patterns before introducing new ones.
- If a decision involves a trade-off between security and convenience, choose security.
- When adding a new service or capability, also define its MCP tool interface.
- Containerize early. If you are creating a new service, include the Dockerfile in the same PR.
- Think about multi-tenancy implications for any data model or storage change.
- Consider the self-hosted deployment path: avoid hard dependencies on specific cloud providers.
- Post progress and decisions as comments on the relevant GitHub Issue.
- When you discover work that is out of scope for the current issue, create a new issue for it rather than scope-creeping.

### File and Directory Conventions

- `/src/` - Application source code, organized by service or module.
- `/deploy/` - Container definitions, Kubernetes manifests, Helm charts.
- `/plugins/` - Plug-in SDK and example plug-ins.
- `/docs/` - Project documentation, ADRs, and guides.
- `/tests/` - Integration and end-to-end tests (unit tests live alongside source).
- `/tools/` - Developer tooling, scripts, and MCP server definitions.
- `/.claude/skills/` - Agent skills, each in a `<skill-name>/SKILL.md` directory (agentskills.io format).

### Technology Preferences

- Favor TypeScript/JavaScript for web services and tooling where appropriate.
- Use proven container orchestration (Kubernetes) for production deployments.
- PostgreSQL as the default relational database; consider tenant-aware connection pooling.
- Redis or equivalent for caching and ephemeral state.
- Use structured logging (JSON) with correlation IDs across all services.
- OpenTelemetry for distributed tracing and metrics.

### What Not to Do

- Do not disable security features to make development easier.
- Do not introduce cloud-provider-specific lock-in without an abstraction layer.
- Do not bypass the plug-in sandbox or tenant isolation for any reason.
- Do not add AI/LLM calls without proper error handling, rate limiting, and cost awareness.
- Do not store secrets in code, environment files committed to version control, or container images.
- Do not use symlinks. They cause inconsistent behavior across platforms (Windows, macOS, Linux) and within container builds. Prefer copying or direct file placement instead.
