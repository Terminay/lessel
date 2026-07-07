import fs from 'fs';
import path from 'path';
import { LesselPlugin, PluginContext, MessageEvent, Platform } from '../types';
import { Store } from '../store/Store';

/**
 * Discovers and loads lessel plugins.
 *
 * Plugins can be:
 * 1. npm packages named `@lessel/plugin-*` in node_modules
 * 2. Local files referenced by path in lessel.config.json
 * 3. Directly registered via code
 */
export class PluginLoader {
  private plugins: Map<string, LesselPlugin> = new Map();
  private store: Store;

  constructor(store: Store) {
    this.store = store;
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
   * Load a plugin from an npm package or file path.
   */
  loadPlugin(source: string): LesselPlugin | null {
    try {
      let plugin: LesselPlugin;

      if (source.startsWith('.') || source.startsWith('/') || source.endsWith('.js')) {
        // Local file
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
   */
  async executeForEvent(event: MessageEvent, context: PluginContext): Promise<void> {
    if (!event.schemaName) return;

    const matching = this.getForSchema(event.schemaName);
    if (matching.length === 0) return;

    for (const plugin of matching) {
      try {
        await plugin.execute(event, context);
      } catch (err) {
        console.error(`[lessel] Plugin ${plugin.name} execute error:`, err);
      }
    }
  }
}