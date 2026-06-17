import { FlaresolverrService } from './flaresolverr-service';
import { ProwlarrService } from './prowlarr-service';
import { EnvService } from './env-service';
import { TestBed, Mocked } from '@suites/unit';

describe('FlaresolverrService', () => {
  let flaresolverrService: FlaresolverrService;
  let prowlarrService: Mocked<ProwlarrService>;
  let envService: Mocked<EnvService>;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  const envVars: Record<string, string> = {
    'FLARESOLVERR_URL': 'http://test-flaresolverr:8191',
    'FLARESOLVERR_TAG_NAME': 'test-flaresolver'
  };

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(FlaresolverrService)
      .mock(EnvService)
      .impl(
        (stubFn) => ({
          get: stubFn().mockImplementation((key: string) => envVars[key])
        })
      )
      .compile();

    flaresolverrService = unit;
    prowlarrService = unitRef.get(ProwlarrService);
    envService = unitRef.get(EnvService);

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('constructor', () => {
    test('should initialize with correct configuration from environment variables', () => {
      expect(envService.get).toHaveBeenCalledWith('FLARESOLVERR_URL');
      expect(envService.get).toHaveBeenCalledWith('FLARESOLVERR_TAG_NAME');
    });

    test('should use default values when environment variables are not set', async () => {
      const envServiceWithDefaults = {
        get: jest.fn().mockReturnValue(undefined)
      };

      await TestBed.solitary(FlaresolverrService)
        .mock(EnvService)
        .impl(() => envServiceWithDefaults)
        .compile();

      expect(envServiceWithDefaults.get).toHaveBeenCalledWith('FLARESOLVERR_URL');
      expect(envServiceWithDefaults.get).toHaveBeenCalledWith('FLARESOLVERR_TAG_NAME');
    });
  });

  describe('configureFlareSolverr', () => {
    test('should configure FlareSolverr successfully', async () => {
      const mockTagId = 123;
      prowlarrService.waitForService.mockResolvedValue(true);
      prowlarrService.ensureProxyTag.mockResolvedValue(mockTagId);
      prowlarrService.createOrUpdateProxy.mockResolvedValue();

      await flaresolverrService.configureFlareSolverr();

      expect(mockConsoleLog).toHaveBeenCalledWith('🔧 Configuring FlareSolverr as indexer proxy in Prowlarr...');
      expect(prowlarrService.waitForService).toHaveBeenCalled();
      expect(prowlarrService.ensureProxyTag).toHaveBeenCalledWith('test-flaresolver');
      expect(prowlarrService.createOrUpdateProxy).toHaveBeenCalledWith('http://test-flaresolverr:8191', mockTagId);
      expect(mockConsoleLog).toHaveBeenCalledWith(`🏷️  Tag 'test-flaresolver' (ID: ${mockTagId}) is assigned to FlareSolverr proxy.`);
      expect(mockConsoleLog).toHaveBeenCalledWith('💡 Add this tag to indexers that need CloudFlare bypass.');
    });

    test('should handle dry run mode', async () => {
      await flaresolverrService.configureFlareSolverr(true);

      expect(mockConsoleLog).toHaveBeenCalledWith('🔧 Configuring FlareSolverr as indexer proxy in Prowlarr...');
      expect(mockConsoleLog).toHaveBeenCalledWith('📋 Dry Run Mode - Would configure FlareSolverr proxy');
      expect(prowlarrService.waitForService).not.toHaveBeenCalled();
      expect(prowlarrService.ensureProxyTag).not.toHaveBeenCalled();
      expect(prowlarrService.createOrUpdateProxy).not.toHaveBeenCalled();
    });

    test('should handle errors and log them', async () => {
      const error = new Error('Connection failed');
      prowlarrService.waitForService.mockRejectedValue(error);

      await expect(flaresolverrService.configureFlareSolverr()).rejects.toThrow('Connection failed');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to configure FlareSolverr:', 'Connection failed');
    });

    test('should handle tag creation failure', async () => {
      const error = new Error('Tag creation failed');
      prowlarrService.waitForService.mockResolvedValue(true);
      prowlarrService.ensureProxyTag.mockRejectedValue(error);

      await expect(flaresolverrService.configureFlareSolverr()).rejects.toThrow('Tag creation failed');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to configure FlareSolverr:', 'Tag creation failed');
    });

    test('should handle proxy creation failure', async () => {
      const error = new Error('Proxy creation failed');
      const mockTagId = 123;
      prowlarrService.waitForService.mockResolvedValue(true);
      prowlarrService.ensureProxyTag.mockResolvedValue(mockTagId);
      prowlarrService.createOrUpdateProxy.mockRejectedValue(error);

      await expect(flaresolverrService.configureFlareSolverr()).rejects.toThrow('Proxy creation failed');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to configure FlareSolverr:', 'Proxy creation failed');
    });
  });

  describe('ensureProwlarrReady', () => {
    test('should check Prowlarr connectivity and log success', async () => {
      prowlarrService.waitForService.mockResolvedValue(true);

      await flaresolverrService['ensureProwlarrReady']();

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Checking Prowlarr connectivity...');
      expect(prowlarrService.waitForService).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Prowlarr is ready!');
    });

    test('should propagate errors from waitForService', async () => {
      const error = new Error('Service unavailable');
      prowlarrService.waitForService.mockRejectedValue(error);

      await expect(flaresolverrService['ensureProwlarrReady']()).rejects.toThrow('Service unavailable');

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Checking Prowlarr connectivity...');
      expect(prowlarrService.waitForService).toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalledWith('✅ Prowlarr is ready!');
    });
  });
});