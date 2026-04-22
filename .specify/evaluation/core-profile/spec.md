# Spec: Core HTTP Contract Profile

> **Evaluation artifact — Axis C.** This file demonstrates what the
> `core` conformance profile would look like if authored using
> spec-kit's `spec.md` format. The authoritative Layer 1 source
> remains `tests/features/core.feature`. Do not use this file as a
> specification for implementation.

## Overview

Every reference implementation must expose a minimal HTTP surface that
is reachable and returns correctly shaped responses. This profile
defines the lowest layer of the conformance pyramid; all stacks are
required to satisfy it.

## Functional Requirements

### FR-01: Web server root reachability

The web server must respond to `GET /` with a 2xx HTTP status code.

- **Endpoint**: `GET /` on the web server
- **Success condition**: HTTP response status in the range 200–299
- **No constraints** on response body or content-type for this endpoint

### FR-02: Web server health endpoint

The web server must expose a health endpoint at `/health` that returns
a well-formed health check document.

- **Endpoint**: `GET /health` on the web server
- **Success conditions**:
  - HTTP response status in the range 200–299
  - `Content-Type` header contains `application/health+json`
  - Response body is a valid JSON object
  - JSON object contains a field named `status`
  - JSON object contains a field named `serviceId`
  - JSON object contains a field named `description`

### FR-03: BFF root status envelope

The BFF server must respond to `GET /` with a JSON status envelope.

- **Endpoint**: `GET /` on the BFF server
- **Success conditions**:
  - HTTP response status in the range 200–299
  - `Content-Type` header contains `application/json`
  - Response body is a valid JSON object
  - JSON object contains a field named `status` of type string
  - JSON object contains a field named `service` of type string

### FR-04: BFF server health endpoint

The BFF server must expose a health endpoint at `/health` that returns
a well-formed health check document.

- **Endpoint**: `GET /health` on the BFF server
- **Success conditions**:
  - HTTP response status in the range 200–299
  - `Content-Type` header contains `application/health+json`
  - Response body is a valid JSON object
  - JSON object contains a field named `status`
  - JSON object contains a field named `serviceId`
  - JSON object contains a field named `description`

### FR-05: BFF readiness endpoint

The BFF server must expose a readiness endpoint at `/readiness` that
returns a well-formed readiness document.

- **Endpoint**: `GET /readiness` on the BFF server
- **Success conditions**:
  - HTTP response status in the range 200–299
  - `Content-Type` header contains `application/health+json`
  - Response body is a valid JSON object
  - JSON object contains a field named `status`
  - JSON object contains a field named `checks`

## Configuration

- Web server URL: resolved from environment variable `IDP_WEB_URL`
- BFF server URL: resolved from environment variable `IDP_BFF_URL`

## Out of Scope

This spec does not define:

- Exact values of `status`, `serviceId`, `description`, or `checks`
  fields — value constraints are defined by ADR-0011.
- Authentication or authorization behavior.
- Error response shapes for non-2xx responses.
- Stack-specific implementation details.

## Traceability

| Requirement | Source scenario in core.feature |
| --- | --- |
| FR-01 | `Web server responds to GET /` |
| FR-02 | `Web server health endpoint returns the expected shape` |
| FR-03 | `BFF root returns a JSON status envelope` |
| FR-04 | `BFF health endpoint returns the expected shape` |
| FR-05 | `BFF readiness endpoint returns the expected shape` |

---

## Evaluation Notes (Axis C)

The traceability table above shows that a mechanical 1:1 mapping
from `core.feature` scenarios to spec-kit `spec.md` FRs is possible
for this profile. However, the mapping surfaces a critical difference:

**What is preserved**: the field-name and content-type constraints are
representable as prose requirements in `spec.md`.

**What is lost**:

1. **Executable step semantics.** Gherkin steps (`Given`, `When`,
   `Then`) map directly to Layer 2 TypeScript assertions in
   `tests/src/profiles/core.ts`. A spec-kit `spec.md` has no
   step-definition mapping; a code generator or custom harness would
   be required to re-derive Layer 2 from this spec.

2. **"Feature file wins" tiebreaker.** ADR-0009 designates
   `.feature` files as the authoritative source when the spec and
   harness disagree. spec-kit has no equivalent tiebreaker mechanism.

3. **Profile-gating support.** Gherkin profiles use tags and
   `Background` sections with env-var URL injection (`IDP_WEB_URL`,
   `IDP_BFF_URL`). spec-kit `spec.md` can document the env vars but
   cannot express the conditional `Background` execution semantics
   that drive the cross-stack conformance model.

4. **Exact-value constraints.** For profiles beyond `core` (e.g.
   `status-profile.feature`), step assertions include exact enum
   values (`pass`, `fail`, `warn`). Prose in `spec.md` can state
   these values but cannot enforce them without a custom parser.
