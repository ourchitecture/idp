# GitHub API Access (Shared)

Canonical rules for any GitHub API operation: PR creation, issue comments,
label updates, branch listing, check runs. Referenced by AGENTS.md and skills.

## Two independent transport channels

- **Git protocol** (`commit`, `push`, `pull`) uses the local git proxy. Works
  independently of GitHub API availability.
- **GitHub API** (PR, issues, labels) uses one of the channels below. It is
  valid and expected to commit/push while the API is briefly unavailable;
  resume API operations as soon as any channel works.

## Access priority (try in order)

1. **GitHub MCP tools** — probe for `mcp__github__*`, `github-mcp-server-*`,
   or similar prefixes in the active tool set before concluding they are absent.
2. **`gh` CLI** — if installed and `gh auth status` succeeds. Prefer over raw
   REST for better token handling.
3. **Direct REST API** — if `GITHUB_TOKEN` is present. Pass tokens via
   `--header @token-file` or env vars in a trusted script; never on the
   command line or in shell history.
4. **Surface and continue** — if no channel works, emit ready-to-use content
   (PR title/body, comment text) and maintain a pending-operations list. Keep
   doing local work that doesn't need the API. Resume API ops first thing when
   any channel returns.

## Operation sequencing after a push

1. `git push` (always works).
2. **Validate branch visibility** on GitHub: list branches and look for the
   head branch. The proxy syncs asynchronously — retry with exponential
   backoff (2 s, 4 s, 8 s, 16 s; up to 4 polls) if absent. Do not create a PR
   against an invisible branch.
3. Create the PR via the first available channel.
4. Update the linked issue: remove `in-progress`, add `needs-review`, or
   close if the PR body contains `Closes #N`.
5. Post a summary comment on the issue.

If any step fails, record exactly which steps completed. Never leave the
issue in a stale label state.

## Transient MCP retry

- Retry transient errors (HTTP 5xx, timeout, rate limit) up to 4 times with
  backoff 2 s, 4 s, 8 s, 16 s. Log each attempt.
- After 4 failures, fall back to the next channel.
- Do **not** retry 4xx client errors — those need human input.

## CI check failure debugging

MCP tools expose check-run metadata but cannot retrieve raw logs.

1. Call `pull_request_read` with `method: get_check_runs` to identify the
   failed job.
2. **Immediately ask the user for the failing log lines.** Do not speculate
   from metadata.
3. Diagnose once logs are provided.

A single question is always faster than inferring from timing or code
inspection.
