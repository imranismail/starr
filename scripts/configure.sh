#!/usr/bin/env bash

set -eo pipefail

install() {
  local DRY_RUN="false"
  local OVERSEERR_TEMPLATE=""
  local OVERSEERR_OUTPUT="/dev/stdout"
  local RADARR_OUTPUT="/dev/stdout"
  local SERIES_SONARR_OUTPUT="/dev/stdout"
  local ANIME_SONARR_OUTPUT="/dev/stdout"
  local PROWLARR_OUTPUT="/dev/stdout"

  if [ "$1" == "--dry-run" ]; then
    DRY_RUN="true"
  fi

  if [ "$DRY_RUN" == "false" ]; then
    OVERSEERR_OUTPUT="overseerr/settings.json"
    RADARR_OUTPUT="radarr/config.xml"
    SERIES_SONARR_OUTPUT="series-sonarr/config.xml"
    ANIME_SONARR_OUTPUT="anime-sonarr/config.xml"
    PROWLARR_OUTPUT="prowlarr/config.xml"
  fi

  docker compose run --rm overseerr true > /dev/null 2>&1
  OVERSEERR_TEMPLATE=$(jq -s 'reduce .[] as $x ({}; . * $x)' overseerr/settings.json overseerr/settings.json.partial)
  envsubst '$RADARR_API_KEY $SERIES_SONARR_API_KEY $ANIME_SONARR_API_KEY $PROWLARR_API_KEY' <<< "$OVERSEERR_TEMPLATE" > "$OVERSEERR_OUTPUT"

  envsubst '$RADARR_API_KEY' < radarr/config.xml.template > "$RADARR_OUTPUT"
  envsubst '$SERIES_SONARR_API_KEY' < series-sonarr/config.xml.template > "$SERIES_SONARR_OUTPUT"
  envsubst '$ANIME_SONARR_API_KEY' < anime-sonarr/config.xml.template > "$ANIME_SONARR_OUTPUT"
  envsubst '$PROWLARR_API_KEY' < prowlarr/config.xml.template > "$PROWLARR_OUTPUT"
}

install "$@"
