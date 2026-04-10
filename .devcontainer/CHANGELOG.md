# Changelog

## [0.1.0-alpha.0](https://github.com/ourchitecture/idp/compare/dev-tools-v0.0.0...dev-tools-v0.1.0-alpha.0) (UNRELEASED)

### Features

* Create unified developer tooling container (stemix-dev-tools) based on Ubuntu 24.04 LTS
* Pre-install all project tools at pinned versions from .prototools:
  * proto 0.55.4
  * moon 2.1.3
  * go 1.25.0
  * node 24.0.0 with bundled npm
  * python 3.12.11
  * uv 0.9.11
* Include system dependencies: git, make, curl, wget, bash, jq, ca-certificates, gnupg, unzip, sudo, build-essential
* Install Docker CLI (client only, no daemon)
* Install Eclipse Temurin JDK 21 and Maven for tools/mock-oauth builds
* Install security scanning tools at pinned versions:
  * gitleaks v8.30.1
  * Trivy 0.56.2
  * semgrep 1.157.0
* Add Trivy self-scan stage following tests/Dockerfile pattern
* Create non-root vscode user with passwordless sudo and docker group membership
* Configure VS Code dev container with recommended extensions and Docker socket mount
* Integrate with CI/CD workflows:
  * Path-based change detection for .devcontainer/** and .prototools
  * Automated edge tag builds on main branch merges
  * Versioned publishing via release-please
  * Container cleanup with retention policy
  * Latest tag promotion for stable releases
* Add Makefile target build-container-dev-tools for local development
* Configure release-please component at .devcontainer path
