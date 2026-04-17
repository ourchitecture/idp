COMPOSE := docker compose -f compose.yaml

.PHONY: up down reset logs wait-healthy seed token ensure-dirs

up: ensure-dirs
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

reset: down
	rm -rf ./data

logs:
	$(COMPOSE) logs -f

wait-healthy:
	@bash ./scripts/wait-healthy.sh

seed:
	@bash ./seed/seed-all.sh

token:
	@bash ./scripts/root-token.sh

ensure-dirs:
	@mkdir -p ./data/logs ./data/data ./data/runner ./scripts
