# Spec: Plan Work — Agent Skill

> **Evaluation artifact — Axis A.** This file is a spec-kit `spec.md`
> equivalent of the `plan-work` agent skill
> (`/.agents/skills/plan-work/SKILL.md`). It demonstrates what the
> skill would look like if authored using spec-kit's workflow.
> The authoritative skill definition remains `SKILL.md`. Do not use
> this file as a skill implementation.

## Overview

The plan-work skill reads a GitHub Issue, explores the relevant codebase
context, and produces a structured implementation plan posted as a
comment on the issue for maintainer review. It never writes code;
its sole output is the plan comment. Implementation begins only after
a maintainer explicitly approves the plan.

## Functional Requirements

### FR-01: Issue retrieval

The skill must fetch the full issue body, labels, assignee, and all
comments for a given issue number using the GitHub API.

### FR-02: Authorization and status check

The skill must verify that:

- The issue has the `ready` label (not just `needs-triage`).
- If the issue already has an `in-progress` label, it must check
  for a prior plan comment before creating a duplicate.
- If the issue has a `blocked` label, it must stop and report.

### FR-03: Issue claim

The skill must add the `in-progress` label to the issue before any
codebase exploration or plan creation. This step is non-negotiable
and prevents duplicate work by concurrent agents.

### FR-04: Requirements analysis

The skill must extract from the issue body:

- Description of what needs to be built or fixed
- Acceptance criteria (testable conditions for completion)
- Priority from the priority label
- Domain from the domain label
- Any stated constraints or limitations

If the issue is unclear or missing acceptance criteria, the skill must
post a clarification comment, add `blocked`, remove `in-progress`, and
stop.

### FR-05: Codebase exploration

The skill must search the codebase for files, patterns, and utilities
relevant to the issue domain before writing the plan.

### FR-06: Structured plan creation

The skill must produce a plan containing:

1. Summary (one-paragraph overview)
2. Files to create or modify (with descriptions)
3. Step-by-step implementation approach
4. Existing patterns to follow
5. Risks and open questions
6. Verification steps
7. Estimated complexity (Low / Medium / High)
8. Implementation handoff (issue worktree path, branch name)

### FR-07: Plan posted to GitHub Issue

The plan must be posted as a formatted comment on the GitHub Issue.
The skill is not complete until the comment exists. If posting fails,
the skill must surface the ready-to-post Markdown for manual posting.

### FR-08: Label handoff

After posting, the skill must replace `in-progress` with `needs-review`
to signal that the plan is ready for maintainer review.

### FR-09: No branch creation

The skill must not create any git branches. If the agent runtime
automatically creates a branch at session start, the skill must delete
it before completing.

### FR-10: Repo-policy fidelity

The plan must respect:

- Canonical issue worktree paths (`.agents/worktrees/issue-N-slug`)
- Conventional Commits message format
- `Closes #N` vs `Refs #N` footer language
- ADR guardrails (intake threshold, long-lived docs reference rule)
- Label taxonomy (`ready`, `in-progress`, `needs-review`, `blocked`)

## Configuration

- `issue_number` (required): GitHub Issue number to plan work for.

## Out of Scope

- Writing any code.
- Creating or mutating git branches or worktrees.
- Merging or closing the issue.

---

## Evaluation Notes (Axis A)

### What spec-kit captures well

- **Functional requirements** — the ten FRs above map cleanly to the
  ten procedural steps in `plan-work/SKILL.md`. spec-kit's `spec.md`
  can describe the skill's behavior at this level of detail.
- **Overview and out-of-scope** — straightforward prose sections.
- **Configuration** — `spec.md` can list the `issue_number` input
  parameter.

### What spec-kit does not capture

1. **GitHub API integration specifics.** `SKILL.md` embeds exact `gh`
   CLI commands, MCP tool names (`issue_read`, `issue_write`), and
   fallback sequences. spec-kit's `spec.md` is tool-agnostic; the
   agent decides how to execute the requirements, which means repo
   policy details (which MCP tool to call first, what to do if
   unavailable) live outside the spec artifact.

2. **Label taxonomy as a first-class constraint.** The `plan-work`
   skill depends on the exact label strings `ready`, `in-progress`,
   `needs-review`, `blocked` and their semantic meanings within this
   repo's workflow. spec-kit `spec.md` can mention these strings but
   treats them as prose; there is no validation that an agent honors
   the label state machine.

3. **Commit closure language.** `SKILL.md` specifies `Closes #N` vs
   `Refs #N` with explicit rules about when each applies. A spec-kit
   spec can state this as FR-10, but an agent reading a generic
   spec-kit spec would not know to follow this repo-specific rule
   without additional guidance.

4. **Worktree lifecycle rules.** `AGENTS.md §"Issue Worktree
   Isolation"` defines canonical worktree paths, branch naming, and
   cleanup rules. `SKILL.md` references these rules. spec-kit's
   `spec.md` can cite file paths but does not enforce compliance.

5. **Idempotency handling.** `SKILL.md` specifies exactly what to do
   when the skill is invoked for an issue that already has a plan
   (compare vs. re-plan vs. duplicate-guard). This nuanced behavioral
   branch is hard to represent in spec-kit's narrative FR format
   without essentially rewriting the SKILL.md prose.

6. **Agent-runtime branch cleanup.** FR-09 above captures the
   requirement, but the mechanism (detect auto-created branch, prune
   before exit) requires agent-runtime awareness that lives in
   SKILL.md's procedural steps, not in a declarative spec.

### Cross-skill overlap

spec-kit's `/speckit.specify → /speckit.plan → /speckit.tasks →
/speckit.implement` chain overlaps structurally with
`find-work → plan-work → ship-changes`. The overlap creates three
questions:

1. **Wrap or replace?** spec-kit templates could wrap the IDP repo's
   policy on top of the generic spec-kit flow, but keeping the two
   skill sets synchronized is an ongoing maintenance cost. The IDP
   skills are already repo-policy-aware; spec-kit templates are not.

2. **Where does the plan live?** IDP's `plan-work` posts the plan as
   a GitHub Issue comment (the canonical review artifact). spec-kit's
   `plan.md` lives in `.specify/specs/NNN-feature/`. These are not
   interchangeable: maintainers and agents in this repo look for plans
   on the issue, not in `.specify/`.

3. **External agent compatibility.** Other agents or CI tools that
   interact with this repo via GitHub Issues would not find spec-kit
   plan artifacts. Migrating to spec-kit's artifact model would break
   those integrations unless a bridge layer is maintained.
