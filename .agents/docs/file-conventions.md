# File and Directory Conventions

## Layout

- `/stacks/<language>/<framework>/<interface>/` — technology-specific
  implementations with a GNU Makefile. Names encode language, server
  framework, and interface type (web or BFF).
- `/deploy/` — container and infra definitions.
- `/plugins/` — plug-ins and SDKs.
- `/docs/` — Docusaurus documentation site. `docs/content/` is the single
  source of truth for all docs.
- `/docs/content/architecture/decisions/` — Architecture Decision Records (ADRs).
- `/docs/content/architecture/diagrams/` — C4 architecture diagrams in
  Mermaid syntax.
- `/tests/` — contract test harness (TypeScript) and Layer 1 Gherkin specs.
- `/tests/features/` — Layer 1 Gherkin `.feature` files; ground truth for
  all contract intent.
- `/tests/src/profiles/` — Layer 2 TypeScript test implementations derived
  from `.feature` files.
- `/tools/` — tooling and MCP definitions.
- `/tools/mcp/` — Model Context Protocol adapter server.
- `/tools/vscode-extension/` — VS Code extension skeleton.
- `/tools/backstage/` — Backstage test harness for IDP plug-in integration.
- `/.agents/skills/` — agent skills.
- `/.agents/docs/` — agent documentation (this directory).

## Test harness sync rule

Changes to `tests/features/*.feature` or `tests/src/profiles/*.ts`
**obligate** an update to `docs/content/testing/` in the same change:

- Adding/changing a scenario in a `.feature` → update the matching profile
  doc in `docs/content/testing/profiles/`.
- Adding/changing a test in `tests/src/profiles/*.ts` → verify it matches
  the `.feature` spec; if the `.feature` must change, update both together.
- Adding a new profile → create the `.feature` file and the matching
  `docs/content/testing/profiles/<profile>.md` page in the same change.

## Architecture diagram sync rule

Changes under `docs/content/architecture/diagrams/` **obligate** an update
to generated assets in `docs/static/diagrams/` in the same change.

- Source: Mermaid C4 diagrams in `docs/content/architecture/diagrams/*.md`.
- Generated: `docs/static/diagrams/*.svg`.
- Generate: `moon run docs-site:generate-diagrams` or
  `make -C docs generate-diagrams`.
- Validate: `moon run docs-site:check-diagrams` or
  `make -C docs check-diagrams`.
