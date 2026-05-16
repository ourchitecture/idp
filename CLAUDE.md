# CLAUDE.md

Immediate context for Claude Code. Full rules live in
[AGENTS.md](AGENTS.md) (the index) and [`.agents/docs/`](.agents/docs/).

## Top-5 always-on rules (no AGENTS.md fetch needed)

1. **Repo boundary.** Never read, write, or run commands outside the repo
   root. Find the root with `git rev-parse --show-toplevel`.
2. **No `cd` prefix in Bash tool calls.** Working directory is already the
   repo root; `cd ... && git ...` breaks the `Bash(git *)` allowlist.
3. **Never commit secrets; never skip hooks** (`--no-verify`,
   `--no-gpg-sign`). If a hook fails, fix the cause.
4. **Conventional Commits + issue refs.** Use `<type>(<scope>): <subject>`
   with `Closes #N` (when complete) or `Refs #N`. Full rules in
   [`.agents/docs/shared/commit-format.md`](.agents/docs/shared/commit-format.md).
5. **Source control is working memory.** Re-read before editing; commit
   after every meaningful step. See
   [`.agents/docs/shared/iterative-commits.md`](.agents/docs/shared/iterative-commits.md).

## Skills

Agent skills live in [`.agents/skills/<name>/SKILL.md`](.agents/skills/).
Claude Code does not yet auto-discover that path; load skills explicitly.

## More

Everything else — issue workflow, build commands, CI/CD policy, code style,
documentation requirements — is indexed in [AGENTS.md](AGENTS.md).
