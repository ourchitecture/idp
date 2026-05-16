# Iterative Small Commits (Shared)

Canonical rules for commit cadence. Referenced by AGENTS.md and skills.

Source control is the agent's working memory. Use it instead of trying to
plan, implement, and perfect a large change in one edit pass.

## Commit on every meaningful step

- Commit after every new file, every edit to an existing file, every deletion.
  "Meaningful" is small — a single file change that leaves the repo coherent.
- Prefer many small commits over one large commit.
- Stage related files together only when they make sense as a unit (e.g., a
  generated artifact + its source). Otherwise, commit each change separately.
- Run cheap lint/test for the touched scope before committing when feasible;
  let broader CI surface anything missed.

## Don't hold the whole change in memory

- Do not accumulate edits across many files before writing any to disk.
- Re-read a file just before editing it — even if you edited it earlier in
  the same session. The file on disk is ground truth, not your model of it.
- When a task feels too big to commit in one step, split into a sequence:
  scaffolding → wiring → behavior → docs → tests. Land each slice first.

## Iterate through commits, not through rework

- Changing a file one way, then revising it in a follow-up commit, is normal
  and expected. The earlier commit is a checkpoint, not wasted work.
- Prefer a follow-up commit (`fix:`, `refactor:`, squash at merge) over
  silently rewriting an earlier commit. Other agents may be reading
  intermediate state.
- If a direction was wrong, revert or adjust with a new commit. Do not
  force-push to erase exploration on a shared branch.

## Deletes and moves are commits too

- Deleting a file is worth its own commit. Don't bundle unrelated deletions
  into a feature commit.
- Renames and moves should be committed separately from behavioral changes
  so git detects the rename cleanly.
