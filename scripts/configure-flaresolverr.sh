#!/bin/bash

# Configuration
PROWLARR_URL="http://prowlarr:9696"
PROWLARR_API_KEY="${PROWLARR_API_KEY}"
FlareSolverr_URL="http://FlareSolverr:8191"
TAG_NAME="flaresolver"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Configuring FlareSolverr as indexer proxy in Prowlarr...${NC}"

# Check if Prowlarr is ready (single attempt)
echo -e "${YELLOW}Checking Prowlarr connectivity...${NC}"
if [ -z "$PROWLARR_API_KEY" ]; then
    echo -e "${RED}❌ PROWLARR_API_KEY environment variable is not set. Please export it before running this script.${NC}"
    exit 1
fi
if ! curl -s -f "${PROWLARR_URL}/api/v1/health" -H "X-Api-Key: ${PROWLARR_API_KEY}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Prowlarr is not ready. Please ensure Prowlarr is running and accessible.${NC}"
    exit 1
fi

echo -e "${GREEN}Prowlarr is ready!${NC}"

# Create flaresolver tag first
echo -e "${YELLOW}Creating flaresolver tag...${NC}"
EXISTING_TAGS=$(curl -s "${PROWLARR_URL}/api/v1/tag" -H "X-Api-Key: ${PROWLARR_API_KEY}")


TAG_ID=""
if echo "$EXISTING_TAGS" | grep -q "\"label\": *\"$TAG_NAME\""; then
    # Extract the tag ID for the specific flaresolver tag
    TAG_ID=$(echo "$EXISTING_TAGS" | grep -A 1 "\"label\": *\"$TAG_NAME\"" | grep -o '"id": *[0-9]*' | grep -o '[0-9]*')
    echo -e "${YELLOW}Tag '$TAG_NAME' already exists with ID: $TAG_ID${NC}"
else
    TAG_DATA='{"label":"'$TAG_NAME'"}'
    TAG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${PROWLARR_URL}/api/v1/tag" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: ${PROWLARR_API_KEY}" \
        -d "${TAG_DATA}")

    TAG_HTTP_CODE=$(echo "$TAG_RESPONSE" | tail -n1)
    TAG_RESPONSE_BODY=$(echo "$TAG_RESPONSE" | head -n -1)

    if [ "$TAG_HTTP_CODE" = "201" ] || [ "$TAG_HTTP_CODE" = "200" ]; then
        TAG_ID=$(echo "$TAG_RESPONSE_BODY" | grep -o '"id": *[0-9]*' | grep -o '[0-9]*' | head -1)
        echo -e "${GREEN}✅ Tag '$TAG_NAME' created with ID: $TAG_ID${NC}"
    else
        echo -e "${RED}❌ Failed to create tag (HTTP $TAG_HTTP_CODE)${NC}"
        exit 1
    fi
fi

# Check if FlareSolverr proxy already exists by name or host and upsert
echo -e "${YELLOW}Checking for existing FlareSolverr proxy...${NC}"
EXISTING_PROXIES=$(curl -s "${PROWLARR_URL}/api/v1/indexerproxy" -H "X-Api-Key: ${PROWLARR_API_KEY}")

# Use jq to find existing proxy by name or host URL
PROXY_ID=$(echo "$EXISTING_PROXIES" | jq -r --arg name "FlareSolverr" --arg hostUrl "$FlareSolverr_URL" '
    .[] | select(
        .name == $name or
        (.fields[] | select(.name == "host") | .value) == $hostUrl
    ) | .id'
)

if [ -n "$PROXY_ID" ] && [ "$PROXY_ID" != "null" ]; then
    PROXY_NAME=$(echo "$EXISTING_PROXIES" | jq -r --argjson id "$PROXY_ID" '.[] | select(.id == $id) | .name')

    echo -e "${YELLOW}Found existing proxy '$PROXY_NAME' (ID: $PROXY_ID). Updating...${NC}"

    # Patch existing proxy data instead of rebuilding from scratch
    EXISTING_PROXY_DATA=$(echo "$EXISTING_PROXIES" | jq --argjson id "$PROXY_ID" '.[] | select(.id == $id)')

    UPDATE_DATA=$(echo "$EXISTING_PROXY_DATA" | jq \
        --arg name "FlareSolverr" \
        --arg hostUrl "$FlareSolverr_URL" \
        --argjson timeout 60 \
        --argjson tagId "$TAG_ID" \
        '
        .name = $name |
        .implementation = "FlareSolverr" |
        .configContract = "FlareSolverrSettings" |
        (.fields[] | select(.name == "host") | .value) = $hostUrl |
        (.fields[] | select(.name == "requestTimeout") | .value) = $timeout |
        .tags = (if .tags then (.tags + [$tagId] | unique) else [$tagId] end)
        ')

    UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${PROWLARR_URL}/api/v1/indexerproxy/${PROXY_ID}" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: ${PROWLARR_API_KEY}" \
        -d "${UPDATE_DATA}")

    UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
    UPDATE_RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | head -n -1)

    if [ "$UPDATE_HTTP_CODE" = "202" ] || [ "$UPDATE_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ FlareSolverr proxy updated successfully!${NC}"
        echo -e "${GREEN}Configuration completed!${NC}"
        echo -e "${YELLOW}Tag '$TAG_NAME' (ID: $TAG_ID) has been assigned to FlareSolverr proxy.${NC}"
        echo -e "${YELLOW}Add this tag to indexers that need CloudFlare bypass - they'll automatically use FlareSolverr.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Failed to update FlareSolverr proxy (HTTP $UPDATE_HTTP_CODE)${NC}"
        echo "Response: $UPDATE_RESPONSE_BODY"
        exit 1
    fi
fi

# Create new FlareSolverr proxy with tag (no existing proxy found)
echo -e "${YELLOW}Creating new FlareSolverr proxy with flaresolver tag...${NC}"

# Create FlareSolverr proxy using jq
PROXY_DATA=$(jq -n \
    --arg name "FlareSolverr" \
    --arg implementation "FlareSolverr" \
    --arg configContract "FlareSolverrSettings" \
    --arg hostUrl "$FlareSolverr_URL" \
    --argjson timeout 60 \
    --argjson tagId "$TAG_ID" \
    '{
        "name": $name,
        "implementation": $implementation,
        "configContract": $configContract,
        "fields": [
            {
                "name": "host",
                "value": $hostUrl
            },
            {
                "name": "requestTimeout",
                "value": $timeout
            }
        ],
        "tags": [$tagId]
    }')


RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${PROWLARR_URL}/api/v1/indexerproxy" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: ${PROWLARR_API_KEY}" \
    -d "${PROXY_DATA}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ FlareSolverr proxy created successfully!${NC}"
    echo "Response: $RESPONSE_BODY"
else
    echo -e "${RED}❌ Failed to create FlareSolverr proxy (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo -e "${GREEN}FlareSolverr configuration completed!${NC}"
echo -e "${YELLOW}Tag '$TAG_NAME' (ID: $TAG_ID) has been created and assigned to FlareSolverr proxy.${NC}"
echo -e "${YELLOW}Add this tag to indexers that need CloudFlare bypass - they'll automatically use FlareSolverr.${NC}"
