ifneq (,$(wildcard ./.env))
	include .env
endif

.PHONY: start stop restart configure-test configure recyclarr configure-flaresolverr
start:
	@docker compose pull
	@docker compose up -d --remove-orphans
	@sleep 10 && PROWLARR_API_KEY=$(PROWLARR_API_KEY) scripts/configure-flaresolverr.sh
	@docker compose run --rm recyclarr sync
sync:
	@docker compose run --rm recyclarr sync
stop:
	@docker compose down
restart:
	@make stop
	@make start
configure-test:
	@RADARR_API_KEY=$(RADARR_API_KEY) SONARR_API_KEY=$(SONARR_API_KEY) PROWLARR_API_KEY=$(PROWLARR_API_KEY) scripts/configure.sh --dry-run
configure:
	@RADARR_API_KEY=$(RADARR_API_KEY) SONARR_API_KEY=$(SONARR_API_KEY) PROWLARR_API_KEY=$(PROWLARR_API_KEY) scripts/configure.sh --apply
configure-flaresolverr:
	@PROWLARR_API_KEY=$(PROWLARR_API_KEY) scripts/configure-flaresolverr.sh
