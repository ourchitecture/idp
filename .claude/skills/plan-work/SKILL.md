---
name: plan-work
version: 1.1.0
description: >
  Reads a GitHub Issue, explores the codebase, and posts a structured
  implementation plan as an issue comment for maintainer approval. Never
  implements code. Stops after the comment is posted.
author: "@idp-maintain"
domain: devops
tags: [github, issues, planning, workflow, automation]
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: true
    description: The GitHub Issue number to plan work for.
outputs:
  - name: plan
    type: object
    description: Files to modify, approach, risks, complexity, posted-comment ref.
  - name: ready_to_implement
    type: boolean
    description: True only after the plan comment was posted successfully.
---

# Plan Work

The issue comment is the authoritative review artifact. This skill never
implements code.

GitHub API access: [../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## Branch policy

Non-mutating. Runs from main checkout; must not create branches. If the
runtime auto-creates a branch at session start, delete it before completing
(no commits, no PR opened). The `audit-work-integrity` skill flags violations.

## 1. Fetch the issue

MCP: `get_issue`. CLI fallback:
`gh issue view <issue_number> --json number,title,body,labels,assignees,comments,author,state`.

If closed, stop and report.

## 2. Verify authorization and status

- Must have `ready`. If only `needs-triage`, stop and report.
- If `in-progress` with a prior plan, compare current body to plan
  assumptions. If unchanged, link the existing comment (no duplicate). If
  the issue was edited, post an **updated plan** noting the changes.
- If `blocked`, stop and report the blocker.

## 3. Claim the issue (mandatory)

Add `in-progress` immediately to prevent duplicate work. Do not proceed
without the label. If labeling fails, stop and report.

`gh issue edit <issue_number> --add-label "in-progress"`

## 4. Analyze requirements

Extract from the issue body: description, acceptance criteria, priority,
domain, constraints. If unclear or missing criteria, comment asking for
clarification, add `blocked`, remove `in-progress`, and stop.

## 5. Explore the codebase

For the relevant domain:

1. Search for files, functions, and patterns related to the change.
2. Identify files that will need modification.
3. Check tests, docs, and config that should be updated.
4. Look for reusable utilities and existing patterns.
5. Detect if an issue worktree already exists (see
   [../../docs/shared/worktree.md](../../docs/shared/worktree.md)) — note
   the expected handoff path. Do not create or mutate worktrees here.

## 6. Build the plan

Produce: **Summary** (1 paragraph), **Files to create/modify**, **Approach**
(step-by-step), **Existing patterns to follow**, **Risks/open questions**,
**Verification**, **Estimated complexity** (low/medium/high), **Implementation
handoff** (worktree location and create-vs-reuse).

## 7. Post the plan to the issue (mandatory)

The skill is not complete until the comment exists. Use MCP
`add_issue_comment` or `gh issue comment`. Start the comment with a
`## Implementation Plan` header and a note that maintainer approval is
required before implementation begins.

If posting fails: stop, do **not** set `ready_to_implement=true`, return the
exact ready-to-post Markdown so a maintainer can post manually, and report
incompletion.

## 8. Update labels

Replace `in-progress` with `needs-review`:

`gh issue edit <issue_number> --remove-label "in-progress" --add-label "needs-review"`

## 9. Report

Return the structured plan, the posted-comment link, and set
`ready_to_implement=true` only when both the comment exists and the issue is
in review-ready state. Remind the user implementation waits for maintainer
approval, then `/ship-changes` with the `issue_number` input.

## Definition of done

1. Plan comment exists as the canonical review artifact.
2. Issue is labeled `needs-review` (not just `in-progress`).
3. Output includes plan summary + comment link.
4. No agent-created branch remains.
