---
status: proposed
date: 2026-04-01
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# IETF Health Endpoint Contract

## Context and Problem Statement

Every IDP-hosted service (web and BFF) needs a machine-readable health endpoint
for container orchestration, monitoring, and contract testing. The current
implementation uses ad hoc paths (`/api/health`, `/api/readiness`) with
project-specific response shapes (`"ok"`, `"degraded"`, `"service"` field) that
do not align with any published standard and differ from common framework
conventions (Spring Boot `/actuator/health`, ASP.NET `/health`, Kubernetes
`/healthz`).

How should IDP standardize the health check contract so that every
implementation — regardless of language, framework, or hosting model — can be
tested, monitored, and orchestrated identically?

### Gate Assessment

<!-- ADR intake threshold per AGENTS.md -->

- **Cross-cutting scope** — all stacks (Go, Node.js, future), contract tests,
  CI pipelines, container HEALTHCHECK instructions, and monitoring are affected.
- **Costly to reverse** — once health endpoint paths and response shapes are
  published and consumed by orchestrators, load balancers, and external monitors,
  changing them requires coordinated migration across every stack and every
  deployment.
- **Contract surface** — the health endpoint defines the HTTP interface contract
  that all implementations must satisfy and that the contract test harness
  validates.
- **Multi-quarter longevity** — health check endpoints are foundational
  infrastructure that should remain stable for the lifetime of the project.
- **Drift risk** — without a recorded standard, new stacks may implement health
  checks with different paths, shapes, or status semantics, breaking uniform
  orchestration and monitoring.

All five gates are true. Two are hard gates (costly to reverse, contract
surface). The intake threshold is met.

## Decision Drivers

- Health checks must be implementation-agnostic so any IDP stack can be tested
  and monitored with the same tools and expectations
- The contract must align with a published standard rather than inventing a
  proprietary response shape
- Paths must avoid collision with framework-specific health endpoints that stacks
  may also expose (e.g., Spring Boot `/actuator/health`, Kubernetes `/healthz`)
- Health is an infrastructure concern and should not be namespaced under the
  business API prefix (`/api/`)
- Both web servers and BFF servers must be observable — health is not a
  BFF-only concern
- Liveness and readiness are distinct operational concerns that should not be
  conflated

## Considered Options

- Keep the current ad hoc `/api/health` contract
- Adopt IETF `draft-inadarei-api-health-check-06` as the health response
  standard at `/health`
- Implement Kubernetes-native probes only (status code, no body contract)

## Decision Outcome

Chosen option: "Adopt IETF `draft-inadarei-api-health-check-06` as the health
response standard at `/health`", because it provides a well-defined,
technology-neutral response schema with an explicit media type, maps cleanly to
Kubernetes probes, and avoids collision with framework-specific health paths.

### Health Endpoint — `GET /health`

All IDP-hosted services (web and BFF) must expose `GET /health`.

#### Response headers

| Header | Value |
| --- | --- |
| `Content-Type` | `application/health+json` |

#### Required response fields

| Field | Type | Description |
| --- | --- | --- |
| `status` | string enum | `"pass"`, `"fail"`, or `"warn"` |
| `serviceId` | string | Canonical service identifier (e.g., `"idp-web"`, `"idp-bff"`) |
| `description` | string | Human-readable service description (e.g., `"IDP Web Server"`, `"IDP BFF Server"`) |

#### Optional response fields (BFF and services with sub-components)

| Field | Type | Description |
| --- | --- | --- |
| `checks` | object | Sub-component health details per the IETF draft `checks` schema |

Each key in `checks` uses the `componentName:measurementName` format defined by
the draft. Each value is an array of check objects containing at minimum:

| Field | Type | Description |
| --- | --- | --- |
| `componentType` | string | `"system"`, `"component"`, or `"datastore"` |
| `status` | string enum | `"pass"`, `"fail"`, or `"warn"` |
| `time` | string | ISO-8601 timestamp of the observation |

Additional user-defined keys are permitted per the IETF draft.

#### HTTP status codes

| Condition | HTTP Status |
| --- | --- |
| `status` is `"pass"` or `"warn"` | `200 OK` |
| `status` is `"fail"` | `503 Service Unavailable` |

#### Minimal web server example

```json
{
  "status": "pass",
  "serviceId": "idp-web",
  "description": "IDP Web Server"
}
```

#### BFF server example with checks

```json
{
  "status": "pass",
  "serviceId": "idp-bff",
  "description": "IDP BFF Server",
  "checks": {
    "bff:responseTime": [
      {
        "componentType": "system",
        "status": "pass",
        "time": "2026-04-01T12:00:00Z"
      }
    ],
    "routing:availability": [
      {
        "componentType": "component",
        "status": "pass",
        "time": "2026-04-01T12:00:00Z"
      }
    ]
  }
}
```

### Readiness Endpoint — `GET /readiness`

BFF servers must expose `GET /readiness`. Web servers may omit readiness if they
have no sub-component dependencies.

The readiness endpoint uses the same `application/health+json` media type and
the same response schema as the health endpoint but carries
readiness-specific check semantics (is the service ready to accept traffic, as
distinct from is the process alive).

#### Required response fields

| Field | Type | Description |
| --- | --- | --- |
| `status` | string enum | `"pass"` or `"fail"` (readiness is binary; `"warn"` is not used) |
| `checks` | object | Sub-component readiness checks in the same IETF `checks` format |

#### HTTP status codes

| Condition | HTTP Status |
| --- | --- |
| `status` is `"pass"` | `200 OK` |
| `status` is `"fail"` | `503 Service Unavailable` |

### Status Value Mapping

The IETF draft defines canonical values and recognized aliases:

| IETF canonical | Recognized aliases | Prior IDP value |
| --- | --- | --- |
| `"pass"` | `"ok"` (Node Terminus), `"up"` (Spring Boot) | `"ok"` |
| `"fail"` | `"error"` (Node Terminus), `"down"` (Spring Boot) | (none) |
| `"warn"` | (none) | `"degraded"` |

IDP implementations must use the canonical IETF values (`"pass"`, `"fail"`,
`"warn"`), not aliases.

### Path Migration

| Concern | Previous path | New path |
| --- | --- | --- |
| Health | `/api/health` | `/health` |
| Readiness | `/api/readiness` | `/readiness` |
| Web server health | (none) | `/health` |

This is a breaking change to the BFF HTTP contract. It is acceptable because the
project is pre-1.0 alpha and there are no external consumers.

### Container HEALTHCHECK

Dockerfiles for all services should include a `HEALTHCHECK` instruction that
targets the `/health` endpoint. See ADR-0010 for Dockerfile pattern details.

### Consequences

- Good, because all IDP services share a single, standards-aligned health
  response contract that any monitoring tool, orchestrator, or load balancer can
  consume without custom configuration
- Good, because the `application/health+json` media type enables content
  negotiation and signals the response schema to consumers
- Good, because web servers become observable through the same mechanism as
  BFF servers
- Good, because the `/health` path avoids the `/api/` business namespace and
  does not collide with common framework-specific health paths
- Good, because the explicit `checks` schema replaces the ad hoc readiness
  response with a structured, extensible format
- Bad, because the IETF draft is expired (October 2021) and may never advance to
  RFC status; however, it remains the most widely referenced HTTP health check
  specification and its schema is stable
- Bad, because the path migration is a breaking change to the BFF contract,
  requiring updates to all stacks, tests, CI pipelines, and documentation in a
  single coordinated change
- Neutral, because Kubernetes probes only inspect HTTP status codes, not response
  bodies; the IETF response body is additive value for non-Kubernetes consumers

### Confirmation

- Gherkin intent specs (`tests/features/core.feature`,
  `tests/features/operational.feature`) are updated to specify the new paths and
  response shape
- Contract test profiles (`tests/src/profiles/core.ts`,
  `tests/src/profiles/operational.ts`) validate the IETF-aligned response
- All stack implementations pass the updated contract test suite
- CI smoke tests and e2e scripts target the new `/health` and `/readiness` paths
- Dockerfiles include `HEALTHCHECK` instructions targeting `/health`
- Documentation (contract harness, profile docs, architecture diagrams) reflects
  the new contract

## Pros and Cons of the Options

### Keep the current ad hoc `/api/health` contract

- Good, because no migration effort required
- Bad, because the response shape is proprietary and not recognized by standard
  tooling
- Bad, because `"degraded"` is not a recognized health status in any standard
- Bad, because the `/api/` prefix conflates infrastructure health with business
  API routing
- Bad, because web servers have no health endpoint at all

### Adopt IETF `draft-inadarei-api-health-check-06` at `/health`

- Good, because the most widely referenced HTTP health check specification with
  a registered media type
- Good, because the `checks` object provides structured, extensible
  sub-component health reporting
- Good, because status values (`pass`, `fail`, `warn`) are unambiguous and the
  spec defines aliases for common framework conventions
- Good, because `/health` is a clean, top-level infrastructure path
- Neutral, because the draft is expired but stable and widely adopted in practice
- Bad, because requires a coordinated migration of all existing health endpoints

### Implement Kubernetes-native probes only

- Good, because simplest possible implementation (any 2xx = healthy)
- Good, because directly maps to Kubernetes liveness/readiness/startup probes
- Bad, because provides no response body contract for non-Kubernetes consumers
  (monitoring dashboards, contract tests, load balancers)
- Bad, because sub-component health detail is lost
- Bad, because different stacks may return arbitrary or no response bodies,
  making uniform contract testing impossible

## More Information

### References

- [IETF draft-inadarei-api-health-check-06](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06)
  — Health Check Response Format for HTTP APIs (expired October 2021)
- [MicroProfile Health 4.0](https://download.eclipse.org/microprofile/microprofile-health-4.0/microprofile-health-spec-4.0.html)
  — Java-specific health check specification
- [Kubernetes Probe Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
  — Liveness, readiness, and startup probes

### Related Decisions

- [0001](0001-intent-driven-architecture.md) — Layered intent/contract/implementation
  architecture (this decision spans all three layers)
- [0003](0003-contract-harness-and-runtime-port-contract.md) — Contract harness
  mechanics and runtime port defaults
- [0005](0005-shared-capability-contract-and-conformance-profiles.md) — Profile-based
  conformance model (health spans core and operational profiles)
- [0009](0009-intent-specification-format.md) — Gherkin as the Layer 1 intent
  specification format (health intent is specified in `.feature` files)
- [0010](0010-container-build-strategy.md) — Container build strategy
  (HEALTHCHECK instructions reference this contract)
