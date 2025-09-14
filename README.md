# Overview

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
