---
sidebar_position: 2
---

# Operational Profile

The `operational` profile validates runtime conventions and semantic correctness
of API responses. It is required for all Tier 1 stacks. It builds on `core` by
checking not just that fields are present, but that they carry the right values
per the IETF `draft-inadarei-api-health-check-06` standard.

## Why it exists

The core profile confirms that a field called `status` exists. The operational
profile confirms that `status` is exactly `"pass"`, `"fail"`, or `"warn"` — not
`"ok"`, not `"healthy"`, not `200`. Semantic drift between stacks is a real risk
as the portfolio grows; the operational profile closes that gap.

See [ADR-0011](../../architecture/decisions/ietf-health-endpoint-contract) for
the full health endpoint contract specification.

## Layer 1 spec

Source: [`tests/features/operational.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/operational.feature)

## Scenarios (5 total)

### Web server honors the override-aware runtime port contract

**Precondition:** The web server is running on the port defined by the
environment variable override chain (`OUR_IDP_PORT` -> `PORT` -> `3000`).

**Assertion:** `GET /` returns an HTTP status code in the 2xx range.

This scenario validates that the web server correctly resolves its bind port
from the environment, not from a hardcoded default. The harness sets
`IDP_WEB_URL` to the expected URL and confirms reachability.

### Web server health payload semantics are stable

**Precondition:** The web server is running.

**Assertions:**

- `GET /health` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/health+json`
- Response body is a valid JSON object
- `status` field is exactly `"pass"`
- `serviceId` field is exactly `"idp-web"`
- `description` field is exactly `"IDP Web Server"`

### BFF health payload semantics are stable

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /health` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/health+json`
- Response body is a valid JSON object
- `status` field is one of `"pass"`, `"fail"`, or `"warn"` (IETF canonical values)
- `serviceId` field is exactly `"idp-bff"`
- `description` field is exactly `"IDP BFF Server"`

### BFF health checks sub-components use IETF format

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /health` returns an HTTP status code in the 2xx range
- Response body contains a `checks` object
- Each key in `checks` uses the `componentName:measurementName` format
- Each check entry contains a `status` field with value `"pass"`, `"fail"`, or `"warn"`
- Each check entry contains a `componentType` field with value `"system"`, `"component"`, or `"datastore"`
- Each check entry contains a `time` field with an ISO-8601 value

### BFF readiness contract semantics are stable

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /readiness` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/health+json`
- Response body is a valid JSON object
- `status` field is one of `"pass"` or `"fail"` (readiness is binary)
- `checks` field is a non-empty object

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

### Health endpoint (`GET /health`)

| Service | Field | Required value |
| --- | --- | --- |
| Web | `status` | `"pass"` |
| Web | `serviceId` | `"idp-web"` |
| Web | `description` | `"IDP Web Server"` |
| BFF | `status` | `"pass"`, `"fail"`, or `"warn"` |
| BFF | `serviceId` | `"idp-bff"` |
| BFF | `description` | `"IDP BFF Server"` |
| BFF | `checks` | IETF `componentName:measurementName` keyed object |

### Readiness endpoint (`GET /readiness`)

| Service | Field | Required value |
| --- | --- | --- |
| BFF | `status` | `"pass"` or `"fail"` |
| BFF | `checks` | Non-empty object |

### IETF check entry fields

| Field | Required values |
| --- | --- |
| `status` | `"pass"`, `"fail"`, or `"warn"` |
| `componentType` | `"system"`, `"component"`, or `"datastore"` |
| `time` | ISO-8601 timestamp |

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Core Profile](./core) — Baseline shape checks
- [UI Profile](./ui-profile) — Optional UI capability checks
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
- [ADR-0011](../../architecture/decisions/ietf-health-endpoint-contract) — IETF health endpoint contract
