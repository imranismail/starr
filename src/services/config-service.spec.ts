import { Mocked, TestBed } from '@suites/unit';
import { ConfigService } from './config-service';
import { FileUtils } from '../utils/file';
import { EnvService } from './env-service';

describe('ConfigService', () => {
  let configService: ConfigService;
  let fileUtils: Mocked<FileUtils>;
  let envService: Mocked<EnvService>;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(ConfigService).compile();

    configService = unit;
    fileUtils = unitRef.get(FileUtils);
    envService = unitRef.get(EnvService);
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('generateOverseerrConfig', () => {
    test('should generate merged config when both files exist', () => {
      const settings = { setting1: 'value1', setting2: 'old_value' };
      const partial = { setting2: 'new_value', setting3: 'value3' };
      const merged = { setting1: 'value1', setting2: 'new_value', setting3: 'value3' };

      fileUtils.fileExists
        .mockReturnValueOnce(true) // settings.json exists
        .mockReturnValueOnce(true); // settings.json.partial exists

      fileUtils.readJsonFile
        .mockReturnValueOnce(settings)
        .mockReturnValueOnce(partial);

      envService.subst
        .mockReturnValue(JSON.stringify(merged, null, 2));

      const result = configService.generateOverseerrConfig('overseerr/settings.json', 'overseerr/settings.json.partial');

      expect(result).toBe(JSON.stringify(merged, null, 2));
      expect(fileUtils.fileExists).toHaveBeenCalledWith('overseerr/settings.json');
      expect(fileUtils.fileExists).toHaveBeenCalledWith('overseerr/settings.json.partial');
      expect(envService.subst).toHaveBeenCalledWith(
        JSON.stringify(merged, null, 2)
      );
    });

    test('should return empty object and warn when files do not exist', () => {
      fileUtils.fileExists.mockReturnValue(false);

      const result = configService.generateOverseerrConfig('overseerr/settings.json', 'overseerr/settings.json.partial');

      expect(result).toBe('{}');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚠️  Warning: Overseerr settings files not found, skipping overseerr configuration'
      );
    });

    test('should handle JSON parsing errors gracefully', () => {
      fileUtils.fileExists.mockReturnValue(true);
      fileUtils.readJsonFile.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = configService.generateOverseerrConfig('overseerr/settings.json', 'overseerr/settings.json.partial');

      expect(result).toBe('{}');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Error processing Overseerr settings:', 'Invalid JSON');
    });
  });

  describe('generateConfigFromTemplate', () => {
    test('should read template and replace environment variables', () => {
      const templateContent = 'Template with ${RADARR_API_KEY}';
      const processedContent = 'Template with replaced-key';

      fileUtils.readTemplate.mockReturnValue(templateContent);
      envService.subst.mockReturnValue(processedContent);

      const result = configService.generateConfigFromTemplate('template.xml');

      expect(result).toBe(processedContent);
      expect(fileUtils.readTemplate).toHaveBeenCalledWith('template.xml');
      expect(envService.subst).toHaveBeenCalledWith(templateContent);
    });
  });

  describe('getConfigTemplates', () => {
    test('should return all config templates with generated content', () => {
      fileUtils.fileExists.mockReturnValue(true);
      fileUtils.readJsonFile.mockReturnValue({});
      fileUtils.readTemplate
        .mockReturnValueOnce('radarr-template')
        .mockReturnValueOnce('sonarr-template')
        .mockReturnValueOnce('prowlarr-template');

      envService.subst
        .mockReturnValueOnce('{}')
        .mockReturnValueOnce('{}')
        .mockReturnValueOnce('radarr-config')
        .mockReturnValueOnce('sonarr-config')
        .mockReturnValueOnce('prowlarr-config');

      const templates = configService.getConfigTemplates();

      expect(templates).toHaveLength(5);
      expect(templates[0]).toEqual({
        name: 'Overseerr',
        content: '{}',
        outputPath: 'overseerr/settings.json'
      });
      expect(templates[1]).toEqual({
        name: 'Jellyseerr',
        content: '{}',
        outputPath: 'jellyseerr/settings.json'
      });
      expect(templates[2]).toEqual({
        name: 'Radarr',
        content: 'radarr-config',
        outputPath: 'radarr/config.xml'
      });
      expect(templates[3]).toEqual({
        name: 'Sonarr',
        content: 'sonarr-config',
        outputPath: 'sonarr/config.xml'
      });
      expect(templates[4]).toEqual({
        name: 'Prowlarr',
        content: 'prowlarr-config',
        outputPath: 'prowlarr/config.xml'
      });
    });
  });
});
