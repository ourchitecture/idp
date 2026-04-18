#!/bin/bash
set -euo pipefail

TOKEN_NAME=${TOKEN_NAME:-gitlab-harness-root}
TOKEN_VALUE=${GITLAB_HARNESS_ROOT_TOKEN:-gitlab-harness-root-token}
TOKEN_FILE=${TOKEN_FILE:-.secrets/gitlab-harness.token}
COMPOSE=${COMPOSE:-docker compose -f compose.yaml}

mkdir -p .secrets

if ! $COMPOSE ps gitlab >/dev/null 2>&1; then
  echo "GitLab container is not running. Start it with 'make up' first." >&2
  exit 1
fi

SCRIPT="
user = User.find_by_username('root')
token_value = ENV['TOKEN_VALUE']
raise 'Root user missing' unless user
personal = PersonalAccessToken.find_by(name: '${TOKEN_NAME}', user: user)
if personal
  personal.set_token(token_value)
  personal.save!
else
  personal = PersonalAccessToken.new(name: '${TOKEN_NAME}', user: user, scopes: ['api'], expires_at: nil)
  personal.set_token(token_value)
  personal.save!
end
puts token_value
"

TOKEN=$($COMPOSE exec -T gitlab bash -lc "TOKEN_VALUE=$TOKEN_VALUE gitlab-rails runner \"$SCRIPT\"")

if [ -z "$TOKEN" ]; then
  echo "Failed to create or read token" >&2
  exit 1
fi

echo -n "$TOKEN" > "$TOKEN_FILE"
echo "Root token written to $TOKEN_FILE"
