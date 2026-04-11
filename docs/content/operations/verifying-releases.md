---
sidebar_position: 3
title: Verifying Published Images
---

Verify that a pulled container image really came from this repository and was built from the expected commit by inspecting its OCI labels, SBOM, and provenance attestations.

## What each release publishes

- **OCI labels**: created timestamp, git revision, version, source URL, URL, vendor, license.
- **SBOM**: SPDX document attached as an OCI referrer by `docker/build-push-action` (`sbom: true`).
- **Provenance attestation**: SLSA v1 provenance attached by `docker/build-push-action` (`provenance: true`).

Latest re-tags point at the original digest, so these artifacts remain discoverable even after `latest` moves.

## Prerequisites

- Docker CLI with Buildx.
- `gh` (optional) for GitHub-native attestation verification.
- `cosign` (optional) for additional signature checks.

## 1) Select the image and digest

```bash
IMAGE=ghcr.io/ourchitecture/idp/stemix-go-net-http-rest-web:1.4.0
DIGEST=$(docker buildx imagetools inspect "${IMAGE}" --format '{{ .Digest }}')
IMAGE_REF="${IMAGE%@*}@${DIGEST}"
```

Use the digest reference for all subsequent commands to avoid tag races.

## 2) Inspect OCI labels

```bash
docker pull "${IMAGE_REF}"
docker inspect "${IMAGE_REF}" --format '{{json .Config.Labels}}' | jq
```

Confirm `org.opencontainers.image.revision` matches the expected commit and `org.opencontainers.image.version` matches the release tag.

## 3) View the SBOM

```bash
docker buildx imagetools inspect "${IMAGE_REF}" --format '{{ json .SBOM }}' | jq
```

The output contains the SPDX document emitted during the Buildx publish step.

## 4) View the provenance attestation

```bash
docker buildx imagetools inspect "${IMAGE_REF}" --format '{{ json .Provenance }}' | jq
```

The provenance includes the git revision, build timestamp, and Buildx workflow metadata.

## 5) Verify the attestation signature (GitHub)

```bash
gh attestation verify "${IMAGE_REF}" --owner ourchitecture
```

`gh` confirms the attestation was issued by GitHub Actions for `ourchitecture/idp` and that the subject digest matches `IMAGE_REF`.

## 6) Optional: Verify with cosign

```bash
cosign verify-attestation "${IMAGE_REF}" \
  --type slsaprovenance \
  --certificate-identity-regexp "https://github.com/ourchitecture/idp/.github/workflows/.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

This provides an extra validation path alongside the GitHub-native attestation check.
