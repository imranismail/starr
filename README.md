
# Getting Started

1. `cp .env.example .env`
2. Generate API key for each Radarr/Sonarr/Prowlarr apps using `openssl rand -hex 16`
3. Replace `SERIES_SONARR_API_KEY`, `ANIME_SONARR_API_KEY`, `RADARR_API_KEY`, `PROWLARR_API_KEY` with the generated key
4. Replace `HOSTNAME` with your desired public hostname
5. Replace `TIMEZONE` with your timezone
6. Replace `LETSENCRYPT_EMAIL` with your email address
7. Replace `MEDIA_DIR` with path to where you'll be storing media on your host machine
8. Run `make configure-test`, verify the config then run `make configure`
9. Run `make start`
10. Visit the `HOSTNAME` or `localhost:5055` and configure `Overseer` using the wizard
11. For each Radarr/Sonarr/Prowlarr apps, configure the `Download Client`, I use `qbittorrent`
12. Configure Root Folders/Folder Mapping if you're using WSL
