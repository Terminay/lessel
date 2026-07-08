"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginLoader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Discovers and loads lessel plugins.
 *
 * Plugins can be:
 * 1. npm packages named `@lessel/plugin-*` in node_modules
 * 2. Local files referenced by path in lessel.config.json
 * 3. Directly registered via code
 */
class PluginLoader {
    plugins = new Map();
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Scan node_modules for @lessel/plugin-* packages.
     */
    scanNodeModules() {
        const found = [];
        const modulesPath = path_1.default.join(process.cwd(), 'node_modules');
        if (!fs_1.default.existsSync(modulesPath))
            return found;
        try {
            const entries = fs_1.default.readdirSync(modulesPath);
            for (const entry of entries) {
                if (entry.startsWith('@lessel/plugin-')) {
                    found.push(entry);
                }
            }
        }
        catch {
            // ignore
        }
        return found;
    }
    /**
     * Load a plugin from an npm package or file path.
     */
    loadPlugin(source) {
        try {
            let plugin;
            if (source.startsWith('.') || source.startsWith('/') || source.endsWith('.js')) {
                // Local file
                const resolvedPath = path_1.default.resolve(process.cwd(), source);
                plugin = require(resolvedPath);
            }
            else {
                // npm package
                plugin = require(source);
            }
            // Normalise — support both module.exports = { ... } and module.exports = { default: { ... } }
            const mod = plugin;
            if (mod.default)
                plugin = mod.default;
            if (!plugin.name || !plugin.execute) {
                console.warn(`[lessel] Invalid plugin: ${source} — missing "name" or "execute"`);
                return null;
            }
            this.plugins.set(plugin.name, plugin);
            console.log(`[lessel] Plugin loaded: ${plugin.name} (schema: ${Array.isArray(plugin.schema) ? plugin.schema.join(', ') : plugin.schema})`);
            return plugin;
        }
        catch (err) {
            console.warn(`[lessel] Failed to load plugin: ${source} — ${err.message}`);
            return null;
        }
    }
    /**
     * Register a plugin directly (for programmatic use).
     */
    registerPlugin(plugin) {
        this.plugins.set(plugin.name, plugin);
    }
    /**
     * Get all loaded plugins.
     */
    getAll() {
        return Array.from(this.plugins.values());
    }
    /**
     * Get plugins that match a given schema name.
     */
    getForSchema(schemaName) {
        return this.getAll().filter((p) => {
            if (p.schema === '*')
                return true;
            if (Array.isArray(p.schema))
                return p.schema.includes(schemaName);
            return p.schema === schemaName;
        });
    }
    /**
     * Call onStart for all plugins.
     * Before onStart, auto-registers any schemas the plugin ships with.
     */
    async startAll(context) {
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
                }
                catch (err) {
                    console.error(`[lessel] Plugin ${plugin.name} onStart error:`, err);
                }
            }
        }
    }
    /**
     * Call onStop for all plugins.
     */
    async stopAll() {
        for (const plugin of this.plugins.values()) {
            if (plugin.onStop) {
                try {
                    await plugin.onStop();
                }
                catch (err) {
                    console.error(`[lessel] Plugin ${plugin.name} onStop error:`, err);
                }
            }
        }
    }
    /**
     * Execute all plugins that match the given event's schema.
     */
    async executeForEvent(event, context) {
        if (!event.schemaName)
            return;
        const matching = this.getForSchema(event.schemaName);
        if (matching.length === 0)
            return;
        for (const plugin of matching) {
            try {
                await plugin.execute(event, context);
            }
            catch (err) {
                console.error(`[lessel] Plugin ${plugin.name} execute error:`, err);
            }
        }
    }
}
exports.PluginLoader = PluginLoader;
//# sourceMappingURL=PluginLoader.js.map