# CLAUDE.md

This file gives Claude Code immediate context about this repository.
Full development standards, maintenance rules, and agent workflow are in
[AGENTS.md](AGENTS.md) — treat it as the authoritative operating manual.

## Skills

Agent workflow skills are defined in `.agents/skills/`. Each skill is a
directory containing a `SKILL.md` file. Claude Code discovers them locally
via `.claude/skills/`, which is a symlink or junction created by `npm install`
and is not tracked by git.

When reading this repository through a tool that does not have a local
checkout (for example the GitHub MCP server), read skills directly from
`.agents/skills/<name>/SKILL.md`.

> Details on the cross-platform setup, agent rules for the skill bridge, and
> maintenance instructions are documented in the **Claude Code Skill Discovery
> Bridge** section of [AGENTS.md](AGENTS.md).
