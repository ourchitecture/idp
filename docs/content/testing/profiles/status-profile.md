---
sidebar_position: 4
---

# Status Profile

The `status-profile` proves that a stack exposes the shared API-first IDP
status contract. It exists so the home page summary, dedicated status view, MCP
adapter, and static status publisher can all depend on one validated source of
truth instead of inventing separate status payloads.

## Why it exists

The status MVP is intentionally narrow: it reports the status of IDP-owned
components only. Plug-in and third-party system status are postponed until the
repo has a concrete plug-in architecture and adapter contract. This profile
keeps the first slice honest and testable.

## Layer 1 spec

Source: [`tests/features/status-profile.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/status-profile.feature)

## Scenarios (3 total)

### BFF portal summary returns the expected shape

**Precondition:** The BFF server is running and the stack declares
`capabilities.status.enabled = true`.

**Assertions:**

- `GET /api/portal/summary` returns an HTTP status code in the 2xx range
- `Content-Type` contains `application/json`
- Response body contains `generatedAt`, `status`, `metrics`, `freshness`, and
  a non-empty `components` array
- Each component entry contains `id`, `label`, `kind`, `status`, `latencyMs`,
  and `observedAt`

### Portal summary metrics are internally consistent

**Precondition:** The BFF server is running and the stack declares
`capabilities.status.enabled = true`.

**Assertions:**

- `metrics.totalComponents` equals the number of components
- `metrics.healthyComponents` equals the number of healthy components
- `metrics.degradedComponents` equals the number of degraded components
- Top-level `status` matches the aggregate component state

### Portal summary timestamps and freshness are valid

**Precondition:** The BFF server is running and the stack declares
`capabilities.status.enabled = true`.

**Assertions:**

- `generatedAt` is within 60 seconds of the current time
- Each component contains an ISO-8601 `observedAt`
- `freshness.maxAgeSeconds` matches the oldest component observation age

## Layer 2 harness

Source: [`tests/src/profiles/status-profile.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/status-profile.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative.

## Stack declarations

Stacks that expose the shared status API must declare both the profile and the
capability flag in `stack.json`:

```jsonc
{
  "contractProfiles": ["core", "operational", "status-profile"],
  "capabilities": {
    "status": {
      "enabled": true
    }
  }
}
```

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [MCP Profile](./mcp-profile) — MCP tool checks that now validate the same summary contract
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
