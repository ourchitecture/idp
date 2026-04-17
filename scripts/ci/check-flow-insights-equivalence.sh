#!/usr/bin/env bash

set -euo pipefail

make -C stacks/go/net-http/rest check-contract-flow-insights
make -C stacks/nodejs/react-fastify/rest check-contract-flow-insights
