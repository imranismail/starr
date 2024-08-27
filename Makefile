ifneq (,$(wildcard ./.env))
	include .env
endif

.PHONY: start stop restart configure-test configure recyclarr
start:
	@docker compose pull
	@docker compose up -d --remove-orphans
	@docker compose run --rm recyclarr sync
sync:
	@docker compose run --rm recyclarr sync
stop:
	@docker compose down
restart:
	@make stop
	@make start
configure-test:
	@RADARR_API_KEY=$(RADARR_API_KEY) SERIES_SONARR_API_KEY=$(SERIES_SONARR_API_KEY) ANIME_SONARR_API_KEY=$(ANIME_SONARR_API_KEY) PROWLARR_API_KEY=$(PROWLARR_API_KEY) scripts/configure.sh --dry-run
configure:
	@RADARR_API_KEY=$(RADARR_API_KEY) SERIES_SONARR_API_KEY=$(SERIES_SONARR_API_KEY) ANIME_SONARR_API_KEY=$(ANIME_SONARR_API_KEY) PROWLARR_API_KEY=$(PROWLARR_API_KEY) scripts/configure.sh --apply
