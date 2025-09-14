FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache bash curl

# Set working directory first
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy main script
COPY index.js ./
RUN chmod +x index.js

ENTRYPOINT ["node", "index.js"]
