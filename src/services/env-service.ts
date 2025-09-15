import { injectable } from 'inversify';

@injectable()
export class EnvService {
  constructor(private env: Record<string, string | undefined> = {}) {}

  ensure(keys: string[]): Boolean {
    const missingKeys = keys.filter(key => !this.env[key]);
    if (missingKeys.length > 0) {
      throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
    }
    return true;
  }

  get(key: string): string | undefined {
    return this.env[key];
  }

  subst(content: string): string {
    for (const [key, value] of Object.entries(this.env)) {
      if (value !== undefined) {
        const regex = new RegExp(`\\\${${key}}`, 'g');
        content = content.replace(regex, value);
      }
    }
    return content;
  }
}
