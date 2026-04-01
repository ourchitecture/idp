---
sidebar_position: 5
---

# Level 3: Component View (Node.js BFF)

This view explains how the Node.js BFF is structured internally so implementers
can quickly identify where behavior is configured and where routes are handled.

```mermaid
C4Component
  title IDP Node.js BFF Component View

  Container_Boundary(nodeBff, "Node.js Fastify BFF") {
    Component(serverEntry, "Server Entry", "server.ts", "Starts Fastify, resolves host/port, handles graceful shutdown")
    Component(appFactory, "App Factory", "app.ts", "Creates Fastify app, registers middleware and route plugins")
    Component(configResolver, "Config Resolver", "config.ts", "Resolves host/port from environment with defaults")
    Component(corsMiddleware, "CORS Middleware", "@fastify/cors", "Configures cross-origin request handling")
    Component(rootRoutes, "Root Routes", "routes/root.ts", "Implements root status endpoint")
    Component(healthRoutes, "Health Routes", "routes/health.ts", "Implements health endpoint with typed schema")
    Component(readinessRoutes, "Readiness Routes", "routes/readiness.ts", "Implements readiness endpoint")
    Component(summaryRoutes, "Portal Summary Routes", "routes/portal-summary.ts", "Implements portal summary and service metrics endpoint")
  }

  Rel(serverEntry, appFactory, "Creates app instance")
  Rel(serverEntry, configResolver, "Reads bind configuration")
  Rel(appFactory, corsMiddleware, "Registers")
  Rel(appFactory, rootRoutes, "Registers")
  Rel(appFactory, healthRoutes, "Registers")
  Rel(appFactory, readinessRoutes, "Registers")
  Rel(appFactory, summaryRoutes, "Registers")
```

## Notes

- Route handlers currently expose root, health, readiness, and summary APIs.
- Zod is used in route modules that return structured operational payloads.
