#!/usr/bin/env node

const fs = require('fs');
const { Command } = require('commander');

/**
 * Configuration script to generate config files for Overseerr, Radarr, Sonarr, Prowlarr, and FlareSolverr
 * Replaces environment variables in templates and merges configurations
 */

class ConfigGenerator {
  constructor(options = {}) {
    this.isDryRun = !options.apply;
    this.configOnly = options.configOnly;
    this.flaresolverrOnly = options.flaresolverrOnly;
    this.requiredEnvVars = ['RADARR_API_KEY', 'SONARR_API_KEY', 'PROWLARR_API_KEY'];
    this.proxyEnvVars = ['PROWLARR_API_KEY'];

    // FlareSolverr configuration
    this.flaresolverrConfig = {
      prowlarrUrl: process.env.PROWLARR_URL || 'http://prowlarr:9696',
      flaresolverrUrl: process.env.FLARESOLVERR_URL || 'http://flaresolverr:8191',
      tagName: 'flaresolver'
    };
  }

  /**
   * Check if required environment variables are set
   */
  checkEnvironmentVariables() {
    const neededVars = this.getRequiredEnvironmentVariables();
    const missingVars = neededVars.filter(envVar => !process.env[envVar]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(envVar => console.error(`  - ${envVar}`));
      console.error('\nPlease set these environment variables before running the script.');
      process.exit(1);
    }
  }

  /**
   * Get list of required environment variables based on operation mode
   */
  getRequiredEnvironmentVariables() {
    const vars = new Set();

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

  /**
   * Read and merge Overseerr settings
   */
  generateOverseerrConfig() {
    const settingsPath = 'overseerr/settings.json';
    const partialPath = 'overseerr/settings.json.partial';

    // Check if files exist
    if (!fs.existsSync(settingsPath) || !fs.existsSync(partialPath)) {
      console.warn('⚠️  Warning: Overseerr settings files not found, skipping overseerr configuration');
      return '{}';
    }

    try {
      // Read and parse JSON files
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const partial = JSON.parse(fs.readFileSync(partialPath, 'utf8'));

      // Merge configurations (partial overwrites settings)
      const merged = { ...settings, ...partial };

      // Replace environment variables in the merged config
      let configString = JSON.stringify(merged, null, 2);
      configString = this.replaceEnvironmentVariables(configString);

      return configString;
    } catch (error) {
      console.error('❌ Error processing Overseerr settings:', error.message);
      return '{}';
    }
  }

  /**
   * Generate config from template
   */
  generateConfigFromTemplate(templatePath) {
    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️  Warning: Template file ${templatePath} not found`);
      return '';
    }

    try {
      const template = fs.readFileSync(templatePath, 'utf8');
      return this.replaceEnvironmentVariables(template);
    } catch (error) {
      console.error(`❌ Error reading template ${templatePath}:`, error.message);
      return '';
    }
  }

  /**
   * Replace environment variables in string
   */
  replaceEnvironmentVariables(content) {
    return content
      .replace(/\${RADARR_API_KEY}/g, process.env.RADARR_API_KEY || '')
      .replace(/\${SONARR_API_KEY}/g, process.env.SONARR_API_KEY || '')
      .replace(/\${PROWLARR_API_KEY}/g, process.env.PROWLARR_API_KEY || '');
  }

  /**
   * Build proxy configuration fields, updating existing or adding missing ones
   */
  buildProxyFields(existingFields, flaresolverrUrl) {
    const requiredFields = [
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

  /**
   * Write content to file if different from existing content
   */
  writeConfigFile(content, outputPath) {
    if (this.isDryRun) {
      console.log(`🟢 Would generate ${outputPath}`);
      return;
    }

    try {
      // Check if content is actually different before writing
      let existingContent = '';
      if (fs.existsSync(outputPath)) {
        try {
          existingContent = fs.readFileSync(outputPath, 'utf8');
        } catch (readError) {
          // File exists but can't be read, proceed with write
          console.warn(`⚠️  Warning: Could not read existing ${outputPath}, overwriting`);
        }
      }

      // Only write if content has changed
      if (existingContent !== content) {
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`✅ Generated ${outputPath}`);
      } else {
        console.log(`✨ ${outputPath} is already up to date`);
      }
    } catch (error) {
      console.error(`❌ Error writing ${outputPath}:`, error.message);
    }
  }

  /**
   * Make HTTP request using fetch (Node.js 18+)
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.PROWLARR_API_KEY,
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused - service may not be running');
      }
      throw error;
    }
  }

  /**
   * Wait for service to be ready
   */
  async waitForService(url, maxAttempts = 10, delay = 5000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.makeRequest(`${url}/api/v1/health`);
        return true;
      } catch (error) {
        console.log(`⏳ Waiting for service (attempt ${attempt}/${maxAttempts})...`);
        if (attempt === maxAttempts) {
          throw new Error(`Service not ready after ${maxAttempts} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Configure FlareSolverr as Prowlarr proxy
   */
  async configureFlareSolverr() {
    const { prowlarrUrl, flaresolverrUrl, tagName } = this.flaresolverrConfig;

    console.log('🔧 Configuring FlareSolverr as indexer proxy in Prowlarr...');

    if (this.isDryRun) {
      console.log('📋 Dry Run Mode - Would configure FlareSolverr proxy');
      return;
    }

    try {
      await this.ensureProwlarrReady(prowlarrUrl);
      const tagId = await this.ensureProxyTag(prowlarrUrl, tagName);
      await this.createOrUpdateProxy(prowlarrUrl, flaresolverrUrl, tagId);

      console.log(`🏷️  Tag '${tagName}' (ID: ${tagId}) is assigned to FlareSolverr proxy.`);
      console.log('💡 Add this tag to indexers that need CloudFlare bypass.');

    } catch (error) {
      console.error('❌ Failed to configure FlareSolverr:', error.message);
      throw error;
    }
  }

  /**
   * Ensure Prowlarr service is ready
   */
  async ensureProwlarrReady(prowlarrUrl) {
    console.log('🔍 Checking Prowlarr connectivity...');
    await this.waitForService(prowlarrUrl);
    console.log('✅ Prowlarr is ready!');
  }

  /**
   * Ensure the proxy tag exists, create if missing
   */
  async ensureProxyTag(prowlarrUrl, tagName) {
    console.log('🏷️  Managing flaresolver tag...');
    const tags = await this.makeRequest(`${prowlarrUrl}/api/v1/tag`);
    const existingTag = tags.find(tag => tag.label === tagName);

    if (existingTag) {
      console.log(`✅ Tag '${tagName}' already exists with ID: ${existingTag.id}`);
      return existingTag.id;
    }

    const newTag = await this.makeRequest(`${prowlarrUrl}/api/v1/tag`, {
      method: 'POST',
      body: JSON.stringify({ label: tagName })
    });
    console.log(`✅ Tag '${tagName}' created with ID: ${newTag.id}`);
    return newTag.id;
  }

  /**
   * Create new proxy or update existing one
   */
  async createOrUpdateProxy(prowlarrUrl, flaresolverrUrl, tagId) {
    console.log('🔍 Checking for existing FlareSolverr proxy...');
    const proxies = await this.makeRequest(`${prowlarrUrl}/api/v1/indexerproxy`);
    const existingProxy = this.findExistingProxy(proxies, flaresolverrUrl);

    if (existingProxy) {
      await this.updateExistingProxy(prowlarrUrl, existingProxy, flaresolverrUrl, tagId);
    } else {
      await this.createNewProxy(prowlarrUrl, flaresolverrUrl, tagId);
    }
  }

  /**
   * Find existing FlareSolverr proxy by name or host URL
   */
  findExistingProxy(proxies, flaresolverrUrl) {
    return proxies.find(proxy =>
      proxy.name === 'FlareSolverr' ||
      (proxy.fields && proxy.fields.find(f => f.name === 'host' && f.value === flaresolverrUrl))
    );
  }

  /**
   * Update existing proxy configuration
   */
  async updateExistingProxy(prowlarrUrl, existingProxy, flaresolverrUrl, tagId) {
    console.log(`🔄 Updating existing proxy '${existingProxy.name}' (ID: ${existingProxy.id})...`);

    const updatedProxy = {
      ...existingProxy,
      name: 'FlareSolverr',
      implementation: 'FlareSolverr',
      configContract: 'FlareSolverrSettings',
      fields: this.buildProxyFields(existingProxy.fields || [], flaresolverrUrl),
      tags: [...new Set([...(existingProxy.tags || []), tagId])]
    };

    await this.makeRequest(`${prowlarrUrl}/api/v1/indexerproxy/${existingProxy.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedProxy)
    });

    console.log('✅ FlareSolverr proxy updated successfully!');
  }

  /**
   * Create new proxy configuration
   */
  async createNewProxy(prowlarrUrl, flaresolverrUrl, tagId) {
    console.log('➕ Creating new FlareSolverr proxy...');

    const newProxy = {
      name: 'FlareSolverr',
      implementation: 'FlareSolverr',
      configContract: 'FlareSolverrSettings',
      fields: [
        { name: 'host', value: flaresolverrUrl },
        { name: 'requestTimeout', value: 60 }
      ],
      tags: [tagId]
    };

    await this.makeRequest(`${prowlarrUrl}/api/v1/indexerproxy`, {
      method: 'POST',
      body: JSON.stringify(newProxy)
    });

    console.log('✅ FlareSolverr proxy created successfully!');
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('🚀 Configuration Generator Starting...\n');

    this.checkEnvironmentVariables();

    if (this.isDryRun) {
      console.log('📋 Dry Run Mode - No changes will be applied');
      console.log('Use --apply to actually make changes\n');
    }

    let hasErrors = false;

    // Generate configurations
    if (!this.flaresolverrOnly) {
      const configs = [
        {
          name: 'Overseerr',
          content: this.generateOverseerrConfig(),
          outputPath: 'overseerr/settings.json'
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

      // Process each configuration
      configs.forEach(config => {
        if (config.content) {
          this.writeConfigFile(config.content, config.outputPath, config.name);
        }
      });
    }

    // Configure FlareSolverr with error handling
    if (!this.configOnly) {
      try {
        await this.configureFlareSolverr();
      } catch (error) {
        console.error('❌ FlareSolverr configuration failed, but continuing...');
        hasErrors = true;
      }
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

// Setup CLI with Commander.js
const program = new Command();

program
  .name('configure')
  .description('Configuration generator for Overseerr, Radarr, Sonarr, Prowlarr, and FlareSolverr')
  .version('1.0.0')
  .option('-a, --apply', 'Apply changes (default: dry run)')
  .option('-c, --config-only', 'Only generate config files, skip FlareSolverr setup')
  .option('-f, --flaresolverr-only', 'Only configure FlareSolverr, skip config generation')
  .action(async (options) => {
    const generator = new ConfigGenerator(options);
    await generator.run();
  });

program.parse();