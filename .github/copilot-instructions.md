# GitHub Copilot Custom Instructions

This file provides GitHub Copilot with context about this repository's conventions and workflow.

## Primary Operating Manual

**All development standards, maintenance rules, and agent workflow are documented in [AGENTS.md](../AGENTS.md)** at the repository root. Treat it as the authoritative operating manual for this codebase.

Key sections in AGENTS.md include:

- Multi-agent collaboration rules
- Iterative small commits workflow
- Issue-driven development process
- Build, lint, and test conventions
- Security and validation standards
- Git and branching standards
- Documentation requirements

## Agent Skills

Agent workflow skills are defined in `.agents/skills/`. Each skill is a directory containing a `SKILL.md` file with metadata and implementation instructions.

### Skill Directory Structure

- `.agents/skills/plan-work/` - Plan implementation from GitHub Issues
- `.agents/skills/ship-changes/` - End-to-end commit, push, PR, and merge workflow
- `.agents/skills/triage-managed-work/` - Triage issues from team members
- `.agents/skills/triage-community-work/` - Triage issues from external contributors
- `.agents/skills/audit-work-integrity/` - Audit repository for workflow violations
- `.agents/skills/check-intent-coverage/` - Verify Gherkin feature coverage
- `.agents/skills/privacy-scan/` - Scan for secrets and sensitive data
- `.agents/skills/find-work/` - Discover available issues
- `.agents/skills/research-name-availability/` - Check availability of project names
- `.agents/skills/review-*` - Code review and validation skills (pattern for future review-focused skills)

## Code Conventions

### General Principles

- Secure by default: zero-trust, least privilege, TLS 1.3+
- Container-first: everything runs in containers
- AI-first and MCP-first: expose capabilities via MCP tools alongside APIs
- Multi-tenant SaaS ready and self-hostable

### Commit Standards

- Use Conventional Commits format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `security`, `revert`
- Always include issue references: `Refs #N` or `Closes #N`
- Keep commits atomic and scoped to one logical change

### Build and Test Commands

The repository uses `moon` as the canonical task runner with GNU Make as optional convenience wrappers:

- Install deps: `pnpm install`
- Lint Markdown: `moon run repo:check-lint-md` or `make check-lint-md`
- Run contract tests: `pnpm run test:contract`
- Full validation: `make ci`

See AGENTS.md for complete command reference.

## What Not To Do

- Do not navigate, read, write, or execute commands outside the repository root
- Do not commit secrets, credentials, or environment-specific configs
- Do not bypass auth/permission checks
- Do not introduce cloud-provider lock-in without abstraction
- Do not add AI/LLM calls without error handling, rate limits, and cost controls

## Cross-Platform Support

Local developer startup must work smoothly on Windows, macOS, and Linux. Default to loopback binding for local services and document platform-specific caveats.

---

> **Note**: This file is intentionally brief. For comprehensive guidance, always refer to [AGENTS.md](../AGENTS.md).
