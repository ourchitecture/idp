# Security Rules

- Never commit secrets, credentials, or environment-specific configs.
- Do not bypass auth/permission checks for convenience.
- Prefer secure defaults; document any exceptions.

## Container builds

- All container builds must emit OCI labels plus SBOM and provenance
  attestations. Keep `sbom`/`provenance` enabled in release workflows and
  carry labels into final images.
- Review SBOM findings and remediate or document any High/Critical issues
  before releasing containers.
- For container changes, ensure the integrated Dockerfile vulnerability scan
  passes during `make build-containers`.

## Dependency and vulnerability scans

- Run dependency and container vulnerability scans when changes affect
  dependency graphs, executable behavior, or Dockerfiles (manifests,
  lockfiles, runtime source, build scripts, CI scripts, Makefiles, moon
  task definitions, container definitions).
- For docs-only or markdown-only changes, skip dependency audits and run
  markdown lint (`moon run repo:check-lint-md`) as the required validation.
- Never leave known High/Critical vulnerabilities unaddressed: fix in the
  same change and re-run the audit to confirm a clean result.
- If no safe fix exists, document the mitigation and risk in the issue/PR
  and create a follow-up issue before closing work.
