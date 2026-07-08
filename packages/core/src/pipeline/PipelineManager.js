"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineManager = void 0;
const events_1 = require("events");
const PluginLoader_1 = require("../plugin/PluginLoader");
const SenderLoader_1 = require("../sender/SenderLoader");
/**
 * Orchestrates the Listener → Store → API → Plugin pipeline.
 * Manages listener lifecycle, schema matching, message routing, and plugin execution.
 */
class PipelineManager extends events_1.EventEmitter {
    store;
    listenerMap = new Map();
    pluginLoader;
    senderLoader;
    active = false;
    startTime = Date.now();
    constructor(store) {
        super();
        this.store = store;
        this.pluginLoader = new PluginLoader_1.PluginLoader(store);
        this.senderLoader = new SenderLoader_1.SenderLoader();
    }
    getPluginLoader() {
        return this.pluginLoader;
    }
    /**
     * Load plugins from config (npm packages or local paths).
     */
    loadPlugins(sources) {
        for (const source of sources) {
            this.pluginLoader.loadPlugin(source);
        }
    }
    /**
     * Register a plugin directly.
     */
    registerPlugin(plugin) {
        this.pluginLoader.registerPlugin(plugin);
    }
    /**
     * Register a listener with the pipeline.
     */
    registerListener(listener) {
        this.listenerMap.set(listener.id, listener);
        listener.on('message', (event) => {
            this.handleMessage(event);
        });
        console.log(`[lessel] Listener registered: ${listener.id} (${listener.platform})`);
    }
    /**
     * Unregister a listener.
     */
    unregisterListener(id) {
        const listener = this.listenerMap.get(id);
        if (listener) {
            listener.removeAllListeners('message');
            this.listenerMap.delete(id);
            console.log(`[lessel] Listener unregistered: ${id}`);
        }
    }
    /**
     * Start the pipeline — starts all registered listeners and plugins.
     */
    sendFn = async () => { };
    async start(config = {}) {
        if (this.active)
            return;
        this.active = true;
        this.startTime = Date.now();
        // Start senders
        await this.senderLoader.startAll(config);
        this.sendFn = this.senderLoader.getSendFn();
        // Start all plugins
        const ctx = {
            store: this.store,
            log: (level, msg, data) => {
                const prefix = level === 'error' ? '[error]' : level === 'warn' ? '[warn]' : '[info]';
                console.log(`${prefix} [plugin] ${msg}`, data || '');
            },
            send: this.sendFn,
            pipeline: { name: 'lessel', uptime: 0 },
        };
        await this.pluginLoader.startAll(ctx);
        // Start all listeners
        const promises = [];
        for (const listener of this.listenerMap.values()) {
            promises.push(listener.start());
        }
        await Promise.all(promises);
        console.log(`[lessel] Pipeline active with ${this.listenerMap.size} listener(s) and ${this.pluginLoader.getAll().length} plugin(s)`);
        this.emit('started');
    }
    /**
     * Stop the pipeline — stops all listeners and plugins.
     */
    async stop() {
        if (!this.active)
            return;
        this.active = false;
        const promises = [];
        for (const listener of this.listenerMap.values()) {
            promises.push(listener.stop());
        }
        await Promise.all(promises);
        // Stop all plugins
        await this.pluginLoader.stopAll();
        // Stop all senders
        await this.senderLoader.stop();
        console.log('[lessel] Pipeline stopped');
        this.emit('stopped');
    }
    /**
     * Route an incoming message through the pipeline.
     * Matches against schemas, stores if configured, emits for forwarding,
     * then executes matching plugins.
     */
    async handleMessage(event) {
        const schemas = this.store.getAllSchemas();
        for (const schema of schemas) {
            // Check if schema applies to this platform
            if (!schema.platforms.includes(event.platform))
                continue;
            // Check if schema filters match
            if (this.matchesSchema(schema, event)) {
                // Extract payload based on schema rules
                const extracted = {};
                for (const rule of schema.extract) {
                    extracted[rule.key] = this.resolvePath(event.raw, rule.path) ?? rule.default ?? null;
                }
                const matchedEvent = {
                    ...event,
                    payload: extracted,
                    schemaName: schema.name,
                };
                // Store if configured
                if (schema.store) {
                    const stored = {
                        id: matchedEvent.id,
                        schemaName: matchedEvent.schemaName,
                        platform: matchedEvent.platform,
                        payload: JSON.stringify(matchedEvent.payload),
                        raw: JSON.stringify(matchedEvent.raw),
                        receivedAt: matchedEvent.timestamp,
                    };
                    this.store.storeMessage(stored);
                }
                // Emit for any connected senders/webhooks
                this.emit('matched', matchedEvent);
                // Run plugins that match this schema
                const ctx = {
                    store: this.store,
                    log: (level, msg, data) => {
                        const prefix = level === 'error' ? '[error]' : level === 'warn' ? '[warn]' : '[info]';
                        console.log(`${prefix} [plugin] ${msg}`, data || '');
                    },
                    send: this.sendFn,
                    pipeline: {
                        name: 'lessel',
                        uptime: Math.floor((Date.now() - this.startTime) / 1000),
                    },
                };
                await this.pluginLoader.executeForEvent(matchedEvent, ctx);
            }
        }
    }
    /**
     * Check if a message's raw data matches a schema's filter rules.
     */
    matchesSchema(schema, event) {
        if (schema.filters.length === 0)
            return true;
        return schema.filters.every((filter) => {
            const value = String(this.resolvePath(event.raw, filter.field) ?? '');
            switch (filter.operator) {
                case 'eq':
                    return value === filter.value;
                case 'ne':
                    return value !== filter.value;
                case 'contains':
                    return value.includes(filter.value);
                case 'regex':
                    try {
                        return new RegExp(filter.value, 'i').test(value);
                    }
                    catch {
                        return false;
                    }
                case 'startsWith':
                    return value.startsWith(filter.value);
                default:
                    return false;
            }
        });
    }
    /**
     * Simple dot-path resolver for nested objects.
     * e.g. "channel.id" -> event.raw.channel.id
     */
    resolvePath(obj, path) {
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                return current[key];
            }
            return undefined;
        }, obj);
    }
    get activeListeners() {
        return this.listenerMap.size;
    }
    get isActive() {
        return this.active;
    }
}
exports.PipelineManager = PipelineManager;
//# sourceMappingURL=PipelineManager.js.map