---
sidebar_position: 6
title: Versioning and Releases
---

Stemix IDP uses independent semantic versioning for each component, managed
by [release-please](https://github.com/googleapis/release-please).

## Components

Each component is versioned independently:

| Component | Tag Prefix | Version File |
| --- | --- | --- |
| Go net/http REST | `go-net-http-rest-v` | `stacks/go/net-http/rest/version.txt` |
| Node.js React + Fastify REST | `nodejs-react-fastify-rest-v` | `stacks/nodejs/react-fastify/rest/package.json` |
| Contract Tests | `contract-tests-v` | `tests/version.txt` |

## Release Flow

1. Merging to `main` triggers `release-please` to open (or update) a release
   PR per component that has changes.
2. Merging a release PR creates a Git tag (for example
   `go-net-http-rest-v0.1.0-alpha.1`).
3. The tag triggers the **Container Publish** workflow, which builds and pushes
   versioned images to `ghcr.io/ourchitecture/idp/stemix-*`.
4. The **Container Latest Tag** workflow runs after publish and re-tags the
   highest stable version as `latest` (skipped during pre-release phase).

## Build Scope Optimization

Container validation and edge builds are path-aware:

- Release metadata updates (`.release-please-manifest.json` and
  `release-please-config.json`) do not trigger full container rebuilds by
  themselves.
- PR container checks only build the changed container families:
  - Go stack paths (`stacks/go/net-http/rest/**`) -> Go web + BFF images.
  - Node.js stack paths (`stacks/nodejs/react-fastify/rest/**`) -> Node.js web + BFF images.
  - Contract test paths (`tests/**`) -> contract-tests image.
- If `.github/workflows/container-build.yml` changes, all container families are
  rebuilt to validate workflow behavior.

## Pre-Release Phase

The project starts in pre-release (`0.x.y-alpha.z`). During this phase:

- The `latest` tag is **not** applied.
- Only exact version tags, major.minor, and major tags are pushed.
- Breaking changes are expected and do not require a major version bump.

## Tag Strategy

For a release like `0.1.0-alpha.1`, the following tags are pushed:

- `0.1.0-alpha.1` (exact version)
- `0.1` (latest patch in minor)
- `0` (latest in major)

For a stable release like `1.2.3`:

- `1.2.3` (exact)
- `1.2` (latest patch in minor)
- `1` (latest in major)
- `latest` (highest stable across all versions)

## Cleanup

A daily cleanup workflow removes old container versions, keeping a minimum
floor of 5 versions per image. The `latest`, `edge`, major, and major.minor
tags are preserved.
