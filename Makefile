ifneq (,$(wildcard ./.env))
	include .env
endif

.PHONY: start stop restart
start:
	@docker compose pull
	@docker compose up -d --remove-orphans --build
stop:
	@docker compose down
restart:
	@make stop
	@make start
