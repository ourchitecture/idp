---
slug: capability-channels
title: "Capability, Not Channel"
authors: [stemix_team]
tags:
  - platform-engineering
  - capability-design
  - ai
  - mcp
  - developer-experience
draft: false
date: 2026-04-01
description: "Design capabilities first, then express them through API, CLI, UI, and agent channels."
---

## Framing tension

Teams are building more interfaces than ever.

API.
CLI.
Web UI.
SDKs.
IDE extensions.
MCP servers.
Agent skills.
Sub-agents.

Each one feels necessary.

Each one solves a real problem.

And each one quietly duplicates the same capability in a slightly different way.

<!-- truncate -->

---

## Reality check

Most teams still design like this:

1. Build the API  
2. Add a UI on top  
3. Wrap it with a CLI  
4. Expose it to AI later  

This worked when interfaces were limited.

It breaks in an AI-driven world.

Because AI does not “use your API.”

It consumes capabilities through:

- tools
- skills
- goals
- delegated tasks

At the same time, humans are:

- clicking
- scripting
- browsing
- automating

The same capability now needs to exist across multiple modes of interaction.

Without structure, this leads to:

- duplicated logic
- inconsistent behavior
- fragmented metrics
- unclear ownership

---

## The shift

Stop designing interfaces first.

Start designing capabilities.

A capability is:

- a defined outcome  
- with a stable contract  
- that can be expressed through many interfaces  

The question is no longer:

> How do we expose this?

It becomes:

> What outcome exists, and how should different consumers access it?

---

## A simple model

Think in five layers.

### 1. Outcome

What useful result exists?

Examples:

- deploy a service
- analyze repository risk
- recommend next action
- diagnose a failing pipeline

This is the only layer that matters to the business.

---

### 2. Intent

What is the consumer trying to do?

Examples:

- “I want to deploy my service”
- “Why is this repo risky?”
- “Fix this pipeline failure”

Intent is shared across:

- humans
- systems
- agents

---

### 3. Capability contract

What stable contract fulfills that intent?

Define:

- inputs
- outputs
- side effects
- cost signals
- observability

This layer must not depend on:

- UI
- CLI
- MCP
- transport details

It is the source of reuse.

---

### 4. Interface adapters

How is the contract expressed?

Examples:

- API endpoint
- CLI command
- SDK method
- MCP tool
- agent skill

These are thin adapters.

If they are not thin, the contract is wrong.

---

### 5. Channel experiences

Where does it show up?

Examples:

- Backstage plugin
- website
- terminal
- IDE
- chat system
- SaaS platform

This is where experience differs.

The capability should not.

---

## Why this matters now

AI changes the dominant interface.

Before:

- humans called systems

Now:

- humans and agents both consume capabilities

Agents do not care about:

- your UI
- your CLI
- your documentation

They care about:

- clear contracts
- constrained inputs
- reliable outcomes

At the same time, leaders are learning a hard lesson:

Saving time is not the same as creating value.

Many AI initiatives show productivity gains without measurable outcomes.

The missing link is not the model.

It is the system design around it.

If your capabilities are fragmented across interfaces:

- you cannot measure outcomes consistently
- you cannot track real adoption
- you cannot understand cost vs value

---

## Designing for reuse

To improve reuse, enforce three rules.

### Rule 1: One capability, many expressions

Do not re-implement logic per interface.

Every interface calls the same core capability.

---

### Rule 2: Contracts before channels

Do not design the UI first.
Do not design the API first.

Define the contract.

Then adapt it.

---

### Rule 3: Segment by mode, not role

The same person operates in different modes:

- exploring in a UI  
- scripting in a CLI  
- automating through APIs  
- delegating to agents  

Design for modes:

- interactive  
- operational  
- automated  
- agent-driven  

Each mode prefers a different interface.

The capability stays the same.

---

## A practical example

Capability: Analyze repository risk

Outcome:
Identify blockers to delivery and recommend actions

Contract:

- input: repository, branch
- output: risk summary, recommendations, confidence

Expressions:

- API  
  POST /analyze-risk

- CLI  
  idp analyze risk

- MCP  
  tool: analyze_repository_risk

- UI  
  “Analyze” button with visual breakdown

- Agent  
  “Ensure this repo is safe to deploy”

Same capability.

Different entry points.

---

## Where most teams go wrong

They optimize for speed of interface delivery.

Instead of:

- speed of capability reuse

This leads to:

- APIs that do one thing  
- CLIs that do another  
- UIs that hide logic  
- agents that bypass the system entirely  

It feels fast.

It does not scale.

---

## What to do next

Start small.

Pick one capability.

Define:

1. Outcome  
2. Intent  
3. Contract  

Then expose it through:

- one human interface  
- one system interface  
- one agent interface  

Measure:

- who uses it  
- how often  
- what outcome it produces  

Only then expand.

---

## Closing

Interfaces will continue to multiply.

That is not the problem.

The problem is treating each one as a new system.

The opportunity is this:

Design capabilities once.
Express them everywhere.
Measure them consistently.

In the age of AI, the advantage will not come from having more interfaces.

It will come from having fewer, stronger capabilities behind them.
