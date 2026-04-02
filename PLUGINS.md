# Plug-in Model (High-Level Design)

This document describes the target-state plug-in architecture for Stemix IDP.
Like [ROADMAP.md](ROADMAP.md), it is a capability direction document, not a
claim that every concept below is implemented today. See
[AGENTS.md](AGENTS.md) for how planned work should be translated into small,
end-to-end increments.

---

## 1. Design Principles

| Principle | Rationale |
| --- | --- |
| **Stack-agnostic contracts, stack-native implementations** | The plug-in model defines contracts any technology can implement while letting each stack leverage its own strengths (e.g., IoC discovery in Java/.NET, middleware composition in Go/Node.js). |
| **Secure by default** | Plug-ins run inside capability-constrained sandboxes. A plug-in receives only the permissions it declares and the host explicitly grants. |
| **Simple for users, flexible for operators, powerful for developers** | Each persona interacts with plug-ins at the appropriate level of abstraction. Complexity is pushed down the stack, not up to the user. |
| **Incremental adoption** | A platform can start with zero plug-ins and grow. Built-in capabilities and plug-in-provided capabilities share the same contract surface so that any built-in can eventually be extracted into a plug-in and vice versa. |
| **Discoverable and auditable** | Every plug-in is cataloged, versioned, and subject to lifecycle governance. Nothing runs in the dark. |

---

## 2. Inspiration and Prior Art

The plug-in model draws lessons from proven systems while avoiding their
well-known pitfalls:

- **VS Code** -- Extension Host process isolation, activation events,
  contribution points, and the marketplace discovery model. Lesson: a small,
  stable API surface with clear extension points scales better than exposing
  internals.
- **Backstage** -- Plug-in-per-package model, composable UI components, and
  catalog-driven discoverability. Lesson: portal plug-ins need first-class
  catalog and ownership metadata, but coupling plug-ins to a single frontend
  framework limits portability.
- **Hexagonal / Ports-and-Adapters architecture** -- The host defines ports
  (contracts); plug-ins are adapters. This keeps the core domain independent of
  any specific plug-in implementation.
- **Micro-frontends and Module Federation** -- Runtime composition of
  independently deployed frontend modules via Host + Remote topology. Lesson:
  shared dependency negotiation and version contracts are essential for
  stability.
- **WebAssembly component model** -- Language-agnostic, capability-based
  sandboxing with a well-defined interface (WIT). Lesson: sandbox boundaries
  should be defined by capabilities, not by language or runtime.
- **OSGi / IoC containers** -- Declarative service registration and dependency
  injection. Lesson: discovery and wiring should be automatic, but the
  lifecycle (install, resolve, start, stop, uninstall) must be explicit and
  observable.

---

## 3. Architecture Layers

The plug-in model spans three architectural tiers that mirror the existing
layered architecture described in ADR `0001`:

```text
+-----------------------------------------------------------------+
|  Layer 1 -- Intent (what plug-in capabilities exist)            |
|  Gherkin features, catalog metadata, capability declarations    |
+-----------------------------------------------------------------+
|  Layer 2 -- Contract (how plug-ins interact with the host)      |
|  Port interfaces, lifecycle hooks, permission manifests         |
+-----------------------------------------------------------------+
|  Layer 3 -- Implementation (stack-specific plug-in code)        |
|  Go adapters, Node.js modules, Wasm components, UI remotes     |
+-----------------------------------------------------------------+
```

### 3.1 Intent Layer

- Plug-in capabilities are described in the system catalog using
  technology-neutral metadata (name, version, capabilities offered, permissions
  required, supported tiers).
- Gherkin intent specifications define the observable behavior a plug-in
  category must satisfy, independent of implementation.

### 3.2 Contract Layer

- **Ports** define the extension points the host exposes (e.g.,
  `AuthenticationPort`, `HealthContributorPort`, `NavigationSlotPort`).
- **Lifecycle hooks** define the stages a plug-in passes through: register,
  resolve, activate, deactivate, uninstall.
- **Permission manifests** declare the capabilities a plug-in requires
  (network access, data scopes, UI slots, service endpoints).

### 3.3 Implementation Layer

- Each reference stack provides a concrete plug-in host and SDK.
- Stack-specific affordances are encouraged: Go interfaces, Node.js dynamic
  imports, Java/C# dependency injection, Rust traits.
- WebAssembly (Wasm) components are the portable, sandboxed execution option
  for plug-ins that must run across stacks or in untrusted contexts.

---

## 4. Plug-in Tiers

Not all plug-ins carry the same risk or operational weight. The model defines
tiers to match governance to impact:

| Tier | Description | Examples |
| --- | --- | --- |
| **Built-in** | Ships with the platform. Same release cycle and trust boundary as the host. | Core health, default navigation, built-in auth adapters |
| **First-party** | Developed by the platform team but deployed independently. Follows the platform's own review process. | Additional auth providers, analytics dashboards |
| **Verified** | Developed by a trusted third party. Passes a defined review and certification process. | Vendor-supplied integrations, partner plug-ins |
| **Community** | Developed externally. Available in the catalog but not certified. Operators explicitly opt in. | Open-source extensions, experimental features |

Tier boundaries map to sandbox strictness: built-in plug-ins may run in-process;
community plug-ins run inside Wasm sandboxes or isolated processes with minimal
granted capabilities.

---

## 5. Security Model

### 5.1 Capability-Based Sandboxing

- Plug-ins declare required capabilities in a manifest (analogous to a
  permission set).
- The host grants only the declared capabilities after policy evaluation.
- WebAssembly components enforce the sandbox at the runtime level: a Wasm
  plug-in cannot access the filesystem, network, or host memory beyond what the
  host explicitly provides through imported functions.
- Non-Wasm plug-ins (in-process adapters) rely on contract enforcement and code
  review. Tier governs which execution model is acceptable.

### 5.2 Trust and Review

- Every plug-in version is immutable and content-addressable (hash-verified).
- Promotion across tiers (community to verified to first-party) requires
  explicit review gates.
- Cybersecurity review is a first-class lifecycle stage, not an afterthought.
- Vendor-supplied plug-ins integrate with existing Vendor Management, Legal,
  and Budgeting review processes.

### 5.3 Runtime Isolation

- BFF-tier plug-ins run as isolated middleware or sidecar processes behind the
  BFF's trust boundary.
- Web-tier plug-ins load as federated remotes with their own JavaScript
  sandbox (e.g., iframe or shadow-realm isolation where supported).
- Cross-tier plug-ins (e.g., a plug-in that contributes both a BFF route and a
  UI panel) coordinate through the same catalog entry but deploy independently
  per tier.

---

## 6. Web Tier -- Module Federation and UI Composition

Web-tier plug-ins follow a Host + Remote topology inspired by Module
Federation:

- **Host application** -- The portal shell. Owns layout, navigation, and shared
  dependencies (design system, auth context, routing).
- **Remote plug-ins** -- Independently built and deployed UI modules. Each
  remote exposes one or more components or route contributions via a federation
  manifest.
- **Shared contracts** -- Remotes depend on a versioned plug-in SDK package
  that defines the component interface, slot registrations, and shared context
  shapes.

Web Components remain an option for framework-agnostic UI contribution, but the
model does not require them as the sole mechanism. Framework-native components
(React, Vue, etc.) are acceptable within a remote's boundary; the federation
layer handles cross-framework composition where needed.

Server-side rendering (SSR) support is a design constraint: the host must be
able to render a plug-in's initial state on the server or gracefully degrade to
client-only rendering with appropriate loading states.

---

## 7. BFF Tier -- Service Extension Points

BFF-tier plug-ins extend backend-for-frontend services through well-defined
ports:

- **Route contribution** -- A plug-in registers additional API routes or
  middleware on the BFF.
- **Data aggregation** -- A plug-in contributes data to composite endpoints
  (e.g., portal summary, status dashboard).
- **Authentication/Authorization adapters** -- Plug-ins implement auth ports
  (OAuth, OIDC, SAML, RBAC, ABAC, ReBAC) without modifying host code.
- **Health contribution** -- Plug-ins expose health signals that roll up into
  the platform's `/health` and `/readiness` endpoints.

Stack-specific plug-in hosts wire these contributions using native patterns:
Go interfaces and middleware chains, Node.js route registration and async
hooks, Java/C# dependency injection containers.

---

## 8. Discovery and Lifecycle

### 8.1 Catalog

The plug-in catalog is the single source of truth for what is available,
installed, and active. It stores:

- Plug-in identity (name, version, publisher, content hash)
- Tier classification
- Capability declarations and permission requirements
- Activation state per environment (off, available, enabled, required)
- Review and approval status

### 8.2 Persona-Specific Interaction

| Persona | Interaction |
| --- | --- |
| **Developer** | Builds plug-ins against the SDK. Decides which plug-ins to include in a deployment artifact. |
| **Operator** | Configures which catalog entries are available in a given environment. Enables, disables, or requires plug-ins per tenant or deployment. |
| **User** | Browses available plug-ins. Activates plug-ins for their own workspace. Requests access to plug-ins that are cataloged but not yet enabled for them. |

### 8.3 Lifecycle Stages

```text
Submitted --> Review --> Approved --> Published --> Installed --> Activated
                |                                                    |
                v                                                    v
            Rejected                                           Deactivated --> Uninstalled
```

- **Submitted** -- A plug-in version is proposed for inclusion in the catalog.
- **Review** -- Cybersecurity, legal, vendor management, and technical review
  as appropriate for the tier.
- **Approved / Rejected** -- Gate decision.
- **Published** -- Available in the catalog for installation.
- **Installed** -- Downloaded and resolved in a target environment.
- **Activated / Deactivated** -- Running or suspended at runtime.
- **Uninstalled** -- Removed from the environment.

---

## 9. Intent Specification Integration

Plug-in capabilities are expressed in the existing three-layer testing model:

- **Layer 1 (Gherkin)** -- Intent features describe what a plug-in category
  must do (e.g., "an authentication plug-in must issue and validate tokens").
- **Layer 2 (Contract harness)** -- Profile tests verify that any conforming
  plug-in satisfies the intent, regardless of stack.
- **Layer 3 (Stack implementation)** -- Each stack's plug-in host and SDK
  provide the concrete wiring so that plug-ins can be exercised against the
  contract.

This mirrors how existing capabilities like health and status are already
specified and tested.

---

## 10. Open Questions (Future Sessions)

The following areas require deeper design work in subsequent iterations:

1. **Manifest schema** -- Exact format for plug-in metadata, capability
   declarations, and permission sets.
2. **Wasm component interface (WIT) design** -- Defining the portable contract
   surface for sandboxed plug-ins.
3. **Federation protocol** -- Version negotiation, shared dependency management,
   and remote loading strategies for web-tier plug-ins.
4. **Catalog storage and API** -- How the catalog is persisted, queried, and
   synchronized across environments.
5. **Upgrade and migration** -- How plug-in contract changes are versioned and
   how breaking changes are managed.
6. **Multi-tenancy** -- Per-tenant plug-in activation, data isolation, and
   configuration scoping.
7. **Telemetry and observability** -- How plug-in behavior feeds into the
   platform's observability stack.
8. **Offline and air-gapped** -- Catalog and plug-in distribution in
   disconnected environments.
9. **Reference implementation sequencing** -- Which plug-in category and tier to
   implement first as the initial end-to-end slice.

---

## Summary

The Stemix IDP plug-in model is built around three ideas:

1. **Contracts, not conventions** -- Ports define what the host expects;
   plug-ins are adapters that fulfill those ports. Any stack can implement the
   contract using its own idioms.
2. **Sandboxes, not trust** -- Plug-in execution is constrained by declared
   capabilities and enforced by runtime boundaries (Wasm, process isolation,
   federation scoping).
3. **Lifecycle, not just code** -- A plug-in is a governed artifact with
   review, approval, versioning, and persona-appropriate controls from
   submission through retirement.
