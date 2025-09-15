# Starr Media Automation Stack

[![CI](https://github.com/imranismail/starr/actions/workflows/ci.yml/badge.svg)](https://github.com/imranismail/starr/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/imranismail/starr/branch/master/graph/badge.svg)](https://codecov.io/gh/imranismail/starr)

## Overview

This repository is a media automation stack that helps people automatically download and organize their TV shows and movies.

Think of this as a "smart home theater assistant" that:

1. Finds content - Automatically searches for TV shows and movies you want across various sources on the internet
2. Downloads content - Grabs the files when they become available
3. Organizes everything - Sorts and renames files properly so your media library stays neat and organized
4. Provides a nice interface - Gives you a web dashboard where you can request shows/movies and see what's available

What it includes:
- Overseerr - The main interface where you request movies/TV shows
- Sonarr - Manages TV show downloads and organization
- Radarr - Manages movie downloads and organization
- Prowlarr - Searches across multiple sources to find content
- qBittorrent - Downloads the actual files

In simple terms: Instead of manually searching for and downloading shows/movies yourself, you just tell this system what you want to watch, and it automatically finds, downloads, and organizes everything for you. You access it through a web browser like Netflix, but for your personal collection.

The repository provides an easy Docker-based setup that runs all these applications together with minimal configuration required.

# Prerequisites

1. Docker
2. GNU Make (should be installed by default on most unix systems)
3. openssl (for generating API keys, you can also just use random string generator)

# Getting Started

- `cp .env.example .env`
- Generate API key for each Radarr/Sonarr/Prowlarr apps using `openssl rand -hex 16`
- Replace `SONARR_API_KEY`, `RADARR_API_KEY`, `PROWLARR_API_KEY` with the generated key
- Replace `TIMEZONE` with your timezone
- Replace `MEDIA_DIR` with path to where you'll be storing media on your host machine
- Replace `USER_ID` and `GROUP_ID` with your host user id and group -
- Run `make start`
- Visit the `HOSTNAME` or `localhost:5055` and configure `Overseer` using the wizard
- For each Radarr/Sonarr/Prowlarr apps, configure the `Download Client`, I use `qbittorrent`
- Configure Root Folders/Folder Mapping if you're using WSL

# Exposing Services

- Follow [this guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/#1-create-a-tunnel) to setup Cloudflare Tunnel
- Replace `CLOUDFLARE_TUNNEL_TOKEN` with your Cloudflare Tunnel token
- Run `make tunnel` to start the tunnel
- Configure Cloudflare Access to enable zero-trust access to your services

# Configuration Generator

The repository includes a modern TypeScript-based configuration generator with dependency injection that automates the setup of configuration files and FlareSolverr proxy integration.

## Features

- **Modern Architecture**: Built with TypeScript, Inversify DI, and Axios HTTP client
- **Dependency Injection**: Clean architecture with Inversify IoC container
- **Type Safety**: Full TypeScript implementation with strict typing
- **Advanced Testing**: Jest with enhanced mocking using @golevelup/ts-jest and Suites
- **HTTP Client**: Axios-based client with interceptors and retry logic

## Development

```bash
# Install dependencies
npm install

# Run in development mode (dry run)
npm run configure

# Apply changes
npm run configure:apply

# Config files only (skip FlareSolverr setup)
npm run configure:config-only

# FlareSolverr setup only (skip config generation)
npm run configure:flaresolverr-only

# Build for production
npm run build

# Run built version
npm start
```

## Testing

The configuration generator includes comprehensive Jest tests with modern mocking:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci

# Type checking
npm run lint
```

## Project Structure

```
src/
├── index.ts                    # CLI entry point with DI container
├── configGenerator.ts          # Main configuration generator class
├── types.ts                    # TypeScript type definitions
├── container/
│   ├── container.ts           # Inversify IoC container configuration
│   └── types.ts               # DI symbols and types
├── services/
│   ├── configService.ts        # Configuration file generation
│   └── flaresolverrService.ts  # FlareSolverr proxy management
├── utils/
│   ├── environment.ts          # Environment variable handling
│   ├── file.ts                 # File system utilities
│   └── http.ts                 # Axios HTTP client with interceptors
└── __tests__/                  # Enhanced Jest test files with DI mocking
```

## Modern Technologies Used

- **TypeScript**: Strict typing with decorators and metadata
- **Inversify**: Dependency injection container
- **Axios**: HTTP client with interceptors and request/response handling
- **Jest**: Testing framework with enhanced mocking capabilities
- **@golevelup/ts-jest**: Type-safe mock creation
- **Suites**: Advanced testing utilities for dependency injection
- **Babel**: TypeScript transpilation with decorator support

## Continuous Integration

This project uses GitHub Actions for comprehensive CI/CD:

### 🔄 **Workflows**

- **CI Pipeline** (`ci.yml`): Full test suite across multiple OS and Node.js versions
- **Development Checks** (`dev.yml`): Fast feedback for development branches and PRs
- **Maintenance** (`maintenance.yml`): Weekly dependency audits and coverage reports
- **Release** (`release.yml`): Automated releases with artifacts

### 🧪 **Testing Matrix**

- **Operating Systems**: Ubuntu, Windows, macOS
- **Node.js Versions**: 18, 20, 22
- **Test Coverage**: Automatically reported to Codecov
- **Security Audits**: Regular dependency vulnerability checks

### 📦 **Automated Dependency Management**

- **Dependabot**: Weekly dependency updates with intelligent grouping
- **Security Monitoring**: Automated vulnerability scanning
- **PR Automation**: Grouped updates for related packages
