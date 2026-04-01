---
status: proposed
date: 2026-03-31
decision-makers:
  - "@idp-admin"
  - "@idp-maintain"
consulted: []
informed: []
---

# Dependency and Tooling Pinning Policy

## Context and Problem Statement

IDP spans multiple language stacks, a documentation site, CI/CD pipelines,
and reusable GitHub Actions workflows. Each layer introduces external
dependencies — runtime packages, language toolchains, container images, and
third-party GitHub Actions — that can change their behavior under identical
version specifiers if versions are not pinned precisely.

Unpinned or loosely pinned dependencies cause:

- Reproducibility failures — the same commit builds differently across time or
  machines.
- Supply-chain risk — a dependency update (including a tag move or a mutable
  `latest` image layer) can introduce malicious or breaking changes
  transparently.
- Debugging difficulty — transient failures that disappear on re-run due to
  a version shift are hard to triage.

How should IDP pin dependencies and tooling versions at every layer so that
builds are deterministic, supply-chain risk is minimized, and version upgrades
are explicit and auditable?

## Decision Drivers

- Reproducible builds across local, CI, and container environments
- Explicit, auditable version upgrades via pull requests
- Minimal supply-chain risk at every dependency layer
- Each sub-project must be self-contained: it declares its own pinned
  dependencies rather than assuming a parent environment provides them
- Shared tooling (e.g., linters) must be available to every project that
  needs it without installing the entire workspace
- No use of `npx` or similar runtime package fetchers as a substitute for
  declared, pinned dependencies

## Considered Options

- Pin nothing; accept `latest` / `*` / major-version ranges everywhere
- Pin only language runtimes (via proto); leave packages and actions loose
- Pin language runtimes via proto and lock all package dependencies via
  lockfiles, but allow floating action tags and container image tags
- Pin everything: runtimes via proto, packages via lockfiles and exact
  version specifiers, GitHub Actions via pinned minor versions or commit
  SHAs, container images via digest

## Decision Outcome

Chosen option: "Pin everything", because every layer of unpinned dependency
is a separate vector for silent breakage or supply-chain compromise.

### Policy by Layer

#### Language runtimes and toolchain binaries

- All language runtimes (`node`, `go`, `moon`, `proto`, etc.) must be pinned
  in `.prototools` at an exact version.
- No toolchain version should be expressed as `latest`, a range, or a
  major-only pin.
- The `.prototools` file is the single authoritative source for these
  versions. See [ADR-0007](0007-moon-required-proto-enhanced-toolchain-policy.md).

#### Node.js / npm packages

- Every project that depends on an npm package must declare that package in
  its own `package.json` at an exact version or a tightly bounded range
  (e.g., `~` patch-only for tooling) and commit its own `package-lock.json`.
- Projects must not rely on a parent workspace's `node_modules` to provide
  a binary or package that is not declared in their own `package.json`. If a
  tool is used in a project's scripts or Makefile, it must appear in that
  project's `devDependencies`.
- Shared tooling (e.g., `markdownlint-cli2`, `tsx`) must be declared in
  every project that invokes it, not assumed to be present from a parent
  install. This is the only reliable way to guarantee the right version is
  available regardless of which projects have been installed.
- The root `package.json` is not a shared tooling provider for sub-projects.
  It declares its own dependencies for its own tasks only.
- Use exact versions (`"markdownlint-cli2": "0.21.0"`) for CLI tooling
  installed via `devDependencies`, since these are not API contracts subject
  to semantic-versioning consumer constraints.
- `npm ci` (not `npm install`) must be used in CI environments to enforce
  the lockfile.

#### Go modules

- `go.mod` must pin module versions exactly. The `go.sum` file must be
  committed.
- No `replace` directives pointing to local paths should be committed to
  `main` unless they reflect an intentional workspace structure.

#### Container images

- All container image references (`FROM` in Dockerfiles, image fields in
  Compose files or Kubernetes manifests) must specify an exact digest
  (`image@sha256:<digest>`) in addition to a human-readable tag for
  traceability.
- The digest pin takes precedence over the tag for reproducibility.
- `latest` tags are forbidden in any committed image reference.

#### GitHub Actions

- All `uses:` references in GitHub Actions workflows must specify a pinned
  version. The acceptable pinning levels, in order of preference:
  1. Full commit SHA (most secure; immune to tag mutation):
     `uses: actions/checkout@<40-char-sha>`
  2. Pinned minor version tag (acceptable for well-governed actions from
     trusted publishers such as `actions/*`, `moonrepo/*`):
     `uses: actions/checkout@v4.2.2`
  3. Major-version tag alone (`uses: actions/checkout@v4`) is **not
     acceptable** — a major tag can move to a new minor at any time.
- Where a full SHA pin is used, the human-readable version must be recorded
  in a comment on the same line for maintainability.
- Third-party or less-governed actions should be pinned to a full commit SHA.
- Renovate or Dependabot automation is encouraged to keep pins current via
  automated PRs.

### Consequences

- Good, because builds are fully reproducible across time and machines
- Good, because version upgrades are always explicit, diff-visible changes
- Good, because sub-projects are self-contained and can be installed
  independently without side effects
- Good, because supply-chain attacks via mutable tags or digests are blocked
- Bad, because every project must explicitly declare shared tooling, which
  increases `package.json` surface area slightly
- Bad, because pinned SHAs in workflow files are less human-readable;
  mitigated by inline comments
- Bad, because automated dependency update tooling (Dependabot/Renovate) is
  needed to keep pins current without manual toil

### Confirmation

- `.prototools` exists with exact versions for all runtimes
- Every npm project that invokes a CLI tool has that tool in its own
  `devDependencies` at an exact or patch-bounded version, with a committed
  lockfile
- No project's Makefile or script calls a binary from a parent or sibling
  `node_modules` directory
- All `uses:` in GitHub Actions workflows reference pinned minor-version tags
  or commit SHAs — no bare major-version tags
- Container image references include a digest pin
- CI uses `npm ci` where a lockfile is present

## Pros and Cons of the Options

### Pin nothing

- Good, because zero maintenance overhead
- Bad, because builds are non-reproducible
- Bad, because silent breakage from upstream changes is guaranteed over time
- Bad, because supply-chain risk is maximized

### Pin only language runtimes

- Good, because reduces the most common source of environment drift
- Bad, because package and action version drift still causes silent failures
- Bad, because sub-projects still implicitly depend on parent installs

### Pin runtimes and lockfiles; allow floating action tags

- Good, because package builds become reproducible
- Bad, because GitHub Actions tag mutation can still silently break CI
- Bad, because a tag-moved action can introduce malicious code

### Pin everything

- Good, because every layer of the build is deterministic and auditable
- Good, because supply-chain risk is minimized at all layers
- Neutral, because automation tooling handles most of the upgrade toil
- Bad, because initial setup cost is higher

## More Information

- Related decisions:
  - [0007](0007-moon-required-proto-enhanced-toolchain-policy.md)
  - [0002](0002-stack-layout-and-make-contract.md)
- Supply-chain references:
  - [GitHub Actions security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
  - [SLSA framework](https://slsa.dev/)
