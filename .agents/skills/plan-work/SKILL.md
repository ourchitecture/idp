---
name: plan-work
version: 1.0.0
description: >
  Reads a GitHub Issue, analyzes the requirements, explores the
  codebase for relevant context, and produces a structured
  implementation plan whose canonical review artifact is a
  comment posted on the issue. Always stops after posting the
  plan -- a maintainer must approve before implementation
  begins. Use this skill when an issue is ready for work and
  needs a plan before coding starts.
author: "@idp-maintain"
domain: devops
tags:
  - github
  - issues
  - planning
  - workflow
  - automation
depends_on: []
inputs:
  - name: issue_number
    type: number
    required: true
    description: The GitHub Issue number to plan work for.
outputs:
  - name: plan
    type: object
    description: >
      Structured implementation plan including files to modify,
      approach, risks, estimated complexity, and the posted plan
      comment reference.
  - name: ready_to_implement
    type: boolean
    description: >
      Whether the plan is complete enough for implementation and
      has been posted to the GitHub issue for maintainer review.
      Only true after the issue comment is created successfully.
---

# Plan Work

Reads a GitHub Issue, explores the codebase, and creates an
implementation plan posted as a comment for maintainer approval.
The GitHub issue comment is the authoritative review artifact.
This skill never implements code -- it only plans.

## Step 1: Fetch the Issue

Use the GitHub MCP `get_issue` tool to retrieve the full issue
body, labels, assignee, and all comments for the given
`issue_number`.

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh issue view <issue_number> --json number,title,body,labels,assignees,comments,author,state
```

If the issue is closed, stop and report that the issue is already
resolved.

## Step 2: Verify Authorization and Status

Check the issue labels and state:

1. The issue must have the `ready` label. If it only has
   `needs-triage`, stop and report that the issue needs maintainer
   approval first.
2. If the issue has `in-progress` label, check the comments for a
   prior plan. If a plan already exists:
   - Compare the current issue body to the plan's assumptions. If
     the issue has been edited since the plan was posted, note the
     changes and create an **updated plan** rather than a duplicate.
   - If the plan is unchanged, do **not** create a duplicate plan
     comment. Report that the existing plan is still valid and link
     to the existing comment.
3. If the issue has `blocked` label, stop and report the blocker.

## Step 3: Claim the Issue

Add the `in-progress` label to the issue to signal that planning
is underway. This prevents duplicate work by other agents.

Use the GitHub MCP `update_issue` tool or:

```bash
gh issue edit <issue_number> --add-label "in-progress"
```

## Step 4: Analyze Requirements

Parse the issue body to extract:

- **Description**: What needs to be built or fixed
- **Acceptance Criteria**: Testable conditions for completion
- **Priority**: From the priority label
- **Domain**: From the domain label
- **Constraints**: Any noted limitations or requirements

If the issue is unclear or missing acceptance criteria, post a
comment asking for clarification and add the `blocked` label.
Remove `in-progress`. Stop and report.

## Step 5: Explore the Codebase

Based on the requirements and domain:

1. Search for existing files, functions, and patterns relevant to
   the change.
2. Identify files that will need modification.
3. Check for existing tests, documentation, or configuration that
   should be updated.
4. Look for reusable utilities, components, or patterns to follow.
5. Review AGENTS.md for architectural guidelines relevant to the
   domain.
6. If the repo defines canonical issue worktree helpers, detect
   whether an issue worktree already exists for this issue and note
   the expected handoff path, but do not create or mutate worktrees
   during planning.

## Step 6: Create the Implementation Plan

Produce a structured plan covering:

1. **Summary**: One-paragraph overview of the approach.
2. **Files to Create or Modify**: List each file with a brief
   description of the changes needed.
3. **Approach**: Step-by-step implementation strategy.
4. **Existing Patterns to Follow**: Reference existing code that
   should be used as a model.
5. **Risks and Open Questions**: Anything uncertain or potentially
   problematic.
6. **Verification**: How to test that the implementation is correct.
7. **Estimated Complexity**: Low / Medium / High based on the
   number of files, conceptual complexity, and risk.
8. **Implementation Handoff**: Include the canonical issue worktree
   location and whether implementation should create or reuse it.

## Step 7: Post the Plan to the Issue

Use the GitHub MCP `add_issue_comment` tool to post the plan as a
formatted comment on the issue. This step is mandatory: the skill is
not complete until the issue comment exists.

**Fallback**: If the MCP tool is unavailable, use the `gh` CLI:

```bash
gh issue comment <issue_number> --body "<plan>"
```

The comment should start with a clear header:

```markdown
## Implementation Plan

> Posted by AI agent. Maintainer approval required before
> implementation begins.
```

If comment creation fails for any reason:

1. Stop immediately.
2. Do **not** set `ready_to_implement` to `true`.
3. Return the exact ready-to-post Markdown in the local output so a
   maintainer can post it manually.
4. Clearly state that the skill did not complete because the plan was
   not posted to the issue.

## Step 8: Update Issue Labels

Replace `in-progress` with `needs-review` to signal that the plan
is ready for maintainer review. The review handoff is not complete
until the issue is left in a review-ready state:

```bash
gh issue edit <issue_number> --remove-label "in-progress" --add-label "needs-review"
```

## Step 9: Report Results

Output the structured plan, include the posted issue comment link, and
set `ready_to_implement` to `true` only after:

1. the plan comment was created successfully, and
2. the issue was transitioned to review-ready state.

Remind the user that implementation should not begin until a
maintainer approves the plan by commenting on the issue. After
approval, use the `/ship-changes` skill with the `issue_number`
input to complete the cycle. If the repo has canonical worktree
helpers, include the issue worktree handoff in the report so
implementation starts from the correct checkout.

## Handling Issue Changes After Planning

If this skill is invoked again for an issue that already has a
plan:

1. Compare the current issue body and comments against the
   previous plan.
2. If the issue has changed, create a new plan comment noting
   what changed and how the plan is updated.
3. If the issue is unchanged, report that the existing plan is
   still valid and link to it.

This ensures the workflow is idempotent and resilient to mid-flight
changes in requirements.

## Definition of Done

This skill is done only when all of the following are true:

1. A plan issue comment exists and is the canonical artifact for review.
2. The issue is labeled for review (`needs-review`) rather than left only
   in `in-progress`.
3. The local output includes the posted-plan summary and the comment link.
