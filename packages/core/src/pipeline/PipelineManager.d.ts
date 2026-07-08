import { EventEmitter } from 'events';
import { IListener } from '../listener/IListener';
import { Store } from '../store/Store';
import { PluginLoader } from '../plugin/PluginLoader';
import { LesselPlugin } from '../types';
/**
 * Orchestrates the Listener → Store → API → Plugin pipeline.
 * Manages listener lifecycle, schema matching, message routing, and plugin execution.
 */
export declare class PipelineManager extends EventEmitter {
    private store;
    private listenerMap;
    private pluginLoader;
    private senderLoader;
    private active;
    private startTime;
    constructor(store: Store);
    getPluginLoader(): PluginLoader;
    /**
     * Load plugins from config (npm packages or local paths).
     */
    loadPlugins(sources: string[]): void;
    /**
     * Register a plugin directly.
     */
    registerPlugin(plugin: LesselPlugin): void;
    /**
     * Register a listener with the pipeline.
     */
    registerListener(listener: IListener): void;
    /**
     * Unregister a listener.
     */
    unregisterListener(id: string): void;
    /**
     * Start the pipeline — starts all registered listeners and plugins.
     */
    private sendFn;
    start(config?: Record<string, unknown>): Promise<void>;
    /**
     * Stop the pipeline — stops all listeners and plugins.
     */
    stop(): Promise<void>;
    /**
     * Route an incoming message through the pipeline.
     * Matches against schemas, stores if configured, emits for forwarding,
     * then executes matching plugins.
     */
    private handleMessage;
    /**
     * Check if a message's raw data matches a schema's filter rules.
     */
    private matchesSchema;
    /**
     * Simple dot-path resolver for nested objects.
     * e.g. "channel.id" -> event.raw.channel.id
     */
    private resolvePath;
    get activeListeners(): number;
    get isActive(): boolean;
}
//# sourceMappingURL=PipelineManager.d.ts.map