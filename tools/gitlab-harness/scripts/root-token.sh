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

TOKEN=""
attempt=1
max_attempts=${MAX_ATTEMPTS:-20}
retry_delay=${RETRY_DELAY_SECONDS:-5}
while [ "$attempt" -le "$max_attempts" ]; do
  if OUTPUT=$($COMPOSE exec -T gitlab bash -lc "TOKEN_VALUE=$TOKEN_VALUE gitlab-rails runner \"$SCRIPT\"" 2>&1); then
    TOKEN="$OUTPUT"
    break
  fi

  if printf "%s" "$OUTPUT" | grep -q "Root user missing"; then
    echo "Root user not ready yet (attempt ${attempt}/${max_attempts}); retrying in ${retry_delay}s..."
    sleep "$retry_delay"
    attempt=$((attempt + 1))
    continue
  fi

  echo "$OUTPUT" >&2
  exit 1
done

if [ -z "$TOKEN" ]; then
  echo "Failed to create or read token (root user never became available)" >&2
  exit 1
fi

echo -n "$TOKEN" > "$TOKEN_FILE"
echo "Root token written to $TOKEN_FILE"
