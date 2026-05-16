# Multi-Agent Collaboration

Multiple agents may work in this repo concurrently. Each operates independently
but must assume others are making changes in parallel.

## Cooperative defaults

- Assume other agents act in good faith and follow these same rules.
- Prefer cooperative, additive changes over defensive guards.
- Trust concurrent agents are scoped to their own issues/branches; don't
  re-validate their output without direct evidence of breakage.
- Don't re-generate or overwrite artifacts that already satisfy a requirement.

## Iterative and minimal changes

- Make the smallest change that satisfies the current task. Don't refactor
  unrelated code.
- Prefer appending or patching over rewriting. Wholesale rewrites increase
  merge conflicts.
- Commit atomically and frequently so concurrent agents can rebase cleanly.
- See [shared/iterative-commits.md](shared/iterative-commits.md) for full
  commit-cadence rules.

## Real-time adaptation

- Re-read any file before editing — don't rely on a cached version from earlier
  in the session.
- Verify file state on disk after a change before reporting done.
- On unexpected state or conflict, stop and comment rather than guessing.

## Protecting unique work

- Scope branches tightly to the issue. Avoid touching files outside scope.
- If a shared file (`package.json`, `Makefile`, workflows) must change, note it
  in the issue comment so other agents can rebase.
- Never silently revert or overwrite another agent's recent commit. Surface
  conflicts explicitly.

## Worktree isolation

See [shared/worktree.md](shared/worktree.md) for canonical worktree rules.

## Branch hygiene

Agent-created branches must not accumulate without corresponding open PRs.

- Planning, triage, review, read-only skills run from main and must not
  create branches.
- If the runtime auto-creates a branch at session start, the skill must
  delete it before completing when no commits were made and no PR was opened.
- Any non-exempt branch with zero commits ahead of `main` and no open PR is
  considered orphaned. The weekly cleanup workflow deletes it.
- Do not create multiple branches for the same issue (`fix/foo-again`,
  `fix/foo-another-one` signal process failure). Reconcile the existing
  branch instead.
- Exempt from cleanup: `main`, `master`, branches prefixed `release-please--`.
