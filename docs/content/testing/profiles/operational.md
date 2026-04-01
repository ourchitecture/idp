---
sidebar_position: 2
---

# Operational Profile

The `operational` profile validates runtime conventions and semantic correctness
of API responses. It is required for all Tier 1 stacks. It builds on `core` by
checking not just that fields are present, but that they carry the right values.

## Why it exists

The core profile confirms that a field called `status` exists. The operational
profile confirms that `status` is exactly `"ok"` or `"degraded"` — not `"OK"`,
not `"healthy"`, not `200`. Semantic drift between stacks is a real risk as
the portfolio grows; the operational profile closes that gap.

## Layer 1 spec

Source: [`tests/features/operational.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/operational.feature)

## Scenarios (3 total)

### Web server honors the override-aware runtime port contract

**Precondition:** The web server is running on the port defined by the
environment variable override chain (`OUR_IDP_PORT` → `PORT` → `3000`).

**Assertion:** `GET /` returns an HTTP status code in the 2xx range.

This scenario validates that the web server correctly resolves its bind port
from the environment, not from a hardcoded default. The harness sets
`IDP_WEB_URL` to the expected URL and confirms reachability.

### BFF health payload semantics are stable

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /api/health` returns an HTTP status code in the 2xx range
- Response body is a valid JSON object
- `status` field is exactly `"ok"` or exactly `"degraded"` (no other values permitted)
- `service` field is exactly `"idp-bff"` (exact string, case-sensitive)
- `timestamp` field is a non-empty string parseable as an ISO-8601 date

### BFF readiness contract semantics are stable

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /api/readiness` returns an HTTP status code in the 2xx range
- Response body is a valid JSON object
- `status` field is exactly `"ready"`
- `checks` field is an object containing the key `"bff"`
- `checks` field is an object containing the key `"routing"`
- `timestamp` field is a non-empty string parseable as an ISO-8601 date

## Layer 2 harness

Source: [`tests/src/profiles/operational.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/operational.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative.

## Stack declarations

Tier 1 stacks declare both `"core"` and `"operational"`:

```jsonc
{
  "contractProfiles": ["core", "operational"]
}
```

## Required implementation values

| Endpoint | Field | Required value |
| --- | --- | --- |
| `GET /api/health` | `status` | `"ok"` or `"degraded"` |
| `GET /api/health` | `service` | `"idp-bff"` |
| `GET /api/health` | `timestamp` | ISO-8601 string |
| `GET /api/readiness` | `status` | `"ready"` |
| `GET /api/readiness` | `checks.bff` | any value (key must exist) |
| `GET /api/readiness` | `checks.routing` | any value (key must exist) |
| `GET /api/readiness` | `timestamp` | ISO-8601 string |

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Core Profile](./core) — Baseline shape checks
- [UI Profile](./ui-profile) — Optional UI capability checks
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
