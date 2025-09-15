FROM node:20-alpine AS build

# Install dependencies
RUN apk add --no-cache bash curl

# Set working directory first
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Build the application
COPY global.d.ts ./
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Final stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package*.json and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from the build stage
COPY --from=build /app/dist ./

# Set entrypoint
ENTRYPOINT ["node", "index.js"]
