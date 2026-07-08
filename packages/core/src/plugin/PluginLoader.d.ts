import { LesselPlugin, PluginContext, MessageEvent } from '../types';
import { Store } from '../store/Store';
/**
 * Discovers and loads lessel plugins.
 *
 * Plugins can be:
 * 1. npm packages named `@lessel/plugin-*` in node_modules
 * 2. Local files referenced by path in lessel.config.json
 * 3. Directly registered via code
 */
export declare class PluginLoader {
    private plugins;
    private store;
    constructor(store: Store);
    /**
     * Scan node_modules for @lessel/plugin-* packages.
     */
    scanNodeModules(): string[];
    /**
     * Load a plugin from an npm package or file path.
     */
    loadPlugin(source: string): LesselPlugin | null;
    /**
     * Register a plugin directly (for programmatic use).
     */
    registerPlugin(plugin: LesselPlugin): void;
    /**
     * Get all loaded plugins.
     */
    getAll(): LesselPlugin[];
    /**
     * Get plugins that match a given schema name.
     */
    getForSchema(schemaName: string): LesselPlugin[];
    /**
     * Call onStart for all plugins.
     * Before onStart, auto-registers any schemas the plugin ships with.
     */
    startAll(context: PluginContext): Promise<void>;
    /**
     * Call onStop for all plugins.
     */
    stopAll(): Promise<void>;
    /**
     * Execute all plugins that match the given event's schema.
     */
    executeForEvent(event: MessageEvent, context: PluginContext): Promise<void>;
}
//# sourceMappingURL=PluginLoader.d.ts.map