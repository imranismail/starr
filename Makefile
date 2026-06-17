ifneq (,$(wildcard ./.env))
	include .env
endif

.PHONY: start stop restart
start:
	@docker compose -f compose.yaml up -d --remove-orphans --build
stop:
	@docker compose -f compose.yaml down
restart:
	@make stop
	@make start
