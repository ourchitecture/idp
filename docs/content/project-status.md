---
sidebar_position: 2
---

# Project Status

:::caution Early Alpha — Not Production Ready
Stemix is an **early alpha, pre-production research project**. It is not a
product teams should adopt today. It is an open project exploring what an
Intelligent Development Portal can be — and contributions are welcome.
:::

## What is Stemix right now?

Stemix is a working research platform that proves out an intent-driven
architecture for developer portals. The scaffolding is real, the contracts are
tested, and the reference stacks run in containers today. What isn't here yet
is production hardening, a plug-in ecosystem, and cloud deployment support —
that's the exciting work ahead.

## What's Working Today

These capabilities are implemented and usable right now:

| Capability | Details |
| --- | --- |
| Intent-driven architecture | Gherkin Layer 1 intent specs → Layer 2 contract tests → Layer 3 implementations |
| Two reference stacks | Go (`net/http`) and Node.js (React + Fastify) |
| Container-first delivery | Multi-stage Dockerfiles, distroless base images, published to GHCR |
| IETF-conformant health endpoints | `/health` and `/ready` endpoints per IETF draft spec |
| Contract test harness | 4 profiles: `core`, `operational`, `ui-profile`, `mcp-profile` |
| MCP server | Tools: `get_portal_summary`, `check_health`, flow insights (`list_flow_insights`, `get_flow_insight`, `list_my_blockers`, `list_service_risk_signals`) |
| Privacy and secret scanning | `gitleaks` + `semgrep` via `make check-privacy` |
| Documentation site | Docusaurus site at [stemix.dev](https://stemix.dev) |

## In Progress / Roadmap

These are design goals and planned work — not yet implemented:

- **Flow insight canonical model and signal catalog** — provider-neutral semantics for cross-provider adapters and inference. Docs and Layer 1 intent are in progress; adapters, harnesses, and UIs will follow.
- **Security hardening** — TLS, authentication, and authorization/RBAC are
  design goals. No auth layer exists yet.
- **Plug-in SDK and extension architecture** — The `/plugins/` directory is not
  yet present. Extension contracts are in design.
- **Multi-tenant isolation and SaaS deployment** — Tenant isolation and a SaaS
  model are target architecture goals, not yet implemented.
- **Kubernetes manifests and Helm charts** — The `/deploy/` directory is not
  yet present.
- **Full AI integration** — Beyond MCP scaffolding, deeper AI capabilities are
  in design.
- **Production observability** — Metrics and distributed tracing are not yet
  present.

:::tip This roadmap is open work
Every item above is an opportunity to contribute. If one of these areas
interests you, open an issue and start the conversation.
:::

## How to Get Involved

This is an open-source project and external contributions are welcome.

- **Browse the code**: [github.com/ourchitecture/idp](https://github.com/ourchitecture/idp)
- **Find work**: Browse [open issues](https://github.com/ourchitecture/idp/issues)
  to find something to pick up.
- **Understand the workflow**: Read `AGENTS.md` and `CONTRIBUTING.md` for the
  issue-driven contribution process.
- **Open a PR**: Fork the repo, work off an issue, and submit a pull request.
  All contributors are listed and credited.

The project is early enough that your contribution can shape the architecture,
not just fill in gaps. That's a rare opportunity.
