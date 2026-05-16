# Backstage Harness

`tools/backstage` is a standalone Yarn 4 workspace used to develop and validate local Backstage integrations without changing the root pnpm workspace.

## What it includes

- Backstage demo app in `tools/backstage/packages/app`
- Backstage backend in `tools/backstage/packages/backend`
- Public Stemix bundle package in `tools/backstage/packages/stemix`
- Private inline Stemix runtime packages in `tools/backstage/plugins/backstage-stemix*`

## Local commands

```bash
make -C tools/backstage install
make -C tools/backstage build
make -C tools/backstage check-stemix
make -C tools/backstage dev
```

Equivalent Yarn commands:

```bash
cd tools/backstage
corepack enable
yarn install
yarn run build:all
yarn run check:stemix
yarn run dev
```

## Release flow

- PRs touching `tools/backstage/*` trigger the existing `backstage-tools` validation path in `.github/workflows/pr-validate.yml`
- `release-please` versions `tools/backstage/CHANGELOG.md`
- Stemix package versions are synchronized from the `tools/backstage` release
- When Backstage changes are released from `main`, GitHub Actions publishes `@ourchitecture/backstage-plugin-stemix` to GitHub Packages

## Install contract

Install one package:

```bash
yarn add @ourchitecture/backstage-plugin-stemix
```

Use the frontend API from the package root and the backend feature from the
`./backend` subpath:

```ts
import { StemixPage } from '@ourchitecture/backstage-plugin-stemix';
```

```ts
backend.add(import('@ourchitecture/backstage-plugin-stemix/backend'));
```
