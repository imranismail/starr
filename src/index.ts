#!/usr/bin/env node

import 'reflect-metadata';
import { Command } from 'commander';
import { ConfigGenerator } from './config-generator';
import { ConfigGeneratorOptions } from './types';
import { Container } from 'inversify';
import { EnvService } from './services/env-service';

const container = new Container({
    autoBindInjectable: true,
});

container.bind(EnvService).toDynamicValue(() =>
    new EnvService({
        FLARESOLVERR_URL: process.env.FLARESOLVERR_URL,
        FLARESOLVERR_TAG_NAME: process.env.FLARESOLVERR_TAG_NAME,
        PROWLARR_URL: process.env.PROWLARR_URL,
        PROWLARR_API_KEY: process.env.PROWLARR_API_KEY,
        RADARR_API_KEY: process.env.RADARR_API_KEY,
        SONARR_API_KEY: process.env.SONARR_API_KEY,
    })
);

const program = new Command();

program
  .name('configure')
  .description('Configuration generator for Overseerr, Radarr, Sonarr, Prowlarr, and FlareSolverr')
  .version('1.0.0')
  .option('-a, --apply', 'Apply changes (default: dry run)')
  .option('-c, --config-only', 'Only generate config files, skip FlareSolverr setup')
  .option('-f, --flaresolverr-only', 'Only configure FlareSolverr, skip config generation')
  .action(async (options: ConfigGeneratorOptions) => {
    const generator = container.get(ConfigGenerator);
    generator.initialize(options);
    await generator.run();
  });

program.parse();
