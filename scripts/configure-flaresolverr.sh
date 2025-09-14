#!/bin/bash

# Configuration
PROWLARR_URL="http://localhost:9696/prowlarr"
PROWLARR_API_KEY="${PROWLARR_API_KEY}"
FLARESOLVERR_URL="http://flaresolverr:8191"
TAG_NAME="flaresolver"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Configuring Flaresolverr as indexer proxy in Prowlarr...${NC}"

# Wait for Prowlarr to be ready
echo -e "${YELLOW}Waiting for Prowlarr to be ready...${NC}"
until curl -s -f "${PROWLARR_URL}/api/v1/system/status" -H "X-Api-Key: ${PROWLARR_API_KEY}" > /dev/null 2>&1; do
    echo "Prowlarr not ready, waiting 5 seconds..."
    sleep 5
done

echo -e "${GREEN}Prowlarr is ready!${NC}"

# Additional wait to ensure Prowlarr is fully initialized
echo -e "${YELLOW}Waiting additional 5 seconds for Prowlarr to fully initialize...${NC}"
sleep 5

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

# Check if Flaresolverr proxy already exists and has the correct tag
echo -e "${YELLOW}Checking for existing Flaresolverr proxy...${NC}"
EXISTING_PROXIES=$(curl -s "${PROWLARR_URL}/api/v1/indexerproxy" -H "X-Api-Key: ${PROWLARR_API_KEY}")

# Check if we already have a properly configured Flaresolverr proxy
if echo "$EXISTING_PROXIES" | grep -q '"name":"Flaresolverr"'; then
    # Check if it has the correct tag
    if echo "$EXISTING_PROXIES" | grep -A 30 '"name":"Flaresolverr"' | grep -q "$TAG_ID"; then
        echo -e "${GREEN}✅ Flaresolverr proxy already exists with correct tag!${NC}"
        echo -e "${GREEN}Configuration completed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}Flaresolverr proxy exists but without correct tag. Updating...${NC}"
        # Get the ID and update it with the tag
        PROXY_ID=$(echo "$EXISTING_PROXIES" | sed 's/},{/}\n{/g' | grep -A 20 '"name":"Flaresolverr"' | grep '"id":' | head -1 | grep -o '[0-9]*')
        if [ ! -z "$PROXY_ID" ]; then
            echo "Updating existing Flaresolverr proxy (ID: $PROXY_ID) with flaresolver tag..."

            # Update the existing proxy with the tag
            UPDATE_DATA='{
                "name": "Flaresolverr",
                "implementation": "FlareSolverr",
                "configContract": "FlareSolverrSettings",
                "fields": [
                    {
                        "name": "host",
                        "value": "'"${FLARESOLVERR_URL}"'"
                    },
                    {
                        "name": "requestTimeout",
                        "value": 60
                    }
                ],
                "tags": ['$TAG_ID'],
                "id": '$PROXY_ID'
            }'

            UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${PROWLARR_URL}/api/v1/indexerproxy/${PROXY_ID}" \
                -H "Content-Type: application/json" \
                -H "X-Api-Key: ${PROWLARR_API_KEY}" \
                -d "${UPDATE_DATA}")

            UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
            UPDATE_RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | head -n -1)

            if [ "$UPDATE_HTTP_CODE" = "202" ] || [ "$UPDATE_HTTP_CODE" = "200" ]; then
                echo -e "${GREEN}✅ Flaresolverr proxy updated successfully with tag!${NC}"
                echo -e "${GREEN}Configuration completed!${NC}"
                echo -e "${YELLOW}Tag '$TAG_NAME' (ID: $TAG_ID) has been assigned to existing Flaresolverr proxy.${NC}"
                echo -e "${YELLOW}Add this tag to indexers that need CloudFlare bypass - they'll automatically use Flaresolverr.${NC}"
                exit 0
            else
                echo -e "${RED}❌ Failed to update Flaresolverr proxy (HTTP $UPDATE_HTTP_CODE)${NC}"
                echo "Response: $UPDATE_RESPONSE_BODY"
                exit 1
            fi
        fi
    fi
fi

# Create new Flaresolverr proxy with tag (only if none existed)
echo -e "${YELLOW}Creating new Flaresolverr proxy with flaresolver tag...${NC}"

# Create Flaresolverr proxy
PROXY_DATA='{
    "name": "Flaresolverr",
    "implementation": "FlareSolverr",
    "configContract": "FlareSolverrSettings",
    "fields": [
        {
            "name": "host",
            "value": "'"${FLARESOLVERR_URL}"'"
        },
        {
            "name": "requestTimeout",
            "value": 60
        }
    ],
    "tags": ['$TAG_ID']
}'


RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${PROWLARR_URL}/api/v1/indexerproxy" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: ${PROWLARR_API_KEY}" \
    -d "${PROXY_DATA}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Flaresolverr proxy created successfully!${NC}"
    echo "Response: $RESPONSE_BODY"
else
    echo -e "${RED}❌ Failed to create Flaresolverr proxy (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo -e "${GREEN}Flaresolverr configuration completed!${NC}"
echo -e "${YELLOW}Tag '$TAG_NAME' (ID: $TAG_ID) has been created and assigned to Flaresolverr proxy.${NC}"
echo -e "${YELLOW}Add this tag to indexers that need CloudFlare bypass - they'll automatically use Flaresolverr.${NC}"