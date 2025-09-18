import { injectable } from 'inversify';
import { ConfigTemplate } from '../types';
import { FileUtils } from '../utils/file';
import { EnvService } from './env-service';

@injectable()
export class ConfigService {
  constructor(
    private fileUtils: FileUtils,
    private envService: EnvService
  ) {}

  generateOverseerrConfig(settingsPath, partialPath): string {
    // Check if files exist
    if (!this.fileUtils.fileExists(settingsPath) || !this.fileUtils.fileExists(partialPath)) {
      console.warn('⚠️  Warning: Overseerr settings files not found, skipping overseerr configuration');
      return '{}';
    }

    try {
      // Read and parse JSON files
      const settings = this.fileUtils.readJsonFile(settingsPath);
      const partial = this.fileUtils.readJsonFile(partialPath);

      // Merge configurations (partial overwrites settings)
      const merged = { ...settings, ...partial };

      // Replace environment variables in the merged config
      let configString = JSON.stringify(merged, null, 2);
      configString = this.envService.subst(configString);

      return configString;
    } catch (error: any) {
      console.error('❌ Error processing Overseerr settings:', error.message);
      return '{}';
    }
  }

  generateConfigFromTemplate(templatePath: string): string {
    const template = this.fileUtils.readTemplate(templatePath);
    return this.envService.subst(template);
  }

  getConfigTemplates(): ConfigTemplate[] {
    return [
      {
        name: 'Jellyseerr',
        content: this.generateOverseerrConfig('jellyseerr/settings.json', 'jellyseerr/settings.json.partial'),
        outputPath: 'jellyseerr/settings.json'
      },
      {
        name: 'Radarr',
        content: this.generateConfigFromTemplate('radarr/config.xml.template'),
        outputPath: 'radarr/config.xml'
      },
      {
        name: 'Sonarr',
        content: this.generateConfigFromTemplate('sonarr/config.xml.template'),
        outputPath: 'sonarr/config.xml'
      },
      {
        name: 'Prowlarr',
        content: this.generateConfigFromTemplate('prowlarr/config.xml.template'),
        outputPath: 'prowlarr/config.xml'
      }
    ];
  }
}
