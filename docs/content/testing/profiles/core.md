---
sidebar_position: 1
---

# Core Profile

The `core` profile is the baseline conformance requirement for every Stemix IDP
reference implementation. Any stack that does not pass `core` is not considered
compliant, regardless of what other profiles it declares.

## Why it exists

The core profile answers one question: does this implementation expose the
fundamental HTTP surface that the platform depends on? It makes no claims about
semantic correctness — those belong to the `operational` profile. It checks
shape only: reachability, content-type, and the presence of required fields.

Health and readiness endpoints follow the IETF
`draft-inadarei-api-health-check-06` standard. See
[ADR-0011](../../architecture/decisions/ietf-health-endpoint-contract) for the
full contract specification.

## Layer 1 spec

Source: [`tests/features/core.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/core.feature)

## Scenarios (5 total)

### Web server responds to `GET /`

**Precondition:** The web server is running.

**Assertion:** `GET /` returns an HTTP status code in the 2xx range.

### Web server health endpoint returns the expected shape

**Precondition:** The web server is running.

**Assertions:**

- `GET /health` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/health+json`
- Response body is a valid JSON object
- JSON object contains a `status` field
- JSON object contains a `serviceId` field
- JSON object contains a `description` field

### BFF root returns a JSON status envelope

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/json`
- Response body is a valid JSON object
- JSON object contains a `status` field of type string
- JSON object contains a `service` field of type string

### BFF health endpoint returns the expected shape

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /health` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/health+json`
- Response body is a valid JSON object
- JSON object contains a `status` field
- JSON object contains a `serviceId` field
- JSON object contains a `description` field

### BFF readiness endpoint returns the expected shape

**Precondition:** The BFF server is running.

**Assertions:**

- `GET /readiness` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `application/health+json`
- Response body is a valid JSON object
- JSON object contains a `status` field
- JSON object contains a `checks` field

## Layer 2 harness

Source: [`tests/src/profiles/core.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/core.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative.

## Stack declarations

All stacks must declare `"core"` in their `stack.json` `contractProfiles` array:

```jsonc
{
  "contractProfiles": ["core", "operational"]
}
```

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Operational Profile](./operational) — Semantic correctness checks
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
- [ADR-0011](../../architecture/decisions/ietf-health-endpoint-contract) — IETF health endpoint contract
