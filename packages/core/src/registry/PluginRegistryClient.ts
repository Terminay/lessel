// ============================================================================
// lessel — Plugin Registry Client
// Handles communication with the lessel community plugin registry.
// Used by the CLI and PluginLoader for fetching, installing, and publishing.
// ============================================================================

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

export interface RegistryPluginInfo {
  name: string;
  description: string;
  author: { name: string; publicKey: string };
  latestVersion: string;
  totalDownloads: number;
  tags: string[];
  updatedAt: string;
}

export interface RegistryPluginDetail extends RegistryPluginInfo {
  versions: Array<{
    version: string;
    description: string;
    checksum: string;
    signature: string;
    createdAt: string;
    downloads: number;
    engines: { lessel: string };
  }>;
  listed: boolean;
}

export interface SearchResult {
  data: RegistryPluginInfo[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Client for the lessel plugin registry API.
 */
export class PluginRegistryClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.LESSEL_REGISTRY_URL || 'https://registry.lessel.dev';
    this.apiKey = apiKey || process.env.LESSEL_REGISTRY_KEY;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  // ── Public Endpoints ─────────────────────────────────────────

  /**
   * Search plugins in the registry.
   */
  async search(query: string, options?: { schema?: string; tag?: string; page?: number; limit?: number }): Promise<SearchResult> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (options?.schema) params.set('schema', options.schema);
    if (options?.tag) params.set('tag', options.tag);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(Math.min(options.limit, 50)));

    const res = await fetch(`${this.baseUrl}/api/v1/plugins?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Registry search failed: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<SearchResult>;
  }

  /**
   * Get detailed info about a specific plugin.
   */
  async getPlugin(name: string): Promise<RegistryPluginDetail> {
    const res = await fetch(`${this.baseUrl}/api/v1/plugins/${encodeURIComponent(name)}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) throw new Error(`Plugin "${name}" not found in registry`);
      throw new Error(`Failed to get plugin: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<RegistryPluginDetail>;
  }

  /**
   * Download a plugin tarball.
   */
  async downloadPlugin(name: string, version?: string): Promise<Buffer> {
    const url = version
      ? `${this.baseUrl}/api/v1/plugins/${encodeURIComponent(name)}/download?version=${encodeURIComponent(version)}`
      : `${this.baseUrl}/api/v1/plugins/${encodeURIComponent(name)}/download`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to download plugin: ${res.status} ${res.statusText}`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  /**
   * Get the author's public key for signature verification.
   */
  async getAuthorKey(name: string): Promise<{ author: string; publicKey: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/plugins/${encodeURIComponent(name)}/key`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to get author key: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<{ author: string; publicKey: string }>;
  }

  // ── Auth Required Endpoints ─────────────────────────────────

  /**
   * Register a new author API key.
   */
  async registerAuthor(authorName: string, publicKey: string): Promise<{ id: string; apiKey: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ authorName, publicKey }),
    });

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to register: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<{ id: string; apiKey: string }>;
  }

  /**
   * Publish a plugin to the registry.
   */
  async publishPlugin(payload: {
    name: string;
    version: string;
    description: string;
    author: { name: string; publicKey: string };
    schema: string[];
    engines: { lessel: string };
    tags?: string[];
    /** Plugin code as a Buffer or string */
    code: Buffer;
  }): Promise<{ success: boolean; plugin: string; version: string }> {
    if (!this.apiKey) {
      throw new Error('No registry API key set. Set LESSEL_REGISTRY_KEY or call setApiKey().');
    }

    // Create tarball (for simplicity, just send the raw content)
    // In production, this would create a proper tar.gz
    const tarballContent = payload.code.toString('base64');
    const checksum = crypto.createHash('sha256').update(payload.code).digest('hex');

    // Sign with Ed25519 (placeholder — real impl would use sodium or similar)
    const signature = crypto.createHash('sha256')
      .update(`${payload.name}@${payload.version}:${checksum}`)
      .digest('hex');

    const body = {
      name: payload.name,
      version: payload.version,
      description: payload.description,
      author: payload.author,
      schema: payload.schema,
      engines: payload.engines,
      tags: payload.tags || [],
      tarball: tarballContent,
      checksum,
      signature,
    };

    const res = await fetch(`${this.baseUrl}/api/v1/plugins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to publish: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<{ success: boolean; plugin: string; version: string }>;
  }

  // ── Installation Helpers ─────────────────────────────────────

  /**
   * Install a plugin from the registry into the local plugins directory.
   * Returns the path to the installed plugin.
   */
  async installPlugin(name: string, version?: string, targetDir?: string): Promise<string> {
    const pluginDetail = await this.getPlugin(name);
    const installVersion = version || pluginDetail.latestVersion;

    // Download the tarball
    const tarball = await this.downloadPlugin(name, installVersion);

    // Create plugins directory
    const pluginsDir = targetDir || path.join(process.cwd(), 'plugins');
    const pluginDir = path.join(pluginsDir, name);
    fs.mkdirSync(pluginDir, { recursive: true });

    // Extract (for simplicity, save the tarball and create a wrapper)
    const tarballPath = path.join(pluginDir, `${installVersion}.tar.gz`);
    fs.writeFileSync(tarballPath, tarball);

    // Create a package.json for the plugin
    const pkg = {
      name: `@lessel/plugin-${name}`,
      version: installVersion,
      description: pluginDetail.description,
      main: 'index.js',
      lessel: {
        registry: true,
        registryName: name,
        registryVersion: installVersion,
      },
    };
    fs.writeFileSync(path.join(pluginDir, 'package.json'), JSON.stringify(pkg, null, 2));

    // Create a placeholder index.js that re-exports the plugin
    // In production, the tarball would be extracted and its entry point used
    fs.writeFileSync(path.join(pluginDir, 'index.js'), `
// lessel plugin — "${name}" v${installVersion}
// Installed from registry: ${this.baseUrl}
// The actual plugin code is in the tarball at ${installVersion}.tar.gz

module.exports = {
  name: '${name}',
  version: '${installVersion}',
  description: '${pluginDetail.description.replace(/'/g, "\\'")}',
  schema: ${JSON.stringify(pluginDetail.versions.find(v => v.version === installVersion)?.engines?.lessel ? ['*'] : ['*'])},
  execute: async (event, context) => {
    context.log('info', 'Plugin "${name}" executed (placeholder — extract tarball to ${pluginDir}/${installVersion}.tar.gz)');
  },
};
`);

    console.log(`[lessel] Plugin "${name}" v${installVersion} installed to ${pluginDir}`);
    return pluginDir;
  }
}

/**
 * Create keys for plugin signing.
 * In production, use sodium or noble-ed25519 for proper Ed25519 keys.
 * This is a simplified version using SHA-256 for demonstration.
 */
export function generatePluginKeys(): { publicKey: string; privateKey: string } {
  const seed = crypto.randomBytes(32);
  const publicKey = crypto.createHash('sha256').update(seed).digest('hex');
  const privateKey = seed.toString('hex');
  return { publicKey, privateKey };
}