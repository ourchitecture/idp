---
sidebar_position: 3
---

# UI Profile

The `ui-profile` profile validates externally observable UI behavior. It is
**opt-in**: the harness generates zero tests for this profile unless the stack
declares `capabilities.ui.enabled: true` in its `stack.json`. It checks both
the document shell and the rendered UI without inspecting framework-specific
internals.

## Why it exists

Not all stacks serve a user interface — the Go BFF-only stack does not, and
future API-only stacks will not. The UI profile ensures that stacks which do
serve a UI produce a well-formed HTML document shell and, for the status MVP,
actually render live portal summary content on the home page and dedicated
status route without prescribing any particular rendering strategy.

## Layer 1 spec

Source: [`tests/features/ui-profile.feature`](https://github.com/ourchitecture/idp/blob/main/tests/features/ui-profile.feature)

## Scenarios (5 total)

All three scenarios have an additional precondition beyond server availability:
the stack must declare `capabilities.ui.enabled = true` in `stack.json`. If
that condition is not met, no tests run and the profile is silently skipped.

### Web root returns a valid HTML document shell

**Preconditions:** The web server is running; `capabilities.ui.enabled = true`.

**Assertions:**

- `GET /` returns an HTTP status code in the 2xx range
- `Content-Type` response header contains `text/html`
- Response body contains the string `<html` (case-insensitive)

### Web document shell includes a title element

**Preconditions:** The web server is running; `capabilities.ui.enabled = true`.

**Assertions:**

- `GET /` returns an HTTP status code in the 2xx range
- Response body contains the string `<title` (case-insensitive)

### Web root renders live portal summary content

**Preconditions:** The web server is running; the BFF is running;
`capabilities.ui.enabled = true`.

**Assertions:**

- Rendering `GET /` in a headless Chromium browser includes the text
  `System Status`
- The rendered page includes the text `Observed Components`
- The rendered page includes the text `IDP BFF`

### Status route renders detailed portal summary content

**Preconditions:** The web server is running; the BFF is running;
`capabilities.ui.enabled = true`.

**Assertions:**

- Rendering `GET /status` in a headless Chromium browser includes the text
  `Detailed IDP status`
- The rendered page includes the text `Observed Components`
- The rendered page includes the text `Publication Path`
- The rendered page includes the text `IDP BFF`

### UI mode declaration is one of the accepted values

**Precondition:** The stack's `stack.json` declares `capabilities.ui.mode`.

**Assertions:**

- The declared `ui.mode` value is one of: `"spa"`, `"ssr"`, or `"server-rendered"`
- When `capabilities.ui.mode` is absent, the effective mode defaults to `"spa"`

## Layer 2 harness

Source: [`tests/src/profiles/ui-profile.ts`](https://github.com/ourchitecture/idp/blob/main/tests/src/profiles/ui-profile.ts)

The TypeScript harness is derived from the `.feature` file above. When they
disagree, the `.feature` file is authoritative.

The rendered-page checks use a local Chromium-family browser in headless mode.
Set `IDP_UI_BROWSER_PATH` when auto-detection cannot find Chrome or Edge on the
current machine. `PUPPETEER_EXECUTABLE_PATH` is also honored as a fallback.

## Stack declarations

A UI-capable stack declares the profile and enables the UI capability:

```jsonc
{
  "contractProfiles": ["core", "operational", "status-profile", "ui-profile"],
  "capabilities": {
    "status": {
      "enabled": true
    },
    "ui": {
      "enabled": true,
      "mode": "spa"
    }
  }
}
```

A non-UI stack omits the profile or disables the capability. Adding
`"ui-profile"` to `contractProfiles` for a non-UI stack is safe: the harness
will generate zero tests.

## Accepted `ui.mode` values

| Value | Description |
| --- | --- |
| `"spa"` | Client-side single-page application (default when mode is absent) |
| `"ssr"` | Server-side rendering with hydration |
| `"server-rendered"` | Fully server-rendered with no client-side hydration |

## Related

- [Contract Test Harness](../contract-harness) — Full harness guide
- [Core Profile](./core) — Baseline shape checks
- [Operational Profile](./operational) — Semantic correctness checks
- [ADR-0005](../../architecture/decisions/shared-capability-contract-and-conformance-profiles) — Capability contract and conformance profiles
- [ADR-0009](../../architecture/decisions/intent-specification-format) — Gherkin as Layer 1 format
