---
sidebar_position: 3
---

# Level 2: Containers (Go net/http stack)

This view shows the deployable parts of the default Go reference stack and how
traffic flows between user, web server, and BFF.

```mermaid
C4Container
  title IDP Container View (Go net/http REST)

  Person(developer, "Developer", "Uses the local portal UI and APIs")

  System_Boundary(idp, "Intent-Driven Portal") {
    Container(goWeb, "Web Server", "Go net/http", "Serves the web tier and static UI responses")
    Container(goBff, "BFF Server", "Go net/http", "Exposes REST endpoints for health, readiness, and portal data")
    Container(contractTests, "Contract Test Harness", "TypeScript", "Runs profile-based checks against web and BFF endpoints")
  }

  Rel(developer, goWeb, "Uses web UI", "HTTP")
  Rel(goWeb, goBff, "Calls backend endpoints", "HTTP/JSON")
  Rel(contractTests, goWeb, "Validates web contract", "HTTP")
  Rel(contractTests, goBff, "Validates API contract", "HTTP")
```

## Notes

- Default local host bindings are loopback (`127.0.0.1`) per ADR-0006.
- This stack declares `core` and `operational` contract profiles.
