# Git Standards

See [shared/commit-format.md](shared/commit-format.md) for Conventional Commits
and issue-reference rules.
See [shared/iterative-commits.md](shared/iterative-commits.md) for commit
cadence discipline.

## Branch protection (GitHub rulesets on `main`)

Enforced:

- All changes require a PR; direct pushes are blocked.
- At least one approving review from a CODEOWNERS-designated reviewer.
- Stale approvals are dismissed when new commits are pushed.
- All PR conversations must be resolved before merge.
- The `pr-validation-result` status check must pass.
- Only squash merges are permitted (linear history required).
- Force pushes to `main` are blocked.
- Deletion of `main` is blocked.

`idp-admin` members can bypass rulesets in emergencies; use sparingly and
document in the issue or PR.

Agents must not attempt merges that violate these constraints — GitHub will
reject the operation.

## Versioning

- Use SemVer (`MAJOR.MINOR.PATCH`) for all versioned artifacts.
- Bump versions in the same PR as the change.

## Hooks

- Never skip hooks (`--no-verify`, `--no-gpg-sign`, etc.) unless explicitly
  requested by the user. If a hook fails, fix the underlying issue rather
  than bypassing it.
