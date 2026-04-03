# Maintainers

This document lists the maintainers of the Intent-Driven Portal (IDP) project
and their responsibilities.

## Teams

### idp-admin

Repository administrators with full access.

### idp-maintain

Maintainers responsible for code review, merging, and release management.

## Responsibilities

- Review and merge pull requests. At least one CODEOWNERS approval is
  required; stale approvals are dismissed on new pushes. Merges use
  squash-only and are gated by the `pr-validation-result` status check
  (enforced by GitHub rulesets).
- Triage incoming issues and apply appropriate labels.
- Review weekly `stale` labels as inbox hygiene and apply `keep-open` when work
  should remain active.
- Manage releases via release-please automation.
- Monitor CI/CD pipelines and container image publishing.
- Ensure documentation stays current with code changes.

## Community and Social Guidance

Maintain public communication with the same quality bar used for code and docs.

- Use [`SOCIAL.md`](../SOCIAL.md) as the shared guide for channel roles,
  content flow, and engagement rules.
- Keep GitHub as the canonical destination for meaningful discussions,
  decisions, and RFCs.
- Prefer linking to existing discussions or docs over duplicating content across
  platforms.

## Release Process

Releases are automated via [release-please](https://github.com/googleapis/release-please).

- Each component (Go stack, Node.js stack, contract tests) is independently
  versioned using SemVer.
- The `main` branch is protected by GitHub rulesets: all merges require
  passing status checks, an approving review, resolved conversations, and
  squash merge. Force pushes and direct commits are blocked. `idp-admin`
  members can bypass in emergencies.
- Merging to `main` triggers release-please to open or update release PRs.
- Merging a release PR creates a Git tag and publishes container images to
  GitHub Container Registry (`ghcr.io/ourchitecture/idp/stemix-*`).
- The `latest` tag is only applied to stable (non-pre-release) versions.

## Escalation

For security issues, use GitHub Security Advisories. For all other questions,
open a GitHub Issue.
