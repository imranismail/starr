import { inject, injectable } from 'inversify';
import { ConfigGeneratorOptions, FlaresolverrConfig } from './types';
import { EnvService } from './services/env-service';
import { FileUtils } from './utils/file';
import { ConfigService } from './services/config-service';
import { FlaresolverrService } from './services/flaresolverr-service';

@injectable()
export class ConfigGenerator {
  private isDryRun: boolean;
  private configOnly: boolean;
  private flaresolverrOnly: boolean;
  private requiredEnvVars: string[];
  private proxyEnvVars: string[];

  constructor(
    private envService: EnvService,
    private fileUtils: FileUtils,
    private configService: ConfigService,
    private flaresolverrService: FlaresolverrService
  ) {
    this.isDryRun = true;
    this.configOnly = false;
    this.flaresolverrOnly = false;
    this.requiredEnvVars = ['RADARR_API_KEY', 'SONARR_API_KEY', 'PROWLARR_API_KEY'];
    this.proxyEnvVars = ['PROWLARR_API_KEY'];
  }

  initialize(options: ConfigGeneratorOptions = {}): void {
    this.isDryRun = !options.apply;
    this.configOnly = options.configOnly || false;
    this.flaresolverrOnly = options.flaresolverrOnly || false;
  }

  checkEnvironmentVariables(): void {
    const neededVars = this.getRequiredEnvironmentVariables();
    this.envService.ensure(neededVars);
  }

  private getRequiredEnvironmentVariables(): string[] {
    const vars = new Set<string>();

    // Add config generation variables
    if (!this.flaresolverrOnly) {
      this.requiredEnvVars.forEach(v => vars.add(v));
    }

    // Add proxy setup variables
    if (!this.configOnly) {
      this.proxyEnvVars.forEach(v => vars.add(v));
    }

    return Array.from(vars);
  }

  private async generateConfigurations(): Promise<void> {
    if (this.flaresolverrOnly) {
      return;
    }

    const configs = this.configService.getConfigTemplates();

    // Process each configuration
    configs.forEach(config => {
      if (config.content) {
        this.fileUtils.writeConfigFile(config.content, config.outputPath, this.isDryRun);
      }
    });
  }

  private async configureFlareSolverr(): Promise<void> {
    if (this.configOnly) {
      return;
    }

    const apiKey = process.env.PROWLARR_API_KEY;
    if (!apiKey) {
      throw new Error('PROWLARR_API_KEY is required for FlareSolverr configuration');
    }

    await this.flaresolverrService.configureFlareSolverr(this.isDryRun);
  }

  async run(): Promise<void> {
    console.log('🚀 Configuration Generator Starting...\n');

    this.checkEnvironmentVariables();

    if (this.isDryRun) {
      console.log('📋 Dry Run Mode - No changes will be applied');
      console.log('Use --apply to actually make changes\n');
    }

    let hasErrors = false;

    try {
      // Generate configurations
      await this.generateConfigurations();

      // Configure FlareSolverr with error handling
      await this.configureFlareSolverr();

    } catch (error: any) {
      console.error('❌ FlareSolverr configuration failed, but continuing...');
      hasErrors = true;
    }

    if (this.isDryRun) {
      console.log('\n📝 Dry run completed. Use --apply to make actual changes.');
    } else if (hasErrors) {
      console.log('\n⚠️  Configuration completed with some errors. Check logs above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Configuration completed successfully!');
    }
  }
}
