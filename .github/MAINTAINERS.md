# Maintainers

This document lists the maintainers of the Intent-Driven Portal (IDP) project
and their responsibilities.

## Teams

### idp-admin

Repository administrators with full access.

### idp-maintain

Maintainers responsible for code review, merging, and release management.

## Responsibilities

- Review and merge pull requests.
- Triage incoming issues and apply appropriate labels.
- Manage releases via release-please automation.
- Monitor CI/CD pipelines and container image publishing.
- Ensure documentation stays current with code changes.

## Release Process

Releases are automated via [release-please](https://github.com/googleapis/release-please).

- Each component (Go stack, Node.js stack, contract tests) is independently
  versioned using SemVer.
- Merging to `main` triggers release-please to open or update release PRs.
- Merging a release PR creates a Git tag and publishes container images to
  GitHub Container Registry (`ghcr.io/ourchitecture/idp/stemix-*`).
- The `latest` tag is only applied to stable (non-pre-release) versions.

## Escalation

For security issues, use GitHub Security Advisories. For all other questions,
open a GitHub Issue.
