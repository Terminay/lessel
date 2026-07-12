import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { LesselPlugin, PluginContext, MessageEvent, Platform } from '../types';
import { Store } from '../store/Store';

/**
 * Discovers and loads lessel plugins.
 *
 * Plugins can be:
 * 1. npm packages named `@lessel/plugin-*` in node_modules
 * 2. Local files referenced by path in lessel.config.json
 * 3. Registry plugins in the local `plugins/` directory
 * 4. Directly registered via code
 */
export class PluginLoader {
  private plugins: Map<string, LesselPlugin> = new Map();
  private store: Store;
  private sandboxEnabled: boolean = true;

  constructor(store: Store) {
    this.store = store;
  }

  /**
   * Enable or disable sandboxed execution.
   * Sandboxed plugins run in a restricted VM context with no filesystem access.
   */
  setSandboxEnabled(enabled: boolean): void {
    this.sandboxEnabled = enabled;
  }

  /**
   * Scan node_modules for @lessel/plugin-* packages.
   */
  scanNodeModules(): string[] {
    const found: string[] = [];
    const modulesPath = path.join(process.cwd(), 'node_modules');

    if (!fs.existsSync(modulesPath)) return found;

    try {
      const entries = fs.readdirSync(modulesPath);
      for (const entry of entries) {
        if (entry.startsWith('@lessel/plugin-')) {
          found.push(entry);
        }
      }
    } catch {
      // ignore
    }

    return found;
  }

  /**
   * Scan the local `plugins/` directory for registry-installed plugins.
   * Each subdirectory with a package.json is treated as a plugin.
   */
  scanLocalPluginsDir(): string[] {
    const found: string[] = [];
    const pluginsDir = path.join(process.cwd(), 'plugins');

    if (!fs.existsSync(pluginsDir)) return found;

    try {
      const entries = fs.readdirSync(pluginsDir);
      for (const entry of entries) {
        const pluginPath = path.join(pluginsDir, entry);
        if (fs.statSync(pluginPath).isDirectory()) {
          const pkgPath = path.join(pluginPath, 'package.json');
          if (fs.existsSync(pkgPath)) {
            found.push(path.join('plugins', entry));
          }
        }
      }
    } catch {
      // ignore
    }

    return found;
  }

  /**
   * Load a plugin from an npm package, file path, or local plugins directory.
   */
  loadPlugin(source: string): LesselPlugin | null {
    try {
      let plugin: LesselPlugin;

      if (source.startsWith('.') || source.startsWith('/') || source.endsWith('.js')) {
        // Local file
        const resolvedPath = path.resolve(process.cwd(), source);
        plugin = require(resolvedPath);
      } else if (source.startsWith('plugins/') || source.startsWith('plugins\\')) {
        // Registry plugin from local plugins directory
        const resolvedPath = path.resolve(process.cwd(), source);
        plugin = require(resolvedPath);
      } else {
        // npm package
        plugin = require(source);
      }

      // Normalise — support both module.exports = { ... } and module.exports = { default: { ... } }
      const mod = plugin as any;
      if (mod.default) plugin = mod.default as LesselPlugin;

      if (!plugin.name || !plugin.execute) {
        console.warn(`[lessel] Invalid plugin: ${source} — missing "name" or "execute"`);
        return null;
      }

      this.plugins.set(plugin.name, plugin);
      console.log(`[lessel] Plugin loaded: ${plugin.name} (schema: ${Array.isArray(plugin.schema) ? plugin.schema.join(', ') : plugin.schema})`);
      return plugin;
    } catch (err) {
      console.warn(`[lessel] Failed to load plugin: ${source} — ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Register a plugin directly (for programmatic use).
   */
  registerPlugin(plugin: LesselPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Get all loaded plugins.
   */
  getAll(): LesselPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins that match a given schema name.
   */
  getForSchema(schemaName: string): LesselPlugin[] {
    return this.getAll().filter((p) => {
      if (p.schema === '*') return true;
      if (Array.isArray(p.schema)) return p.schema.includes(schemaName);
      return p.schema === schemaName;
    });
  }

  /**
   * Call onStart for all plugins.
   * Before onStart, auto-registers any schemas the plugin ships with.
   */
  async startAll(context: PluginContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      // Auto-register schemas defined by the plugin
      if (plugin.schemas && plugin.schemas.length > 0) {
        for (const schema of plugin.schemas) {
          this.store.saveSchema(schema);
          console.log(`[lessel] Schema auto-registered by plugin "${plugin.name}": ${schema.name}`);
        }
      }

      if (plugin.onStart) {
        try {
          await plugin.onStart(context);
        } catch (err) {
          console.error(`[lessel] Plugin ${plugin.name} onStart error:`, err);
        }
      }
    }
  }

  /**
   * Call onStop for all plugins.
   */
  async stopAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onStop) {
        try {
          await plugin.onStop();
        } catch (err) {
          console.error(`[lessel] Plugin ${plugin.name} onStop error:`, err);
        }
      }
    }
  }

  /**
   * Execute all plugins that match the given event's schema.
   * Registry plugins are executed in a sandboxed VM context.
   */
  async executeForEvent(event: MessageEvent, context: PluginContext): Promise<void> {
    if (!event.schemaName) return;

    const matching = this.getForSchema(event.schemaName);
    if (matching.length === 0) return;

    for (const plugin of matching) {
      try {
        // Check if this is a registry plugin (should be sandboxed)
        const isRegistryPlugin = plugin.name.startsWith('registry:') || 
          (plugin as any).__registryPlugin === true;

        if (isRegistryPlugin && this.sandboxEnabled) {
          await this.executeSandboxed(plugin, event, context);
        } else {
          await plugin.execute(event, context);
        }
      } catch (err: any) {
        if (err.message === 'RATE_LIMITED') {
          // Silently skip rate-limited executions
          continue;
        }
        console.error(`[lessel] Plugin ${plugin.name} execute error:`, err);
      }
    }
  }

  /**
   * Execute a plugin in a sandboxed VM context.
   * This restricts filesystem, network, and process access.
   */
  private async executeSandboxed(
    plugin: LesselPlugin,
    event: MessageEvent,
    context: PluginContext
  ): Promise<void> {
    // Create a sandbox with limited capabilities
    const sandbox = {
      // Read-only access to event data
      event: JSON.parse(JSON.stringify(event)),
      // Limited context — only log and send functions
      context: {
        log: context.log,
        send: context.send,
        store: {
          getMessage: (id: string) => {
            const msgs = context.store.getMessages(undefined, undefined, 1, 0);
            return msgs.find(m => m.id === id) || null;
          },
          getMessages: (schemaName?: string) => context.store.getMessages(schemaName),
        },
        pipeline: context.pipeline,
      },
      // Safe built-ins
      console: {
        log: (...args: any[]) => context.log('info', args.map(String).join(' ')),
        warn: (...args: any[]) => context.log('warn', args.map(String).join(' ')),
        error: (...args: any[]) => context.log('error', args.map(String).join(' ')),
      },
      // No fs, no require, no process, no child_process
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      Promise: Promise,
      JSON: JSON,
      Math: Math,
      Date: Date,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Array: Array,
      Object: Object,
      Map: Map,
      Set: Set,
      RegExp: RegExp,
      Error: Error,
      Buffer: {
        from: (data: any) => Buffer.from(String(data)),
      },
    };

    try {
      const code = plugin.execute.toString();
      const script = new vm.Script(`
        (async () => {
          const execute = ${code};
          await execute(event, context);
        })()
      `);

      const vmContext = vm.createContext(sandbox);
      await script.runInContext(vmContext, { timeout: 5000 }); // 5s timeout
    } catch (err) {
      console.error(`[lessel] Sandboxed plugin ${plugin.name} error:`, err);
    }
  }
}