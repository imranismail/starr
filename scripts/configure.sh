#!/usr/bin/env bash

set -eou pipefail

jq() {
  docker run --rm -i -v "$PWD:$PWD" -w "$PWD" ghcr.io/jqlang/jq:latest "$@"
}

install() {
  local ACTION="${1:---dry-run}"
  local OVERSEERR_TEMPLATE=""
  local OVERSEERR_OUTPUT="/dev/stdout"
  local RADARR_OUTPUT="/dev/stdout"
  local SERIES_SONARR_OUTPUT="/dev/stdout"
  local ANIME_SONARR_OUTPUT="/dev/stdout"
  local PROWLARR_OUTPUT="/dev/stdout"

  if [ "$ACTION" == "--apply" ]; then
    OVERSEERR_OUTPUT="overseerr/settings.json"
    RADARR_OUTPUT="radarr/config.xml"
    SERIES_SONARR_OUTPUT="series-sonarr/config.xml"
    ANIME_SONARR_OUTPUT="anime-sonarr/config.xml"
    PROWLARR_OUTPUT="prowlarr/config.xml"
  fi

  docker compose run --rm overseerr true > /dev/null

  OVERSEERR_TEMPLATE=$(jq -s 'reduce .[] as $x ({}; . * $x)' overseerr/settings.json overseerr/settings.json.partial)

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo "🟢 Would generate overseerr/settings.json"
    echo ""
  fi

  sed -e "s/\${RADARR_API_KEY}/$RADARR_API_KEY/g" \
      -e "s/\${SERIES_SONARR_API_KEY}/$SERIES_SONARR_API_KEY/g" \
      -e "s/\${ANIME_SONARR_API_KEY}/$ANIME_SONARR_API_KEY/g" \
      -e "s/\${PROWLARR_API_KEY}/$PROWLARR_API_KEY/g" \
      <<< "$OVERSEERR_TEMPLATE" > "$OVERSEERR_OUTPUT"

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo "🟢 Would generate radarr/config.xml"
    echo ""
  fi

  sed -e "s/\${RADARR_API_KEY}/$RADARR_API_KEY/g" \
    < radarr/config.xml.template > "$RADARR_OUTPUT"

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo ""
    echo "🟢 Would generate series-sonarr/config.xml"
    echo ""
  fi

  sed -e "s/\${SERIES_SONARR_API_KEY}/$SERIES_SONARR_API_KEY/g" \
    < series-sonarr/config.xml.template > "$SERIES_SONARR_OUTPUT"

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo ""
    echo "🟢 Would generate anime-sonarr/config.xml"
    echo ""
  fi

  sed -e "s/\${ANIME_SONARR_API_KEY}/$ANIME_SONARR_API_KEY/g" \
    < anime-sonarr/config.xml.template > "$ANIME_SONARR_OUTPUT"

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo ""
    echo "🟢 Would generate prowlarr/config.xml"
    echo ""
  fi

  sed -e "s/\${PROWLARR_API_KEY}/$PROWLARR_API_KEY/g" \
    < prowlarr/config.xml.template > "$PROWLARR_OUTPUT"

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo ""
    echo "🟢 Config generated successfully"
  fi
}

install "$@"
