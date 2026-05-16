# Changelog

All notable changes to the Backstage test harness will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha.0](https://github.com/ourchitecture/idp/compare/backstage-tools-v0.1.0-alpha.0...backstage-tools-v0.2.0-alpha.0) (2026-05-16)


### Features

* add Backstage skeleton sub-project for plug-in integration testing ([#142](https://github.com/ourchitecture/idp/issues/142)) ([08cfc87](https://github.com/ourchitecture/idp/commit/08cfc87844284970c207473314ea04bf09c0c03c))
* add fixture-backed agent work insight ([#374](https://github.com/ourchitecture/idp/issues/374)) ([eb2f07d](https://github.com/ourchitecture/idp/commit/eb2f07d8b232b3834af41c5354575b8cf88df1d6))
* **backstage:** add standalone stemix plugin harness ([#378](https://github.com/ourchitecture/idp/issues/378)) ([57b0104](https://github.com/ourchitecture/idp/commit/57b0104f800e9c08386478c7458e984f2a8a0f01))


### Bug Fixes

* backstage instance ([976d42a](https://github.com/ourchitecture/idp/commit/976d42a3a55b36393bf7265f4072168fb3d81ccb))
* build and test issues ([d6f43f9](https://github.com/ourchitecture/idp/commit/d6f43f995e75299e1e3ebf2ef631f2472d297acc))
* **ci:** resolve three persistent PR check failures ([#379](https://github.com/ourchitecture/idp/issues/379)) ([3b2f6c9](https://github.com/ourchitecture/idp/commit/3b2f6c939a73bd2f9f2bd4ca340e2f11f26df84f))

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
