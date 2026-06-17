# Starr Media Automation Stack

[![CI](https://github.com/imranismail/starr/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/imranismail/starr/actions/workflows/ci.yml)

A Docker-based media automation stack — a "smart home theater assistant" that automatically finds, downloads, and organizes your TV shows and movies, fronted by a Netflix-like request portal.

You tell it what you want to watch; it searches multiple sources, downloads the files, renames and sorts them into your library, and makes them available to stream.

## How it works

1. **Request** — You request a movie or show through the seerr web portal.
2. **Search** — Prowlarr searches across multiple indexers (with FlareSolverr bypassing Cloudflare challenges).
3. **Download** — qBittorrent grabs the files.
4. **Organize** — Sonarr (TV) and Radarr (movies) rename and sort files into your library, with quality profiles managed by Recyclarr.
5. **Watch** — Plex serves your library to any device.

A one-shot **config generator** (the TypeScript app in [`src/`](src/)) bootstraps all the *arr apps from templated config files on startup, so the stack comes up pre-wired with API keys, indexers, and a FlareSolverr proxy — no manual clicking through setup wizards.

## Services

| Service | Image | Port | Purpose |
| --- | --- | --- | --- |
| **Seerr** | `ghcr.io/seerr-team/seerr` | `5056` | Request portal / main web UI |
| **Sonarr** | `lscr.io/linuxserver/sonarr` | `8989` | TV show management & organization |
| **Radarr** | `lscr.io/linuxserver/radarr` | `7878` | Movie management & organization |
| **Prowlarr** | `lscr.io/linuxserver/prowlarr` | `9696` | Indexer manager / search aggregator |
| **qBittorrent** | `lscr.io/linuxserver/qbittorrent` | `8080` | Download client |
| **FlareSolverr** | `ghcr.io/flaresolverr/flaresolverr` | `8191` | Cloudflare challenge solver for indexers |
| **Recyclarr** | `recyclarr/recyclarr` | — | Syncs quality profiles & custom formats into Sonarr/Radarr |
| **Plex** | `lscr.io/linuxserver/plex` | host network | Media server / streaming |
| **cloudflared** | `cloudflare/cloudflared` | — | Optional Cloudflare Tunnel for secure remote access |
| **config** | built from [`Dockerfile`](Dockerfile) | — | One-shot config generator (runs on startup, then exits) |

## Prerequisites

1. Docker (with Compose)
2. GNU Make (preinstalled on most Unix systems)
3. `openssl` (for generating API keys — any random string generator works too)

## Getting started

1. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```
2. Generate an API key for each of Sonarr, Radarr, and Prowlarr:
   ```sh
   openssl rand -hex 16
   ```
3. Edit `.env` and set the values (see [Configuration](#configuration) below):
   - `SONARR_API_KEY`, `RADARR_API_KEY`, `PROWLARR_API_KEY` — the keys you generated
   - `TIMEZONE` — your timezone (e.g. `Pacific/Auckland`)
   - `MEDIA_DIR` — host path where your media is stored
   - `PUID` / `PGID` — your host user and group IDs (run `id` to find them)
   - `PLEX_CLAIM` — claim token from <https://www.plex.tv/claim> (optional)
   - `DNS_ZONE` / `CLOUDFLARE_TUNNEL_TOKEN` — only if exposing services (see below)
4. Start the stack:
   ```sh
   make start
   ```
   On startup, the `config` service generates and applies configuration for the *arr apps and registers FlareSolverr as a proxy in Prowlarr.
5. Open <http://localhost:5056> and complete the seerr setup wizard.
6. In each of Sonarr / Radarr / Prowlarr, configure the **Download Client** (e.g. qBittorrent).
7. Configure **Root Folders** / folder mappings (especially if you're on WSL).

### Make commands

| Command | Action |
| --- | --- |
| `make start` | Build and start the stack in the background |
| `make stop` | Stop and remove the stack |
| `make restart` | Stop, then start again |

## Configuration

All settings live in `.env`:

| Variable | Description |
| --- | --- |
| `PUID` / `PGID` | Host user and group IDs that own mounted files |
| `TIMEZONE` | IANA timezone (e.g. `Pacific/Auckland`) |
| `LOG_LEVEL` | Log verbosity for the services (e.g. `info`, `debug`) |
| `MEDIA_DIR` | Host path mounted into the apps as `/data` |
| `SONARR_API_KEY` | API key for Sonarr |
| `RADARR_API_KEY` | API key for Radarr |
| `PROWLARR_API_KEY` | API key for Prowlarr |
| `PLEX_CLAIM` | Plex claim token for linking the server to your account |
| `DNS_ZONE` | Your domain, used for Cloudflare Tunnel hostnames |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token for the Cloudflare Tunnel (remote access) |

### How the config generator works

The `config` service runs the TypeScript app in [`src/`](src/) once on startup. It:

- Reads `*.config.xml.template` files for Radarr, Sonarr, and Prowlarr, substitutes `${VAR}` placeholders from the environment, and writes the resulting `config.xml`.
- Merges `seerr/settings.json.partial` into `seerr/settings.json` with env substitution.
- Registers FlareSolverr as a proxy/indexer tag in Prowlarr via its API.

Quality profiles and custom formats are managed separately by **Recyclarr** using [`recyclarr/recyclarr.yml`](recyclarr/recyclarr.yml).

## Exposing services (Cloudflare Tunnel)

The optional `cloudflared` service lets you reach the stack securely from anywhere without opening ports.

1. Follow the [Cloudflare guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/#1-create-a-tunnel) to create a tunnel.
2. Set `CLOUDFLARE_TUNNEL_TOKEN` (and `DNS_ZONE`) in `.env`.
3. Run `make start` — the tunnel comes up alongside the stack and can resolve service names (`seerr`, `sonarr`, `radarr`, `prowlarr`).
4. In **Cloudflare Zero Trust → Access → Applications**, map public hostnames to internal services:
   - `seerr.${DNS_ZONE}` → `http://seerr:5056`
   - `sonarr.${DNS_ZONE}` → `http://sonarr:8989`
   - `radarr.${DNS_ZONE}` → `http://radarr:7878`
   - `prowlarr.${DNS_ZONE}` → `http://prowlarr:9696`
5. Secure each application with an authentication method (Google/GitHub OAuth, one-time PIN, etc.).
6. Add policies to restrict access (e.g. specific email domains, emails, or IP ranges).

You can then reach your apps via the Cloudflare Access App Launcher or directly at the hostnames you configured.

## Development

The config generator is a standalone TypeScript CLI. To work on it locally:

```sh
npm install
npm run dev                     # dry run (no changes applied)
npm run configure:apply         # apply changes
npm run configure:config-only   # only generate config files
npm run configure:flaresolverr-only  # only configure FlareSolverr
npm test                        # run the test suite
npm run lint                    # type-check
```

See [.github/WORKFLOWS.md](.github/WORKFLOWS.md) for CI details.
