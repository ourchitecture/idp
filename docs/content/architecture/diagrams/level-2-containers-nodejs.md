---
sidebar_position: 7
---

# Level 2: Implementer Containers (Node.js React + Fastify stack)

This view shows the deployable parts of the TypeScript/React reference stack
and the key request paths between browser, SPA host, and BFF.

## Audience

- Primary: IDP implementers and operators.
- Secondary: maintainers reviewing supported stack behavior.

## State

- Current: reflects the active Node.js React + Fastify reference stack.
- Target: aligns to user capability views as those capabilities expand.

```mermaid
C4Container
  title IDP Container View (Node.js React + Fastify REST)

  Person(developer, "Developer", "Uses the web portal and stack APIs")

  System_Boundary(idp, "Intent-Driven Portal") {
    Container(reactWeb, "Web App", "React + TypeScript + Vite", "Renders the portal UI and requests backend data")
    Container(nodeBff, "BFF Server", "Fastify + TypeScript", "Serves operational and portal summary REST endpoints")
    Container(contractTests, "Contract Test Harness", "TypeScript", "Runs profile-based checks for core, operational, and UI behavior")
  }

  Rel(developer, reactWeb, "Uses portal UI", "HTTPS")
  Rel(reactWeb, nodeBff, "Fetches API data", "HTTP/JSON")
  Rel(contractTests, reactWeb, "Validates UI profile behavior", "HTTP")
  Rel(contractTests, nodeBff, "Validates API profiles", "HTTP")
```

## Notes

- User-first Level 2 view lives at [Level 2: User Capability Containers](./level-2-user-capabilities).
- This stack declares `core`, `operational`, and `ui-profile` contract profiles.
- The BFF route set is implemented under `bff/src/routes/`.
