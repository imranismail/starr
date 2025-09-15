import { AxiosRequestConfig } from 'axios';

export interface ConfigGeneratorOptions {
  apply?: boolean;
  configOnly?: boolean;
  flaresolverrOnly?: boolean;
}

export interface FlaresolverrConfig {
  flaresolverrUrl: string;
  tagName: string;
}

export interface ProwlarrConfig {
  prowlarrUrl: string;
  apiKey: string;
}

export interface ProxyField {
  name: string;
  value: string | number;
}

export interface Tag {
  id: number;
  label: string;
}

export interface Proxy {
  id?: number;
  name: string;
  implementation: string;
  configContract: string;
  fields: ProxyField[];
  tags: number[];
}

export interface ConfigTemplate {
  name: string;
  content: string;
  outputPath: string;
}

export interface HttpRequestOptions extends AxiosRequestConfig {}
