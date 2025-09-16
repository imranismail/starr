import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { injectable } from 'inversify';
import { EnvService } from './env-service';
import { ProwlarrConfig, Tag, Proxy, ProxyField } from '../types';

@injectable()
export class ProwlarrService {
  private client: AxiosInstance;
  private config!: ProwlarrConfig;

  constructor(
    private envService: EnvService
  ) {
    this.config = {
      apiKey: this.envService.get('PROWLARR_API_KEY') || '',
      prowlarrUrl: this.envService.get('PROWLARR_URL') || 'http://prowlarr:9696'
    }

    this.client = axios.create({
      baseURL: this.config.prowlarrUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.config.apiKey,
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Connection refused - service may not be running');
        }
        if (error.response) {
          throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
        }
        throw error;
      }
    );
  }

  async request<T = any>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.request<T>({
      url,
      ...options,
    });
    return response.data;
  }

  async waitForService(maxAttempts: number = 10, delay: number = 5000): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.request(`/api/v1/health`);
        return true;
      } catch (error: any) {
        console.log(`⏳ Waiting for service (attempt ${attempt}/${maxAttempts})...`);
        if (attempt === maxAttempts) {
          throw new Error(`Service not ready after ${maxAttempts} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  }

  async ensureProxyTag(tagName: string): Promise<number> {
    console.log('🏷️  Managing flaresolver tag...');
    const tags: Tag[] = await this.request(`/api/v1/tag`);
    const existingTag = tags.find(tag => tag.label === tagName);

    if (existingTag) {
      console.log(`✅ Tag '${tagName}' already exists with ID: ${existingTag.id}`);
      return existingTag.id;
    }

    const newTag: Tag = await this.request(`/api/v1/tag`, {
      method: 'POST',
      data: { label: tagName }
    });
    console.log(`✅ Tag '${tagName}' created with ID: ${newTag.id}`);
    return newTag.id;
  }

  async createOrUpdateProxy(flaresolverrUrl: string, tagId: number): Promise<void> {
    console.log('🔍 Checking for existing FlareSolverr proxy...');
    const proxies: Proxy[] = await this.request(`/api/v1/indexerproxy`);
    const existingProxy = this.findExistingProxy(proxies, flaresolverrUrl);

    if (existingProxy) {
      await this.updateExistingProxy(existingProxy, flaresolverrUrl, tagId);
    } else {
      await this.createNewProxy(flaresolverrUrl, tagId);
    }
  }

  private findExistingProxy(proxies: Proxy[], flaresolverrUrl: string): Proxy | undefined {
    return proxies.find(proxy =>
      proxy.name === 'FlareSolverr' ||
      (proxy.fields && proxy.fields.find(f => f.name === 'host' && f.value === flaresolverrUrl))
    );
  }

  private async updateExistingProxy(existingProxy: Proxy, flaresolverrUrl: string, tagId: number): Promise<void> {
    console.log(`🔄 Updating existing proxy '${existingProxy.name}' (ID: ${existingProxy.id})...`);

    const updatedProxy: Proxy = {
      ...existingProxy,
      name: 'FlareSolverr',
      implementation: 'FlareSolverr',
      configContract: 'FlareSolverrSettings',
      fields: this.buildProxyFields(existingProxy.fields || [], flaresolverrUrl),
      tags: [...new Set([...(existingProxy.tags || []), tagId])]
    };

    await this.request(`/api/v1/indexerproxy/${existingProxy.id}`, {
      method: 'PUT',
      data: updatedProxy
    });

    console.log('✅ FlareSolverr proxy updated successfully!');
  }

  private async createNewProxy(flaresolverrUrl: string, tagId: number): Promise<void> {
    console.log('➕ Creating new FlareSolverr proxy...');

    const newProxy: Proxy = {
      name: 'FlareSolverr',
      implementation: 'FlareSolverr',
      configContract: 'FlareSolverrSettings',
      fields: [
        { name: 'host', value: flaresolverrUrl },
        { name: 'requestTimeout', value: 60 }
      ],
      tags: [tagId]
    };

    await this.request(`/api/v1/indexerproxy`, {
      method: 'POST',
      data: newProxy
    });

    console.log('✅ FlareSolverr proxy created successfully!');
  }

  private buildProxyFields(existingFields: ProxyField[], flaresolverrUrl: string): ProxyField[] {
    const requiredFields: ProxyField[] = [
      { name: 'host', value: flaresolverrUrl },
      { name: 'requestTimeout', value: 60 }
    ];

    const updatedFields = [...existingFields];

    requiredFields.forEach(required => {
      const existingIndex = updatedFields.findIndex(f => f.name === required.name);

      if (existingIndex >= 0) {
        updatedFields[existingIndex] = { ...updatedFields[existingIndex], value: required.value };
      } else {
        updatedFields.push(required);
      }
    });

    return updatedFields;
  }
}
