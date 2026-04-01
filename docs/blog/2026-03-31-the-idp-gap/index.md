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
draft: true
date: 2026-03-31
---

<!-- markdownlint-disable MD041 -->

The Internal Developer Portal has earned its place in the modern engineering
platform stack. Over the past several years, platforms like Backstage, Port,
Cortex, and OpsLevel have helped organizations bring order to sprawling service
catalogs, surface software health at a glance, and give developers a
self-service front door to infrastructure and tooling. That is real, meaningful
progress — and the engineering teams behind those platforms deserve credit for
advancing the discipline.

But the pace of change in software engineering — particularly the shift toward
AI-native development workflows — is now outrunning the architectural
assumptions that most IDPs were built on. The gap is widening, and it shows up
across nearly every layer of the platform.

<!-- truncate -->

## The Web Technology Foundation

Internal Developer Portals arrived alongside the rise of the single-page
application. React, Angular, and Vue.js were the modern web, and a portal built
on one of them was, by definition, a modern portal. That moment has passed.

Today's web platform is meaningfully different: component streaming, edge
rendering, fine-grained reactivity, design systems that span multiple products
and teams. More importantly, the bar for _what a web interface needs to do_ has
risen. Modern users expect real-time updates, optimistic UI, seamless
transitions, and personalized layouts — not because expectations are
unreasonable, but because every other surface they use every day now delivers
this.

Most IDPs are carrying 3–5 year old UI foundations. Modernizing them means
either a disruptive rewrite or a slow, painful incremental migration. Neither
is easy to pursue while simultaneously shipping features. The result is that UX
innovation in the IDP space has been cautious and incremental — a redesigned
sidebar or a fresh color palette, rather than a rethought interaction model.

## The AI Capabilities Gap

The first wave of AI integration in developer tooling followed a predictable
pattern: add a chat widget, surface an LLM behind a search box, wrap a
generative model around documentation search. These additions have genuine
utility. But they are additive in the same way that adding a GPS to a
horse-drawn carriage is useful — the fundamental transport model has not
changed.

An AI-first platform is designed differently at its core. It treats AI not as
a feature to be added, but as a first-class participant in every workflow. That
means:

- Platform knowledge is structured so AI agents can reason over it, not just
  search it.
- User intent can be expressed in natural language and resolved to platform
  actions without navigating menus.
- Recommendations, alerts, and insights are generated proactively — the
  platform finds the engineer, not the other way around.

Most IDPs were not designed this way. Their data models, plugin APIs, and
interaction patterns all assume a human who knows what they are looking for and
knows where to find it. Retrofitting an AI-first experience onto that
foundation is possible, but it requires rethinking what the platform's job is —
not just reconfiguring it.

## The API Gap: Designed for Humans, Not Intelligence

The REST and GraphQL APIs that IDPs expose were designed for one consumer: a
human-driven browser client. Request/response cycles are short. Payloads are
shaped for UI rendering. Authentication flows assume interactive sessions. This
works well for dashboards. It works poorly for AI agents.

The **Model Context Protocol (MCP)** is an emerging standard that defines how
AI systems discover, invoke, and compose platform tools. It represents a
fundamentally different API surface — one built for tool use, context
accumulation, and non-linear traversal. An MCP-native platform API looks and
behaves nothing like a REST API optimized for a React frontend.

Today's IDP APIs need to speak both languages. The challenge is that the
requirements pull in different directions:

- REST APIs optimize for human-scale payloads; MCP tool definitions optimize
  for machine-interpretable schemas.
- Human sessions are stateful and short; agent sessions are often stateless,
  long-running, or parallel.
- Human authentication flows assume a browser; agent authentication requires
  non-interactive credential delegation and scoped capability grants.

Building an API surface that serves both human interfaces and AI agents well —
without compromise in either direction — is an unsolved design problem for most
platforms in this space.

## The Conversational Interface Gap

The interface metaphor that defined the IDP — the portal, the catalog, the
dashboard — assumes a user who browses, searches, and clicks a path to their
destination. This is the document-and-form web, and it remains genuinely useful
for structured workflows where the user knows what they need.

But a growing share of development work is exploratory and cross-cutting. An
engineer investigating a production incident does not know in advance which
service, dependency, runbook, or team they will need. A platform engineering
lead reviewing architecture health does not start from a single catalog entry.
A product manager assessing delivery risk does not speak the vocabulary of
service graphs.

For these users, a conversational interface — one that accepts intent as a
question and returns relevant context, actions, and next steps — is
dramatically more useful than a portal. Not as a replacement for structured
navigation, but as a complement to it: a way to start from intent rather than
from knowledge of where things live.

Today's IDPs have invested little in this direction. The chat interfaces that
do exist are largely disconnected from platform state — they answer questions
about documentation rather than questions about your specific environment, your
team's services, or what changed last week. The context that makes a
conversational interface genuinely useful — organizational, environmental, and
historical — is not yet a first-class concept in these platforms.

## The Agentic Visibility Gap

The shift that will matter most in the next several years is not AI-assisted
code completion. It is AI agents performing work autonomously within the
software development lifecycle: running pipelines, drafting change proposals,
executing migrations, reviewing code, creating tickets, and deploying services.
This is already happening — not as a future prospect but as a present reality
at the leading edge.

Today's IDP has no native model for this. There is no concept of an "agent
workstream" — no place to see what agents are running, what they have
completed, where they are blocked, or what human approvals are waiting. There
is no audit trail built for non-human actors. There is no access control model
that accounts for the difference between a developer asking a question and an
AI agent with the ability to push code to production.

This is not a small feature gap. It requires new concepts at the platform
level: agent identity, task lifecycle, outcome accountability, and escalation
paths to human review. Platforms that do not develop these concepts will not be
able to safely or usefully participate in agentic workflows — and the
development teams using them will route around the portal entirely.

## The Collaboration Gap

If all of the above were the full extent of the problem, the path forward would
be clear enough: modernize the tech stack, add MCP support, build a chat
interface, model agent workflows. Hard, but scoped.

The deeper challenge is collaborative context across stakeholders.

Software delivery has never been solely a developer activity, but the IDP was
largely built for developers. Product managers, architects, security engineers,
compliance officers, SRE teams, operations leads, and organizational leadership
all have legitimate roles in the software delivery process — different views on
different concerns, but ultimately operating on the same systems and the same
risks.

Today's portals offer very little for this broader group. They might surface a
health dashboard that a manager can glance at, or a catalog that a security
team can audit. But there is no shared, role-aware surface that gives every
stakeholder a relevant view of the work they care about — connected to the same
underlying data, with appropriate permissions and appropriate context, without
requiring every stakeholder to become a developer-portal expert.

The result is fragmentation familiar to anyone who has worked across a large
engineering organization. Product roadmaps live in one tool. Architectural
decisions live in wikis. Deployment state lives in the platform tool. Compliance
evidence lives in spreadsheets. Incident data lives in the on-call tool. Each
team builds a fragmented picture of what is happening, and the gaps between
those pictures are where surprises — and risk — accumulate.

This is not a failure of any particular tool. It is a consequence of building
tools for a single audience in a multi-stakeholder process.

## The Path Forward: Intelligent Development Portal

The answer is not to bolt more features onto existing portals, and it is not to
dismiss the platforms that got us this far. The answer is to articulate clearly
what the next generation of developer platform needs to be — and to define it
in a way that any implementation can achieve.

That is the premise behind **Stemix** and the concept of the
**Intelligent Development Portal**.

Rather than prescribing a specific technology stack, framework, or vendor, the
Intelligent Development Portal is defined as a _specification_: a set of
capabilities, contracts, and conformance profiles that any implementation —
built on any tech stack, deployed in any environment — can satisfy. The
specification defines:

- **What the platform must know** — a common model for services, teams,
  policies, intent, and state, structured for both human navigation and machine
  reasoning.
- **How it must be queryable** — both by humans through rich interfaces and by
  AI agents through MCP-native tool APIs, without compromise in either
  direction.
- **What interactions it must support** — structured navigation, conversational
  access, and full participation in agentic development workflows.
- **Who it serves** — role-aware views and shared surfaces that give every
  stakeholder relevant context without requiring portal expertise.
- **What it must make visible** — agent workstreams, intent-to-implementation
  traceability, and cross-team delivery health in a single coherent model.

This is not a product announcement. It is a design direction — and one that we
believe is necessary to keep the developer platform relevant as the practice of
software engineering transforms around it.

The IDP of 2018 did its job well. The IDP of 2026 needs to do something
different — and the teams building on top of these platforms deserve a
clear-eyed articulation of what that something is.

---

_Stemix is an open, standards-based Intelligent Development System currently in
early alpha. The specification and reference implementations are developed in
the open at
[github.com/ourchitecture/idp](https://github.com/ourchitecture/idp)._
