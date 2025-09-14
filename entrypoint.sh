#!/bin/bash

set -eou pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration marker files
CONFIG_DIR="/app/.markers"
FILES_MARKER="$CONFIG_DIR/files.done"
FLARESOLVERR_MARKER="$CONFIG_DIR/flaresolverr.done"

# Ensure marker directory exists
mkdir -p "$CONFIG_DIR"

echo -e "${GREEN}Starting configuration process...${NC}"

# Get the command to run (default to full configuration)
COMMAND="${1:-full}"

# Function to check if configuration files need to be generated
need_files_config() {
    # If marker exists and is newer than template files, skip
    if [ -f "$FILES_MARKER" ]; then
        # Check if any template file is newer than marker
        for template in /app/*/config.xml.template /app/overseerr/settings.json.partial; do
            if [ -f "$template" ] && [ "$template" -nt "$FILES_MARKER" ]; then
                echo -e "${BLUE}Template files have changed, regenerating configuration files${NC}"
                return 0
            fi
        done
        echo -e "${BLUE}Configuration files are up to date${NC}"
        return 1
    fi
    return 0
}

# Function to check if Flaresolverr needs configuration
need_flaresolverr_config() {
    # If marker exists and script hasn't changed, skip
    if [ -f "$FLARESOLVERR_MARKER" ]; then
        if [ "/usr/local/bin/configure-flaresolverr.sh" -nt "$FLARESOLVERR_MARKER" ]; then
            echo -e "${BLUE}Flaresolverr configuration script has changed, reconfiguring${NC}"
            return 0
        fi
        echo -e "${BLUE}Flaresolverr configuration is up to date${NC}"
        return 1
    fi
    return 0
}

case "$COMMAND" in
    "full")
        echo -e "${YELLOW}Running full configuration...${NC}"

        # Step 1: Generate config files
        if need_files_config; then
            echo -e "${YELLOW}Step 1: Generating configuration files...${NC}"
            if [ "${DRY_RUN:-false}" = "true" ]; then
                /usr/local/bin/configure.sh --dry-run
            else
                /usr/local/bin/configure.sh --apply
                touch "$FILES_MARKER"
                echo -e "${GREEN}✅ Configuration files generated${NC}"
            fi
        else
            echo -e "${GREEN}⏭️ Configuration files already up to date${NC}"
        fi

        # Step 2: Configure Flaresolverr (only if not dry-run)
        if [ "${DRY_RUN:-false}" != "true" ]; then
            if need_flaresolverr_config; then
                echo -e "${YELLOW}Step 2: Configuring Flaresolverr...${NC}"
                /usr/local/bin/configure-flaresolverr.sh
                touch "$FLARESOLVERR_MARKER"
                echo -e "${GREEN}✅ Flaresolverr configured${NC}"
            else
                echo -e "${GREEN}⏭️ Flaresolverr already configured${NC}"
            fi
        fi

        echo -e "${GREEN}🎉 Full configuration completed successfully!${NC}"
        ;;
    "files")
        if need_files_config || [ "${DRY_RUN:-false}" = "true" ]; then
            echo -e "${YELLOW}Generating configuration files...${NC}"
            if [ "${DRY_RUN:-false}" = "true" ]; then
                /usr/local/bin/configure.sh --dry-run
            else
                /usr/local/bin/configure.sh --apply
                touch "$FILES_MARKER"
                echo -e "${GREEN}✅ Configuration files generated${NC}"
            fi
        else
            echo -e "${GREEN}⏭️ Configuration files already up to date${NC}"
        fi
        ;;
    "flaresolverr")
        if need_flaresolverr_config; then
            echo -e "${YELLOW}Configuring Flaresolverr...${NC}"
            /usr/local/bin/configure-flaresolverr.sh
            touch "$FLARESOLVERR_MARKER"
            echo -e "${GREEN}✅ Flaresolverr configured${NC}"
        else
            echo -e "${GREEN}⏭️ Flaresolverr already configured${NC}"
        fi
        ;;
    "force")
        echo -e "${YELLOW}Forcing full reconfiguration...${NC}"
        rm -f "$FILES_MARKER" "$FLARESOLVERR_MARKER"
        exec "$0" "full"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        echo -e "${YELLOW}Available commands:${NC}"
        echo -e "  full         - Run complete configuration (default, idempotent)"
        echo -e "  files        - Generate config files only (idempotent)"
        echo -e "  flaresolverr - Configure Flaresolverr only (idempotent)"
        echo -e "  force        - Force complete reconfiguration"
        exit 1
        ;;
esac

echo -e "${GREEN}Configuration process completed!${NC}"
