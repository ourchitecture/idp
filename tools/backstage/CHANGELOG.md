# Changelog

All notable changes to the Backstage test harness will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-07

### Added

- Initial Backstage skeleton sub-project for IDP plug-in integration testing
- Minimal frontend app with core Backstage plugins (catalog, scaffolder, techdocs, search)
- Minimal backend with essential services (auth, catalog, search, scaffolder, techdocs)
- In-memory SQLite database configuration for local development
- Guest authentication provider for frictionless local testing
- Moon task definitions for standard IDP build/test/check targets
- GNU Makefile wrapper following IDP tool project conventions
- CI integration via change detection and pr-validate workflow
- Documentation (README, this CHANGELOG)

### Configuration

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:7007>
- Database: In-memory SQLite (no persistence)
- Auth: Guest provider (no credentials required)

### Known Limitations

- No custom IDP plug-ins included yet (skeleton phase)
- No persistent catalog or entities configured
- No TLS for local development
- No production deployment configuration
