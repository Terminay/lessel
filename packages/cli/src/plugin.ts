import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { GitHubPluginRegistry, generatePluginChecksum } from '@lessel/core';

export async function runPlugin(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'add':
      await addPlugin(args[1]);
      break;
    case 'install':
    case 'i':
      await installPlugin(args[1], args[2]);
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
    default:
      printPluginHelp();
      process.exit(1);
  }
}

function printPluginHelp(): void {
  console.log(`lessel plugin commands:

  plugin add <npm-package>         Install an npm plugin package
  plugin install <name> [version]  Install a plugin from the community registry
  plugin search <query>            Search the community plugin registry
  plugin publish [path]            Prepare a plugin for publishing (via PR)
  plugin list                      List installed plugins
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
 * Install a plugin from the GitHub community registry.
 */
async function installPlugin(name?: string, version?: string): Promise<void> {
  if (!name) {
    console.error('[lessel] Usage: lessel plugin install <name> [version]');
    process.exit(1);
  }

  const registry = new GitHubPluginRegistry();
  console.log(`[lessel] Fetching "${name}" from community registry...`);

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
 * Search the community plugin registry (GitHub-based).
 */
async function searchRegistry(query?: string): Promise<void> {
  const registry = new GitHubPluginRegistry();
  console.log(`[lessel] Searching community registry for "${query || 'all plugins'}"...`);

  try {
    const results = await registry.search(query || '');

    if (results.length === 0) {
      console.log('[lessel] No plugins found.');
      console.log('  Browse the registry: https://github.com/Terminay/lessel-plugins');
      return;
    }

    console.log();
    for (const plugin of results) {
      const tags = (plugin.tags || []).join(', ');
      console.log(`  ${plugin.name.padEnd(25)} v${plugin.latestVersion.padEnd(10)} ${plugin.description.slice(0, 55)}`);
      console.log(`  ${' '.repeat(25)}  Author: ${plugin.author}  ${tags ? '🏷️ ' + tags : ''}`);
      console.log();
    }
    console.log(`[lessel] Showing ${results.length} plugin(s)`);
    console.log('  Browse all: https://terminay.github.io/lessel-plugins');
  } catch (err: any) {
    console.error(`[lessel] ❌ Search failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Prepare a plugin for publishing to the community registry.
 * Creates the proper structure and opens a PR link.
 */
async function publishPlugin(pluginPath?: string): Promise<void> {
  const targetPath = pluginPath || process.cwd();
  const fullPath = path.resolve(targetPath);

  // Read plugin code
  let code: string;
  let name: string = 'unknown';
  let version: string = '1.0.0';
  let description = '';

  if (fullPath.endsWith('.js') && fs.existsSync(fullPath)) {
    code = fs.readFileSync(fullPath, 'utf-8');
    name = path.basename(fullPath, '.js');
    version = '1.0.0';
  } else {
    const indexFile = path.join(fullPath, 'index.js');
    if (!fs.existsSync(indexFile)) {
      console.error(`[lessel] ❌ Plugin file not found at ${fullPath}`);
      process.exit(1);
    }
    code = fs.readFileSync(indexFile, 'utf-8');
    name = path.basename(fullPath);

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

  const checksum = generatePluginChecksum(code);

  // Create the plugin structure locally
  const outputDir = path.join(process.cwd(), '.lessel-publish', name);
  const versionDir = path.join(outputDir, version);
  fs.mkdirSync(versionDir, { recursive: true });

  // Write index.js
  fs.writeFileSync(path.join(versionDir, 'index.js'), code);

  // Write plugin.json
  const manifest = {
    name,
    description: description || 'A lessel plugin',
    author: process.env.USER || 'your-github-username',
    repository: '',
    schema: ['*'],
    engines: { lessel: '>=0.1.0' },
    tags: [],
    versions: {
      [version]: {
        checksum,
        published: new Date().toISOString().split('T')[0],
        size: code.length,
      },
    },
  };
  fs.writeFileSync(path.join(outputDir, 'plugin.json'), JSON.stringify(manifest, null, 2));

  console.log(`[lessel] ✅ Plugin "${name}" v${version} prepared for publishing`);
  console.log(`  Output: ${outputDir}`);
  console.log();
  console.log('To publish to the community registry:');
  console.log(`  1. Fork: https://github.com/Terminay/lessel-plugins/fork`);
  console.log(`  2. Copy the plugin directory:`);
  console.log(`     cp -r ${outputDir} <fork>/plugins/${name}`);
  console.log(`  3. Commit and push to your fork`);
  console.log(`  4. Create a Pull Request to Terminay/lessel-plugins`);
  console.log();
  console.log('The registry will auto-build and deploy on merge.');
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
    const source = isRegistry ? '📦 Community Registry' : '📦 npm';
    console.log(`  ${p.padEnd(30)} ${source}`);
  }
}