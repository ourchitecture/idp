# Core Rules (Tier 1 — Always Relevant)

Apply these to every task. The other docs in `.agents/docs/` add detail; these
rules are non-negotiable.

## Core principles

- Secure by default: zero-trust, least privilege, no secrets in code, TLS 1.3+.
- Container-first: services include Dockerfiles; everything should run in containers.
- AI-first and MCP-first: expose capabilities via MCP tools alongside APIs.
- Extensible via plug-ins with clear extension points and sandboxed execution.
- Multi-tenant SaaS ready and self-hostable from day one.

## Repository boundary

Agents must never navigate, read, write, or execute commands outside the
repository root.

- The root is the directory containing `AGENTS.md` and `.git/`. Find it with
  `git rev-parse --show-toplevel`; never hard-code an absolute path.
- No traversal to parent directories (`../`). All tools must stay at or
  below the root.
- Never read host or sibling-repo config files. Use only configs that exist
  inside this repo.
- If a tool unexpectedly resolves outside the root, stop and report.

## What not to do

- Do not navigate, read, or write outside the repository root.
- Do not use symlinks.
- Do not disable security features.
- Do not introduce cloud-provider lock-in without an abstraction.
- Do not add AI/LLM calls without error handling, rate limits, and cost controls.
- Do not commit secrets, credentials, or environment-specific configs.

## Validation and verification

- Re-check file system after moves/deletes — re-list to confirm.
- Verify by reading or listing the affected paths.
- Call out leftover empty directories and remove them when safe.
- When a request mentions a specific path, confirm it exists (or is removed).
- When you claim cleanup, show the resulting layout in the response.

## Output conciseness

- Lead with the result; put supporting detail after, not before.
- Omit preamble ("I will now...", "Let me...") and trailing summaries that
  restate what was just done.
- Prefer a table or bullet list over prose paragraphs for structured data.
- When returning structured outputs (JSON, findings arrays), return only the
  structure — do not narrate it.
- For multi-step skills, report each step's outcome in one line.
