import axios from 'axios';
import { ProwlarrService } from './prowlarr-service';
import { TestBed, Mocked } from '@suites/unit';
import { EnvService } from './env-service';


jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('ProwlarrService', () => {
  let prowlarrService: ProwlarrService;
  let mockConsoleLog: jest.SpyInstance;
  const envVars: Record<string, string> = {
    'PROWLARR_API_KEY': 'test-api-key',
    'PROWLARR_URL': 'http://test-prowlarr:9696'
  };

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue(mockedAxios);
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

    const { unit } = await TestBed.solitary(ProwlarrService)
      .mock(EnvService)
      .impl(
        (stubFn) => ({
          get: stubFn().mockImplementation((key: string) => envVars[key])
        })
      )
      .compile();

    prowlarrService = unit;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('constructor', () => {
    test('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test-prowlarr:9696',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'test-api-key',
        },
        timeout: 30000,
      });

      expect(mockedAxios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('request', () => {
    test('should make successful request and return data', async () => {
      const responseData = { success: true, data: 'test' };
      mockedAxios.request.mockResolvedValue({ data: responseData });

      const result = await prowlarrService.request('/api');

      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api'
      });
      expect(result).toEqual(responseData);
    });

    test('should make request with custom options', async () => {
      const responseData = { id: 1, name: 'test' };
      mockedAxios.request.mockResolvedValue({ data: responseData });

      const options = {
        method: 'POST',
        data: { test: 'data' },
        params: { id: 1 }
      };

      await prowlarrService.request('/api', options);

      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api',
        method: 'POST',
        data: { test: 'data' },
        params: { id: 1 }
      });
    });

    test('should handle axios errors properly', async () => {
      const axiosError = new Error('Network Error');
      mockedAxios.request.mockRejectedValue(axiosError);

      await expect(prowlarrService.request('/api'))
        .rejects.toThrow('Network Error');
    });
  });

  describe('waitForService', () => {
    test('should return true when service is ready immediately', async () => {
      const responseData = { status: 'healthy' };
      mockedAxios.request.mockResolvedValue({ data: responseData });

      const result = await prowlarrService.waitForService();

      expect(result).toBe(true);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/health'
      });
    });

    test('should retry and succeed on second attempt', async () => {
      const connectionError = new Error('Connection failed');
      const responseData = { status: 'healthy' };

      mockedAxios.request
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce({ data: responseData });

      // Use short delay for testing
      const result = await prowlarrService.waitForService(2, 1);

      expect(result).toBe(true);
      expect(mockedAxios.request).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith('⏳ Waiting for service (attempt 1/2)...');
    });

    test('should throw error after max attempts', async () => {
      const connectionError = new Error('Connection failed');
      mockedAxios.request.mockRejectedValue(connectionError);

      await expect(prowlarrService.waitForService(2, 1))
        .rejects.toThrow('Service not ready after 2 attempts: Connection failed');

      expect(mockedAxios.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('interceptor error handling', () => {
    test('should setup response interceptor for error handling', () => {
      const interceptorConfig = mockedAxios.interceptors.response.use.mock.calls[0];

      expect(interceptorConfig).toHaveLength(2);
      expect(typeof interceptorConfig[0]).toBe('function'); // Success handler
      expect(typeof interceptorConfig[1]).toBe('function'); // Error handler

      // Test the error handler
      const errorHandler = interceptorConfig[1];

      // Test ECONNREFUSED error
      const connRefusedError = { code: 'ECONNREFUSED' };
      expect(() => errorHandler(connRefusedError))
        .toThrow('Connection refused - service may not be running');

      // Test HTTP response error
      const httpError = {
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      };
      expect(() => errorHandler(httpError))
        .toThrow('HTTP 404: Not Found');

      // Test other errors
      const otherError = new Error('Some other error');
      expect(() => errorHandler(otherError))
        .toThrow(otherError);
    });
  });

  describe('ensureProxyTag', () => {
    test('should return existing tag ID when tag already exists', async () => {
      const existingTags = [
        { id: 1, label: 'existing-tag' },
        { id: 2, label: 'flaresolver' }
      ];
      mockedAxios.request.mockResolvedValue({ data: existingTags });

      const result = await prowlarrService.ensureProxyTag('flaresolver');

      expect(result).toBe(2);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/tag'
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('🏷️  Managing flaresolver tag...');
      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Tag 'flaresolver' already exists with ID: 2");
    });

    test('should create new tag when tag does not exist', async () => {
      const existingTags = [{ id: 1, label: 'existing-tag' }];
      const newTag = { id: 3, label: 'flaresolver' };

      mockedAxios.request
        .mockResolvedValueOnce({ data: existingTags })
        .mockResolvedValueOnce({ data: newTag });

      const result = await prowlarrService.ensureProxyTag('flaresolver');

      expect(result).toBe(3);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/tag'
      });
      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/tag',
        method: 'POST',
        data: { label: 'flaresolver' }
      });
      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Tag 'flaresolver' created with ID: 3");
    });
  });

  describe('createOrUpdateProxy', () => {
    test('should update existing proxy when found', async () => {
      const existingProxies = [
        {
          id: 1,
          name: 'FlareSolverr',
          implementation: 'FlareSolverr',
          configContract: 'FlareSolverrSettings',
          fields: [{ name: 'host', value: 'http://old-url:8191' }],
          tags: [1]
        }
      ];

      mockedAxios.request
        .mockResolvedValueOnce({ data: existingProxies })
        .mockResolvedValueOnce({ data: {} });

      await prowlarrService.createOrUpdateProxy('http://new-url:8191', 2);

      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/indexerproxy'
      });
      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/indexerproxy/1',
        method: 'PUT',
        data: expect.objectContaining({
          id: 1,
          name: 'FlareSolverr',
          implementation: 'FlareSolverr',
          configContract: 'FlareSolverrSettings',
          tags: expect.arrayContaining([1, 2])
        })
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Checking for existing FlareSolverr proxy...');
    });

    test('should create new proxy when none exists', async () => {
      mockedAxios.request
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: {} });

      await prowlarrService.createOrUpdateProxy('http://flaresolverr:8191', 2);

      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/indexerproxy'
      });
      expect(mockedAxios.request).toHaveBeenCalledWith({
        url: '/api/v1/indexerproxy',
        method: 'POST',
        data: {
          name: 'FlareSolverr',
          implementation: 'FlareSolverr',
          configContract: 'FlareSolverrSettings',
          fields: [
            { name: 'host', value: 'http://flaresolverr:8191' },
            { name: 'requestTimeout', value: 60 }
          ],
          tags: [2]
        }
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('➕ Creating new FlareSolverr proxy...');
    });
  });

  describe('buildProxyFields', () => {
    test('should update existing fields with new values', () => {
      const existingFields = [
        { name: 'host', value: 'http://old-url:8191' },
        { name: 'existingField', value: 'existingValue' }
      ];

      const result = prowlarrService['buildProxyFields'](existingFields, 'http://new-url:8191');

      expect(result).toEqual([
        { name: 'host', value: 'http://new-url:8191' },
        { name: 'existingField', value: 'existingValue' },
        { name: 'requestTimeout', value: 60 }
      ]);
    });

    test('should add new required fields when they do not exist', () => {
      const existingFields = [
        { name: 'existingField', value: 'existingValue' }
      ];

      const result = prowlarrService['buildProxyFields'](existingFields, 'http://flaresolverr:8191');

      expect(result).toEqual([
        { name: 'existingField', value: 'existingValue' },
        { name: 'host', value: 'http://flaresolverr:8191' },
        { name: 'requestTimeout', value: 60 }
      ]);
    });
  });

  describe('findExistingProxy', () => {
    test('should find proxy by name', () => {
      const proxies = [
        { name: 'FlareSolverr', id: 1 },
        { name: 'OtherProxy', id: 2 }
      ];

      const result = prowlarrService['findExistingProxy'](proxies as any, 'http://test:8191');

      expect(result).toEqual({ name: 'FlareSolverr', id: 1 });
    });

    test('should find proxy by host field', () => {
      const proxies = [
        {
          name: 'SomeProxy',
          id: 1,
          fields: [{ name: 'host', value: 'http://test:8191' }]
        },
        { name: 'OtherProxy', id: 2 }
      ];

      const result = prowlarrService['findExistingProxy'](proxies as any, 'http://test:8191');

      expect(result).toEqual({
        name: 'SomeProxy',
        id: 1,
        fields: [{ name: 'host', value: 'http://test:8191' }]
      });
    });

    test('should return undefined when no proxy found', () => {
      const proxies = [
        { name: 'OtherProxy', id: 2 }
      ];

      const result = prowlarrService['findExistingProxy'](proxies as any, 'http://test:8191');

      expect(result).toBeUndefined();
    });
  });
});
