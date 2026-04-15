---
slug: from-babysitting-agents-to-choreographing-contributions
title: From babysitting agents to choreographing contributions
authors: [eric]
tags: [ai, agents, developer-experience, open-source, idp]
---

# From babysitting agents to choreographing contributions

One of the more humbling lessons in the IDP project so far is this:

The problem is often not that an agent is unintelligent.

The problem is that the work system around the agent is underdefined.

That may sound obvious in hindsight, but it becomes clearer only after enough friction. A planning agent creates an empty pull request with zero commits. A work session silently dies. A vendor account hits a usage cap in the middle of a task. An agent declares success when the acceptance criteria are still clearly unmet. A pull request is opened or handed off before checks have completed. The human ends up doing what the system did not do: notice, remember, verify, escalate, and clean up.

That is not scaling. That is babysitting.

This post is not a complaint about AI tools. It is a reality check about contribution choreography in an open-source project that wants to be both AI-friendly and community-friendly.

## The tension

The promise of agentic development is easy to see.

Small tasks can be worked in parallel.
Documentation can improve faster.
Boilerplate can be reduced.
Validation can begin earlier.
More contributors can participate with a wider range of tools and skill levels.

But the operational reality is less glamorous.

A repo can quickly drift into a mode where one maintainer becomes the scheduler, clarifier, reviewer, and recovery mechanism for a collection of half-autonomous workers. Instead of focusing on direction, design, and final judgment, the maintainer spends time asking questions like:

- Did the work actually start?
- Is this agent stuck?
- Did it hit a token limit?
- Is this PR empty?
- Did it run the required checks?
- Is it done, or did it just stop?
- What exactly should happen next?

When that becomes normal, the system is not yet agentic in a healthy way. It is still human-powered, just with more interruptions.

## What the IDP project already has

The IDP repository is not starting from zero.

It already has several strong foundations:

- issue-first contribution flow
- repository worktree isolation
- draft-to-ready pull request lifecycle
- path-aware pull request validation
- issue triage automation
- branch cleanup automation
- explicit agent operating guidance in `AGENTS.md`
- a willingness to support multiple tools rather than forcing one editor or one agent

That matters.

The repo already reflects a deeper truth: contribution quality depends on the operating model around work, not just the quality of the worker. The current repository has already invested in guardrails and clarity.

But there is still a gap between strong single-agent discipline and scalable multi-agent choreography.

That gap is where much of the current pain lives.

## The real challenge

The next challenge for the IDP project is not "which agent is best?"

It is:

How do humans and many small workers hand work to one another in a way that is observable, cheap, vendor-neutral, and safe enough for open-source collaboration?

That question has several sharp edges.

### 1. Open source changes the economics

A contributor should not need my subscriptions, my tokens, or my vendor accounts.

That includes direct and indirect dependence.

If a contribution workflow only works because one maintainer owns premium AI accounts, that workflow is not truly community-ready. It may work privately. It does not scale as a contribution model.

The contribution model has to let each person bring their own tools:
- paid cloud agents
- free local models
- editor integrations
- terminal tools
- no AI at all

The project must provide the choreography, not the subscription.

### 2. Completion is not the same as stopping

A surprising amount of agent failure is not an obvious crash.

It is quiet incompleteness.

An agent stops and assumes it is done.
A partial implementation looks polished enough to seem complete.
A PR exists, but the work is not actually ready for review.
A handoff happens with no real evidence that the next worker can trust.

This is one reason AI work creates so much second-guessing. A clean diff is not the same as completed work. A response is not evidence. A stopped session is not a valid handoff.

### 3. Parallelism makes ambiguity more expensive

One vague task given to one agent is already risky.

Ten vague tasks given to ten workers in parallel multiplies the confusion.

Parallelism does not save the project unless the units of work are smaller, clearer, and easier to validate than the larger problem they came from.

In other words, scale requires decomposition discipline.

### 4. Cheap workers matter

Not every task deserves a premium cloud model.

Some tasks are repetitive and mechanical:
- summarize a failing PR
- extract changed files
- draft a handoff note
- convert issue acceptance criteria into a checklist
- propose documentation patches
- cluster similar failures
- identify likely scope drift
- suggest follow-up work packets

These are exactly the kinds of tasks where contributor-owned local models may be useful, especially when the project is trying to remain inclusive and cost-conscious.

The future contribution model should make room for low-cost local grunt work without pretending that every local model is good at everything.

## A useful shift in perspective

The most helpful shift I have found is this:

Stop treating an agent session as the unit of work.

Treat a small, leased, validated work packet as the unit of work.

That changes the conversation.

Instead of asking, "Did the agent finish?" we ask:

- What packet did it claim?
- What scope was allowed?
- What evidence did it produce?
- Did it renew its lease?
- Is it stalled, expired, blocked, or ready for handoff?
- Who or what should receive it next?

This is a much healthier mental model for open-source contribution at scale because it works with:
- humans
- premium agents
- local models
- different editors
- different operating systems
- interrupted sessions
- partial progress
- explicit human checkpoints

The project does not need one giant always-on orchestrator first.

It needs a better contract for small work and safer handoffs between workers.

## Observations from the IDP project itself

The IDP repo is already teaching a few important lessons.

### Strong repository rules are necessary, but not sufficient

`AGENTS.md` is valuable. It sets expectations clearly. It establishes worktree isolation, issue-first behavior, PR lifecycle expectations, validation expectations, and repository boundaries.

That kind of prose matters.

But prose alone is not enough for parallel agentic work. A human can interpret prose well. A mixed ecosystem of tools and contributors needs more structured artifacts.

The repo needs machine-readable work intent, not only human-readable guidance.

### CI is good at validating code, but weaker at validating task state

The repository is already good at validating changed code paths and repository quality. That is a real strength.

But many of the painful failures happen before or between those checks:
- work never really started
- work silently stalled
- a PR was created too early
- handoff was premature
- a worker stopped without proving readiness

Those are not only code validation problems. They are task-state problems.

### Vendor-specific setup is useful, but should stay optional

It is reasonable for the repository to include setup help for specific tools. That can reduce friction for contributors who already use them.

But those should remain adapters, not the center of gravity.

The durable product surface of the contribution model should be:
- repository rules
- work packet format
- handoff semantics
- validation expectations
- local command entry points

Everything else should be optional.

## A path forward for the IDP contribution model

Here is the path I think the IDP project should take next.

### Step 1: Define a vendor-neutral work packet contract

The repo should introduce a small machine-readable work packet format.

Each packet should describe:
- objective
- parent issue
- allowed paths
- forbidden paths
- required checks
- required docs updates
- expected outputs
- stop conditions
- escalation conditions
- intended next handoff target

This would give humans and tools one shared unit of work.

A contributor could execute it manually.
Claude Code could use it.
Codex could use it.
Copilot could use it.
Continue, Aider, OpenHands, or local tools could use it.
A local model-driven helper could use it.
A maintainer could inspect it without reading a full issue thread again.

This is the first real building block for scalable choreography.

### Step 2: Add lease and heartbeat semantics

A work packet should not be "in progress" forever.

It should be leased.

That means:
- one active worker or role claims it
- the lease has a TTL
- the worker renews the lease while active
- an expired lease becomes observable
- stalled or abandoned work can be reassigned safely

This directly addresses silent failure and budget exhaustion.

If a vendor account hits a cap or a session crashes, the work should age into a visible state instead of vanishing into ambiguity.

### Step 3: Require completion evidence, not just a status update

A worker should not be considered done because it said so.

A worker should be considered ready for handoff only when it produces a completion artifact.

That artifact should include:
- task id
- changed files
- checks run
- docs touched or explicitly not needed
- known gaps
- blocked or not blocked
- confidence
- next recommended target
- whether human review is required now

This lowers the cost of review because the human is verifying evidence, not reconstructing the story from scratch.

### Step 4: Add pre-PR and pre-handoff guardrails

The repo should refuse early handoff when minimum conditions are not met.

Examples:
- no PR if there are zero commits
- no PR if the packet has no completion evidence
- no "done" state if required checks were not run
- no "ready for review" if required docs work is missing
- no automatic continuation if the packet was marked human-review-required

That makes the system more honest.

### Step 5: Add a local-first PR check watcher and repair loop

Instead of automating personal AI accounts to wait on PR checks, the project should provide a local utility contributors can run on their own machines.

That utility should:
- watch PR checks
- summarize failures
- produce a follow-up work packet
- optionally invoke a contributor-owned tool
- stop for human review when configured

This keeps the repo in control of the choreography while letting each contributor decide what worker they want to supply.

### Step 6: Add optional offline grunt-worker guidance

The project should explicitly support the idea that local models can be useful for low-cost contribution help.

Not as magical replacements for strong coding judgment.

As cheap helpers for grunt work.

This could include optional guidance for using local tooling such as:
- Ollama
- Aider
- Continue
- OpenHands
- other contributor-owned local workflows

The key is that the contribution model should not assume these tools.
It should make them easy to plug in.

## Recommended next steps for the project

These are the steps I would recommend next for the IDP repository.

### Recommended next steps

1. Define a vendor-neutral work packet contract
2. Add work packet lease and heartbeat semantics
3. Add completion evidence and handoff artifact requirements
4. Add pre-PR zero-work and premature-handoff guardrails
5. Add a local-first PR check watcher and follow-up work packet flow
6. Add optional guidance for offline grunt-worker usage by contributors
7. Add a small conformance corpus to test decomposition, handoff, and completion rules

These steps are intentionally modest.

They do not require a centralized orchestration platform first.
They do not require vendor-specific lock-in.
They do not require maintainer-owned AI accounts.
They do not exclude human-only contribution.

They strengthen the contribution model itself.

## Things to consider for the future

A few future directions are worth keeping in mind, but should remain future-facing for now.

### Role-based packet routing

Over time, the project could formalize roles such as:
- planner
- implementer
- validator
- reviewer
- integrator
- maintainer

That would make handoff clearer without coupling the project to specific agent products.

### Optional private maintainer control planes

Maintainers may still choose to run private infrastructure for observability, routing, or spend control.

That can be valuable.

But it should remain optional and outside the required public contribution path. The open-source contribution model should still stand on its own.

### Better repository-native evaluation

The project should eventually maintain a small corpus of:
- representative work packets
- good and bad handoff artifacts
- examples of false completion
- examples of scope drift
- examples of premature PR creation

That would make it easier to evaluate the contribution model itself, not only the resulting code.

### Broader tool adapters

The repo may eventually benefit from optional adapters for more editors and agent frameworks.

But adapters should stay thin.

The center of gravity should remain the repo-owned contribution contract.

## Closing thought

The challenge in front of the IDP project is not just how to let agents contribute.

It is how to make contribution itself more structured, observable, and composable so humans and many different workers can collaborate safely.

That is a more interesting problem than "which agent should we use?"

It is also more durable.

If the project gets this right, the result will not be a workflow that depends on one model, one editor, or one maintainer's subscriptions.

It will be a contribution model that makes better decisions faster, with clearer handoffs, smaller units of work, and stronger confidence in what "done" actually means.

That feels much more aligned with the broader goal of the IDP itself:
turning complexity into action without forcing everyone into the same tool or the same path.
