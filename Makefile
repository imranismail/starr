ifneq (,$(wildcard ./.env))
	include .env
endif

.PHONY: start stop restart
start:
	@docker compose pull
	@if [ -n "$(CLOUDFLARE_TUNNEL_TOKEN)" ]; then \
		docker compose -f compose.yaml -f compose.cloudflared.yaml up -d --remove-orphans --build; \
	else \
		docker compose -f compose.yaml up -d --remove-orphans --build; \
	fi
stop:
	@if [ -n "$(CLOUDFLARE_TUNNEL_TOKEN)" ]; then \
		docker compose -f compose.yaml -f compose.cloudflared.yaml down; \
	else \
		docker compose -f compose.yaml down; \
	fi
restart:
	@make stop
	@make start
