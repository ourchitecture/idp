#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "${ROOT_DIR}/tools/backstage"

corepack enable
yarn install --immutable
yarn run fix:check
yarn run build:stemix
yarn run typecheck:stemix
yarn run test:stemix
yarn workspace @ourchitecture/backstage-plugin-stemix npm publish --access restricted --tolerate-republish
