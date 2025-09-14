#!/usr/bin/env bash

set -eou pipefail

# jq is now installed in the container

install() {
  local ACTION="${1:---dry-run}"
  local OVERSEERR_TEMPLATE=""
  local OVERSEERR_OUTPUT="/dev/stdout"
  local RADARR_OUTPUT="/dev/stdout"
  local SONARR_OUTPUT="/dev/stdout"
  local PROWLARR_OUTPUT="/dev/stdout"

  if [ "$ACTION" == "--apply" ]; then
    OVERSEERR_OUTPUT="overseerr/settings.json"
    RADARR_OUTPUT="radarr/config.xml"
    SONARR_OUTPUT="sonarr/config.xml"
    PROWLARR_OUTPUT="prowlarr/config.xml"
  fi

  # Check if required files exist
  if [ ! -f "overseerr/settings.json" ] || [ ! -f "overseerr/settings.json.partial" ]; then
    echo "Warning: Overseerr settings files not found, skipping overseerr configuration"
    OVERSEERR_TEMPLATE="{}"
  else
    OVERSEERR_TEMPLATE=$(jq -s 'reduce .[] as $x ({}; . * $x)' overseerr/settings.json overseerr/settings.json.partial)
  fi

  if [ "$ACTION" == "--dry-run" ]; then
    echo ""
    echo "🟢 Would generate overseerr/settings.json"
    echo ""
  fi

  sed -e "s/\${RADARR_API_KEY}/$RADARR_API_KEY/g" \
      -e "s/\${SONARR_API_KEY}/$SONARR_API_KEY/g" \
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

  sed -e "s/\${SONARR_API_KEY}/$SONARR_API_KEY/g" \
    < sonarr/config.xml.template > "$SONARR_OUTPUT"

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
