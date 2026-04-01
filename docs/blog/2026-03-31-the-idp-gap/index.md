---
slug: the-idp-gap
title: "The IDP Gap: From Internal Developer Portal to Intelligent Development Portal"
authors: [stemix_team]
tags:
  - platform-engineering
  - developer-portal
  - ai
  - mcp
  - developer-experience
draft: false
date: 2026-03-31
---

<!-- markdownlint-disable MD041 -->

The Internal Developer Portal earned its place in modern engineering.

Platforms like Backstage, Port, Cortex, and OpsLevel helped teams bring order
to growing software estates. They gave developers a front door to tooling,
service metadata, and self-service workflows. That was real progress, and the
teams behind those platforms moved the discipline forward.

But software delivery is changing faster than the assumptions many IDPs were
built on.

AI is changing how work is initiated, how context is gathered, how actions are
taken, and who participates in the flow of delivery. That does not make the
Internal Developer Portal obsolete. It does create a gap between what many
portals were designed to do and what teams will increasingly need from them.

<!-- truncate -->

## The gap is not one thing

This is not just a UI problem. It is not just a chat problem. It is not just an
API problem.

It is a stack problem.

The next stage of platform experience will require teams to think differently
about interfaces, data models, APIs, collaboration, and system visibility. Many
current portals can evolve in that direction. Some will struggle. The point is
not to declare winners early. The point is to understand what is changing so
teams can evaluate their platform direction with clearer eyes.

## The web foundation is aging

Many Internal Developer Portals were built in the era when the single-page
application defined modern web architecture. At the time, that was a reasonable
foundation.

The bar has moved.

Modern users now expect real-time updates, fast transitions, flexible layouts,
and interfaces that adapt well across products and contexts. This is not about
chasing design trends. It is about the practical reality that every system
competes with the quality expectations created by other software people use all
day.

A portal built on an older UI foundation can still be useful. But older
foundations make deeper UX changes harder. Teams often end up choosing between a
costly rewrite and a slow migration while still trying to ship features. That
usually leads to incremental changes instead of rethinking the experience.

The issue is not that current portals look old. The issue is that older
foundations can limit what the platform can become.

## The AI gap is deeper than adding chat

The first wave of AI in developer platforms was predictable. Add a chat panel.
Add summarization. Add a generative layer over search.

Some of that is useful. But it does not yet change the operating model of the
platform.

An AI-aware platform needs more than an assistant bolted onto the side. It needs
to treat AI as a participant in the workflow. That means the platform should be
able to support things like:

- structured platform knowledge that can be reasoned over, not just searched
- intent expressed in natural language and resolved into platform actions
- proactive recommendations and signals based on context, not just user clicks

Most IDPs were not designed around those assumptions. Their models and
interaction patterns largely assume a human user who knows what they need and
where to click.

That is still useful. It is just no longer enough on its own.

## The API gap is growing

Many IDP APIs were designed for browser clients. That made sense. Payloads were
shaped for screens. Authentication assumed an interactive user session. Request
patterns assumed a person moving through pages and forms.

AI agents need something different.

The Model Context Protocol, or MCP, is one emerging direction for tool-oriented
AI interaction. Whether MCP becomes dominant or not, the broader shift is clear:
platforms increasingly need machine-usable interfaces alongside human-oriented
ones.

That creates tension:

- UI APIs are often shaped for rendering
- agent-facing tools need clearer schemas and safer capability boundaries
- human sessions are interactive and short
- agent interactions may be delegated, parallel, or long-running

This is not a minor extension to existing APIs. It raises design questions about
identity, authorization, context handling, and action boundaries.

Teams do not need all the answers yet. But they do need to start evaluating
whether their platform direction can support both human interfaces and machine
actors without forcing one model to awkwardly imitate the other.

## The portal metaphor is under pressure

The portal, catalog, and dashboard model assumes a user who browses, searches,
and clicks toward an answer.

That works well when the user knows what they are looking for.

A growing share of software delivery does not start that way.

An engineer investigating a production issue may not know which service,
dependency, runbook, owner, or recent change matters yet. A product leader
trying to understand delivery risk may not think in terms of catalog entities. A
security or compliance stakeholder may care about exposure and readiness, not
service page navigation.

For this kind of work, intent is a better starting point than location.

That is why conversational and intent-driven interfaces matter. Not because chat
is fashionable, but because some work begins with uncertainty. The user has a
question, not a path.

Current portals often provide limited support here. They may answer questions
about documentation. Fewer can answer questions grounded in the actual state of
the environment, recent changes, cross-team dependencies, or role-specific
context.

That is the real interface gap.

## Agentic work needs first-class visibility

The most important shift ahead may not be AI-assisted coding. It may be AI
systems performing meaningful work inside the delivery lifecycle.

That includes things like reviewing changes, opening pull requests, drafting
migrations, running operational tasks, creating tickets, or coordinating work
across systems with humans still in the loop for review and control.

Many current IDPs have no strong native model for this.

Where does a team see agent work in progress? How do they tell what an agent has
done, what it is waiting on, what approvals are needed, or what scope it was
allowed to act within? How is accountability represented when the actor is not a
person but also not a black box?

These are platform questions, not just feature requests.

A portal that cannot represent agent identity, delegated capability, task
history, and human approval points may become less central as agentic workflows
grow around it.

## The hardest gap is shared context

Even that is not the deepest issue.

The deeper problem is that software delivery is not only for developers, but the
Internal Developer Portal has largely been shaped around the developer as the
main user.

That leaves other stakeholders partially served.

Architects care about patterns and drift. Security teams care about exposure and
control coverage. Product leaders care about dependency risk and delivery
confidence. Compliance teams care about traceability. Executives care about
outcomes, bottlenecks, and strategic risk.

These are not separate realities. They are different views of the same systems.

Most organizations still spread those views across disconnected tools. Product
plans live in one place. architecture notes live in another. operational state
lives somewhere else. compliance evidence gets exported into documents or
spreadsheets. The result is not just inconvenience. It is decision friction.

People are forced to assemble their own picture of reality from fragments.

That is where the gap becomes operational. The issue is not that current portals
do not contain enough information. It is that they often do not turn enough of
that information into shared, role-aware context that helps people decide what
to do next.

## From Internal Developer Portal to Intelligent Development Portal

This is where the Intelligent Development Portal idea begins.

Not as a replacement announcement. Not as a demand to throw out today's portal.
And not as a claim that one product has solved the next era already.

The idea is simpler than that.

The Internal Developer Portal helped centralize access to engineering systems.
The Intelligent Development Portal is a direction for what comes next: a platform
surface that helps people and systems interpret context, make better decisions,
and act with clearer boundaries.

At a high level, that means moving toward a platform that can:

- model services, teams, policies, state, and intent in ways both people and
  machines can use
- support role-aware experiences without forcing every stakeholder to think like
  a platform engineer
- combine structured navigation with conversational and intent-driven access
- make agent work visible, governable, and reviewable
- connect fragmented delivery signals into clearer operational perspective

That is the shift.

Not from portal to chatbot.
From portal to decision support.

## What to do now

Most teams should not rush to replace the portal they have.

But they should start asking better questions about where their platform
direction is heading.

Questions like:

- Can our platform knowledge support both human use and machine use?
- Can non-developer stakeholders get relevant context without learning the whole
  portal model?
- Can we represent agent actions, approvals, and boundaries clearly?
- Are we improving access to information, or improving decisions?
- Will our current architecture let us evolve as these needs become normal?

Those questions matter now, even if the answers are still forming.

## Why Stemix exists

Stemix exists to explore that gap in the open.

It is not production-ready. It is not positioned here as a system teams should
adopt today. And it is not a finished answer.

It is an early open project working toward a clearer specification and reference
direction for what an Intelligent Development Portal could become.

For now, the right action is simple: watch the project, follow the ideas as they
mature, and use them as a lens for evaluating your current platform direction.

The Internal Developer Portal helped teams organize access.

The next stage will need to do more than organize. It will need to help people
and systems understand what is happening, why it matters, and what should happen
next.

---

_Stemix is an open project exploring the Intelligent Development Portal in the
open at
[github.com/ourchitecture/idp](https://github.com/ourchitecture/idp)._
