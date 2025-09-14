FROM curlimages/curl:8.4.0

# Install dependencies
USER root
RUN apk add --no-cache bash jq sed
USER curl_user

# Copy configuration scripts
COPY scripts/configure.sh /usr/local/bin/configure.sh
COPY scripts/configure-flaresolverr.sh /usr/local/bin/configure-flaresolverr.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Make scripts executable
USER root
RUN chmod +x /usr/local/bin/configure.sh /usr/local/bin/configure-flaresolverr.sh /usr/local/bin/entrypoint.sh
USER curl_user

# Set working directory to match the expected paths
WORKDIR /app

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
