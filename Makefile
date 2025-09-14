ifneq (,$(wildcard ./.env))
	include .env
endif

.PHONY: start stop restart tunnel
start:
	@docker compose pull
	@docker compose up -d --remove-orphans --build
stop:
	@docker compose down
restart:
	@make stop
	@make start
tunnel:
	@docker compose -f compose.yaml -f compose.cloudflared.yaml up -d --remove-orphans
