import { EnvService } from './env-service';

describe('EnvService', () => {
  let envService: EnvService;

  describe('constructor', () => {
    test('should initialize with provided environment variables', () => {
      const env = { TEST_VAR: 'test_value', ANOTHER_VAR: 'another_value' };
      envService = new EnvService(env);

      expect(envService.get('TEST_VAR')).toBe('test_value');
      expect(envService.get('ANOTHER_VAR')).toBe('another_value');
    });

    test('should initialize with empty object when no env provided', () => {
      envService = new EnvService();

      expect(envService.get('NONEXISTENT')).toBeUndefined();
    });
  });

  describe('ensure', () => {
    beforeEach(() => {
      const env = {
        EXISTING_VAR1: 'value1',
        EXISTING_VAR2: 'value2',
        EMPTY_VAR: ''
      };
      envService = new EnvService(env);
    });

    test('should return true when all required keys exist', () => {
      const result = envService.ensure(['EXISTING_VAR1', 'EXISTING_VAR2']);

      expect(result).toBe(true);
    });

    test('should throw error when required keys are missing', () => {
      expect(() => {
        envService.ensure(['EXISTING_VAR1', 'MISSING_VAR', 'ANOTHER_MISSING']);
      }).toThrow('Missing required environment variables: MISSING_VAR, ANOTHER_MISSING');
    });

    test('should throw error when required keys are empty strings', () => {
      expect(() => {
        envService.ensure(['EXISTING_VAR1', 'EMPTY_VAR']);
      }).toThrow('Missing required environment variables: EMPTY_VAR');
    });

    test('should throw error when required keys are undefined', () => {
      expect(() => {
        envService.ensure(['EXISTING_VAR1', 'UNDEFINED_VAR']);
      }).toThrow('Missing required environment variables: UNDEFINED_VAR');
    });

    test('should handle empty array of required keys', () => {
      const result = envService.ensure([]);

      expect(result).toBe(true);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      const env = {
        TEST_KEY: 'test_value',
        EMPTY_KEY: '',
        NUMERIC_KEY: '123'
      };
      envService = new EnvService(env);
    });

    test('should return value for existing key', () => {
      expect(envService.get('TEST_KEY')).toBe('test_value');
      expect(envService.get('NUMERIC_KEY')).toBe('123');
    });

    test('should return empty string for empty key', () => {
      expect(envService.get('EMPTY_KEY')).toBe('');
    });

    test('should return undefined for non-existing key', () => {
      expect(envService.get('NON_EXISTING_KEY')).toBeUndefined();
    });
  });

  describe('subst', () => {
    beforeEach(() => {
      const env = {
        API_KEY: 'secret123',
        HOST: 'localhost',
        PORT: '8080',
        EMPTY_VAR: '',
        SPECIAL_CHARS: 'value-with-chars_123'
      };
      envService = new EnvService(env);
    });

    test('should substitute single environment variable', () => {
      const content = 'API Key: ${API_KEY}';
      const result = envService.subst(content);

      expect(result).toBe('API Key: secret123');
    });

    test('should substitute multiple environment variables', () => {
      const content = 'Server: ${HOST}:${PORT}, API: ${API_KEY}';
      const result = envService.subst(content);

      expect(result).toBe('Server: localhost:8080, API: secret123');
    });

    test('should substitute same variable multiple times', () => {
      const content = '${API_KEY} and ${API_KEY} again';
      const result = envService.subst(content);

      expect(result).toBe('secret123 and secret123 again');
    });

    test('should handle empty variable values', () => {
      const content = 'Empty: ${EMPTY_VAR}';
      const result = envService.subst(content);

      expect(result).toBe('Empty: ');
    });

    test('should handle variables with special characters', () => {
      const content = 'Special: ${SPECIAL_CHARS}';
      const result = envService.subst(content);

      expect(result).toBe('Special: value-with-chars_123');
    });

    test('should not substitute undefined variables', () => {
      const content = 'Undefined: ${UNDEFINED_VAR}';
      const result = envService.subst(content);

      expect(result).toBe('Undefined: ${UNDEFINED_VAR}');
    });

    test('should handle content with no variables', () => {
      const content = 'No variables here';
      const result = envService.subst(content);

      expect(result).toBe('No variables here');
    });

    test('should handle empty content', () => {
      const content = '';
      const result = envService.subst(content);

      expect(result).toBe('');
    });

    test('should handle malformed variable syntax', () => {
      const content = 'Malformed: ${INCOMPLETE and ${API_KEY}';
      const result = envService.subst(content);

      expect(result).toBe('Malformed: ${INCOMPLETE and secret123');
    });

    test('should handle complex template content', () => {
      const content = `
        <configuration>
          <host>\${HOST}</host>
          <port>\${PORT}</port>
          <apiKey>\${API_KEY}</apiKey>
          <enabled>true</enabled>
        </configuration>
      `;
      const expected = `
        <configuration>
          <host>localhost</host>
          <port>8080</port>
          <apiKey>secret123</apiKey>
          <enabled>true</enabled>
        </configuration>
      `;
      const result = envService.subst(content);

      expect(result).toBe(expected);
    });
  });
});
