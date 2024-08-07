# Overview

This project provides a comprehensive setup for managing and automating your media download and organization using Radarr, Sonarr, Prowlarr, and Overseer. It is designed to be easy to configure and run, with a focus on providing a unified interface for all your media needs.

The setup process involves generating API keys for each of the applications, setting up your desired hostname, timezone, email address for Let's Encrypt, and specifying the directory for media storage on your host machine. The project uses a Makefile for easy configuration and startup.

Once the setup is complete, you can access the Overseer interface via your specified hostname or `localhost:5055`. From there, you can configure each of the *arr (starr which is what the repo name is inspired from) apps

For users on Windows Subsystem for Linux (WSL), additional configuration for Root Folders/Folder Mapping is required.

I personally use this as my daily driver and will continue to maintain the stack as the starr landscape changes, I aim to reduce the number of steps as much as possible.

# Prerequisites

1. Docker
2. GNU Make (should be installed by default on most unix systems)
3. sed (should be installed by default on most unix systems)
4. bash (should be installed by default on most unix systems)
6. openssl (for generating API keys, you can also just use random string generator)

# Getting Started

1. `cp .env.example .env`
2. Generate API key for each Radarr/Sonarr/Prowlarr apps using `openssl rand -hex 16`
3. Replace `SERIES_SONARR_API_KEY`, `ANIME_SONARR_API_KEY`, `RADARR_API_KEY`, `PROWLARR_API_KEY` with the generated key
4. Replace `HOSTNAME` with your desired public hostname
5. Replace `TIMEZONE` with your timezone
6. Replace `LETSENCRYPT_EMAIL` with your email address
7. Replace `MEDIA_DIR` with path to where you'll be storing media on your host machine
8. Replace `USER_ID` and `GROUP_ID` with your host user id and group id.
9. Run `make configure-test`, verify the config then run `make configure`
10. Run `make start`
11. Visit the `HOSTNAME` or `localhost:5055` and configure `Overseer` using the wizard
12. For each Radarr/Sonarr/Prowlarr apps, configure the `Download Client`, I use `qbittorrent`
13. Configure Root Folders/Folder Mapping if you're using WSL
