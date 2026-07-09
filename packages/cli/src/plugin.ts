import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PluginRegistryClient, generatePluginKeys } from '@lessel/core';

export async function runPlugin(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'add':
      await addPlugin(args[1]);
      break;
    case 'install':
    case 'i':
      await installRegistryPlugin(args[1], args[2]);
      break;
    case 'search':
      await searchRegistry(args.slice(1).join(' '));
      break;
    case 'publish':
      await publishPlugin(args[1]);
      break;
    case 'list':
      await listInstalledPlugins();
      break;
    case 'register':
      await registerAuthor(args[1]);
      break;
    default:
      printPluginHelp();
      process.exit(1);
  }
}

function printPluginHelp(): void {
  console.log(`lessel plugin commands:

  plugin add <npm-package>         Install an npm plugin package
  plugin install <name> [version]  Install a plugin from the registry
  plugin search <query>            Search the plugin registry
  plugin publish [path]            Publish a plugin to the registry
  plugin list                      List installed plugins
  plugin register <author-name>    Get an API key for publishing
`);
}

/**
 * Add an npm plugin package (existing behavior).
 */
async function addPlugin(pkgName?: string): Promise<void> {
  if (!pkgName) {
    console.error('[lessel] Missing plugin package name. Usage: lessel plugin add <package-name>');
    process.exit(1);
  }

  console.log(`[lessel] Installing ${pkgName}...`);
  try {
    execSync(`npm install ${pkgName}`, { stdio: 'inherit', cwd: process.cwd() });
  } catch {
    console.error(`[lessel] Failed to install ${pkgName}`);
    process.exit(1);
  }

  // Register in lessel.config.json
  const configPath = path.join(process.cwd(), 'lessel.config.json');
  let config: any = { plugins: [] };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    // If no config, create one
    config = { plugins: [] };
  }

  config.plugins = config.plugins || [];
  if (!config.plugins.includes(pkgName)) {
    config.plugins.push(pkgName);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[lessel] Registered ${pkgName} in lessel.config.json`);
  } else {
    console.log(`[lessel] ${pkgName} already registered.`);
  }
}

/**
 * Install a plugin from the community registry.
 */
async function installRegistryPlugin(name?: string, version?: string): Promise<void> {
  if (!name) {
    console.error('[lessel] Usage: lessel plugin install <name> [version]');
    process.exit(1);
  }

  const registry = new PluginRegistryClient();
  console.log(`[lessel] Fetching "${name}" from registry...`);

  try {
    const pluginDir = await registry.installPlugin(name, version);

    // Register in lessel.config.json for auto-loading
    const configPath = path.join(process.cwd(), 'lessel.config.json');
    let config: any = { plugins: [] };
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      config = { plugins: [] };
    }

    config.plugins = config.plugins || [];
    const ref = path.join('plugins', name);
    if (!config.plugins.includes(ref)) {
      config.plugins.push(ref);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`[lessel] Registered "${ref}" in lessel.config.json`);
    }

    console.log(`[lessel] ✅ Plugin "${name}" installed successfully`);
  } catch (err: any) {
    console.error(`[lessel] ❌ Failed to install plugin: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Search the plugin registry.
 */
async function searchRegistry(query?: string): Promise<void> {
  const registry = new PluginRegistryClient();
  console.log(`[lessel] Searching registry for "${query || ''}"...`);

  try {
    const result = await registry.search(query || '', { limit: 20 });

    if (result.data.length === 0) {
      console.log('[lessel] No plugins found.');
      return;
    }

    console.log();
    for (const plugin of result.data) {
      console.log(`  ${plugin.name.padEnd(25)} v${plugin.latestVersion.padEnd(12)} ${plugin.description.slice(0, 60)}`);
      console.log(`  ${' '.repeat(25)}  Author: ${plugin.author.name}  ⭐ ${plugin.totalDownloads} downloads`);
      console.log();
    }
    console.log(`[lessel] Showing ${result.data.length} of ${result.pagination.total} results`);
  } catch (err: any) {
    console.error(`[lessel] ❌ Search failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Publish a plugin to the registry.
 * Expects a path to a plugin directory or file.
 */
async function publishPlugin(pluginPath?: string): Promise<void> {
  const targetPath = pluginPath || process.cwd();
  const fullPath = path.resolve(targetPath);

  // Read plugin code
  let code: Buffer;
  let name: string = 'unknown';
  let version: string = '1.0.0';
  let description = '';

  // Try reading as a single .js file
  if (fullPath.endsWith('.js') && fs.existsSync(fullPath)) {
    code = fs.readFileSync(fullPath);
    name = path.basename(fullPath, '.js');
    version = '1.0.0';
  } else {
    // Try directory with index.js
    const indexFile = path.join(fullPath, 'index.js');
    if (!fs.existsSync(indexFile)) {
      console.error(`[lessel] ❌ Plugin file not found at ${fullPath}`);
      process.exit(1);
    }
    code = fs.readFileSync(indexFile);
    name = path.basename(fullPath);

    // Try reading package.json
    const pkgPath = path.join(fullPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        name = pkg.name || name;
        version = pkg.version || '1.0.0';
        description = pkg.description || '';
      } catch {}
    } else {
      version = '1.0.0';
    }
  }

  // Check for registry API key
  const apiKey = process.env.LESSEL_REGISTRY_KEY;
  if (!apiKey) {
    console.error('[lessel] ❌ No registry API key found. Set LESSEL_REGISTRY_KEY or run "lessel plugin register <name>"');
    process.exit(1);
  }

  // Check for signing key
  const signKeyFile = path.join(process.cwd(), '.lessel-keys.json');
  let author: { name: string; publicKey: string };
  try {
    const keys = JSON.parse(fs.readFileSync(signKeyFile, 'utf-8'));
    // Verify the API key matches
    author = { name: keys.authorName, publicKey: keys.publicKey };
    console.log(`[lessel] Using signing key for "${author.name}"`);
  } catch {
    // Auto-generate keys (not ideal for production, but works for dev)
    console.log('[lessel] No .lessel-keys.json found. Generating new keys...');
    const keys = generatePluginKeys();
    console.log(`[lessel] Generated keys (save these):`);
    console.log(`  Public key (Ed25519):  ${keys.publicKey}`);
    console.log(`  Private key: ${keys.privateKey}`);
    console.log();

    const authorName = process.env.LESSEL_AUTHOR || process.env.USER || 'anonymous';
    author = { name: authorName, publicKey: keys.publicKey };

    // Save keys
    fs.writeFileSync(signKeyFile, JSON.stringify({
      authorName: author.name,
      publicKey: author.publicKey,
      privateKey: keys.privateKey,
    }, null, 2));
    console.log(`[lessel] Keys saved to ${signKeyFile}`);
  }

  // Get registry URL
  const registryUrl = process.env.LESSEL_REGISTRY_URL;
  const registry = new PluginRegistryClient(registryUrl, apiKey);

  console.log(`[lessel] Publishing "${name}" v${version}...`);

  try {
    const result = await registry.publishPlugin({
      name,
      version,
      description,
      author,
      schema: ['*'],
      engines: { lessel: '>=0.1.0' },
      tags: [],
      code,
    });
    console.log(`[lessel] ✅ Plugin "${result.plugin}" v${result.version} published!`);
  } catch (err: any) {
    console.error(`[lessel] ❌ Publish failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * List installed plugins.
 */
async function listInstalledPlugins(): Promise<void> {
  const configPath = path.join(process.cwd(), 'lessel.config.json');
  let plugins: string[] = [];

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    plugins = config.plugins || [];
  } catch {
    console.log('[lessel] No lessel.config.json found');
  }

  // Also scan local plugins directory
  const localPluginsDir = path.join(process.cwd(), 'plugins');
  if (fs.existsSync(localPluginsDir)) {
    const entries = fs.readdirSync(localPluginsDir);
    for (const entry of entries) {
      const pluginPath = path.join(localPluginsDir, entry);
      if (fs.statSync(pluginPath).isDirectory()) {
        const pkgPath = path.join(pluginPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (!plugins.includes(pkg.name) && !plugins.includes(path.join('plugins', entry))) {
              plugins.push(path.join('plugins', entry));
            }
          } catch {}
        }
      }
    }
  }

  if (plugins.length === 0) {
    console.log('[lessel] No plugins installed.');
    console.log('  Search the registry: lessel plugin search <query>');
    console.log('  Install a plugin:     lessel plugin install <name>');
    return;
  }

  console.log('[lessel] Installed plugins:');
  console.log();
  for (const p of plugins) {
    const isRegistry = p.startsWith('plugins/') || p.startsWith('plugins\\');
    const source = isRegistry ? '📦 Registry' : '📦 npm';
    console.log(`  ${p.padEnd(30)} ${source}`);
  }
}

/**
 * Register as an author and get an API key.
 */
async function registerAuthor(authorName?: string): Promise<void> {
  if (!authorName) {
    console.error('[lessel] Usage: lessel plugin register <author-name>');
    process.exit(1);
  }

  // Generate or load signing keys
  const signKeyFile = path.join(process.cwd(), '.lessel-keys.json');
  let publicKey: string;

  try {
    const keys = JSON.parse(fs.readFileSync(signKeyFile, 'utf-8'));
    publicKey = keys.publicKey;
    console.log(`[lessel] Using existing signing key for "${keys.authorName}"`);
  } catch {
    console.log('[lessel] Generating new signing keys...');
    const keys = generatePluginKeys();
    publicKey = keys.publicKey;
    fs.writeFileSync(signKeyFile, JSON.stringify({
      authorName,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    }, null, 2));
    console.log(`[lessel] Keys saved to ${signKeyFile}`);
  }

  const registry = new PluginRegistryClient();
  console.log(`[lessel] Registering "${authorName}" with the registry...`);

  try {
    const result = await registry.registerAuthor(authorName, publicKey);
    console.log();
    console.log(`[lessel] ✅ Registration successful!`);
    console.log(`[lessel] API Key: ${result.apiKey}`);
    console.log();
    console.log('  Save this key! Set it as an environment variable:');
    console.log(`  export LESSEL_REGISTRY_KEY=${result.apiKey}`);
    console.log();
    console.log('  Then publish your plugin:');
    console.log('  lessel plugin publish ./path/to/plugin');
  } catch (err: any) {
    console.error(`[lessel] ❌ Registration failed: ${err.message}`);
    process.exit(1);
  }
}