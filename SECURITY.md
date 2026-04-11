# Security Policy

This document explains how to report vulnerabilities and how security is
managed across the Intent-Driven Portal (IDP) repository and its sub-projects.
It complements the contribution rules in `AGENTS.md` and the operational guide
in `docs/content/security.md`; keep these sources in sync when updates are
made.

## Reporting a vulnerability

- Report suspected vulnerabilities privately via GitHub Security Advisories:
  https://github.com/ourchitecture/idp/security/advisories/new
- Do not open public GitHub issues or discussions for security reports.
- Include the affected component (see **Components in scope**), version or
  commit, reproduction details, and expected impact. If the report depends on
  external services or credentials, describe the assumptions instead of
  including secrets.
- We aim to acknowledge new reports within five business days and will share
  status updates and coordinated disclosure timelines as fixes are prepared.

## Supported versions

IDP is pre-1.0. Security fixes are applied to `main` and the most recent
pre-release tags for maintained stacks. Older tags and forks are not patched;
upgrade to the latest published artifacts for coverage.

## Components in scope

Security reports cover all maintained sub-projects in this repository:

- Reference stacks under `stacks/`, including `go/net-http/rest` and
  `nodejs/react-fastify/rest`.
- Documentation site under `docs/` (Docusaurus) and any published static assets.
- Tooling under `tools/`, including the MCP server, mock OAuth server, status
  publisher, VS Code extension scaffolding, and Backstage tooling.
- Contract tests and fixtures under `tests/`.
- Container images built from any of the above when published from this repo.

## Security self-checks

- Run the privacy and secret scanning suite locally with
  `moon run repo:check-privacy` or `make check-privacy`. See
  `docs/content/security.md` for details.
- Follow the security requirements in `AGENTS.md` (for example, secret handling
  rules and vulnerability scan expectations). Update `SECURITY.md` whenever
  those guardrails change.

## Roadmap awareness

Future security-related capabilities are tracked in
https://github.com/ourchitecture/idp/issues/171. They are not yet available on
`main`; do not assume roadmap items are implemented until the repository
contains the corresponding code and documentation.
