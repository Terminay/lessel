import { EventEmitter } from 'events';
import { IListener } from '../listener/IListener';
import { Store } from '../store/Store';
import { PluginLoader } from '../plugin/PluginLoader';
import { Schema, MessageEvent, StoredMessage, PluginContext, LesselPlugin } from '../types';

/**
 * Orchestrates the Listener → Store → API → Plugin pipeline.
 * Manages listener lifecycle, schema matching, message routing, and plugin execution.
 */
export class PipelineManager extends EventEmitter {
  private store: Store;
  private listenerMap: Map<string, IListener> = new Map();
  private pluginLoader: PluginLoader;
  private active: boolean = false;
  private startTime: number = Date.now();

  constructor(store: Store) {
    super();
    this.store = store;
    this.pluginLoader = new PluginLoader(store);
  }

  getPluginLoader(): PluginLoader {
    return this.pluginLoader;
  }

  /**
   * Load plugins from config (npm packages or local paths).
   */
  loadPlugins(sources: string[]): void {
    for (const source of sources) {
      this.pluginLoader.loadPlugin(source);
    }
  }

  /**
   * Register a plugin directly.
   */
  registerPlugin(plugin: LesselPlugin): void {
    this.pluginLoader.registerPlugin(plugin);
  }

  /**
   * Register a listener with the pipeline.
   */
  registerListener(listener: IListener): void {
    this.listenerMap.set(listener.id, listener);

    listener.on('message', (event: MessageEvent) => {
      this.handleMessage(event);
    });

    console.log(`[lessel] Listener registered: ${listener.id} (${listener.platform})`);
  }

  /**
   * Unregister a listener.
   */
  unregisterListener(id: string): void {
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
  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.startTime = Date.now();

    // Start all plugins
    const ctx: PluginContext = {
      store: this.store,
      log: (level, msg, data) => {
        const prefix = level === 'error' ? '[error]' : level === 'warn' ? '[warn]' : '[info]';
        console.log(`${prefix} [plugin] ${msg}`, data || '');
      },
      pipeline: { name: 'lessel', uptime: 0 },
    };
    await this.pluginLoader.startAll(ctx);

    // Start all listeners
    const promises: Promise<void>[] = [];
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
  async stop(): Promise<void> {
    if (!this.active) return;
    this.active = false;

    const promises: Promise<void>[] = [];
    for (const listener of this.listenerMap.values()) {
      promises.push(listener.stop());
    }
    await Promise.all(promises);

    // Stop all plugins
    await this.pluginLoader.stopAll();

    console.log('[lessel] Pipeline stopped');
    this.emit('stopped');
  }

  /**
   * Route an incoming message through the pipeline.
   * Matches against schemas, stores if configured, emits for forwarding,
   * then executes matching plugins.
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    const schemas = this.store.getAllSchemas();

    for (const schema of schemas) {
      // Check if schema applies to this platform
      if (!schema.platforms.includes(event.platform)) continue;

      // Check if schema filters match
      if (this.matchesSchema(schema, event)) {
        // Extract payload based on schema rules
        const extracted: Record<string, unknown> = {};
        for (const rule of schema.extract) {
          extracted[rule.key] = this.resolvePath(event.raw, rule.path) ?? rule.default ?? null;
        }

        const matchedEvent: MessageEvent = {
          ...event,
          payload: extracted,
          schemaName: schema.name,
        };

        // Store if configured
        if (schema.store) {
          const stored: StoredMessage = {
            id: matchedEvent.id,
            schemaName: matchedEvent.schemaName!,
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
        const ctx: PluginContext = {
          store: this.store,
          log: (level, msg, data) => {
            const prefix = level === 'error' ? '[error]' : level === 'warn' ? '[warn]' : '[info]';
            console.log(`${prefix} [plugin] ${msg}`, data || '');
          },
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
  private matchesSchema(schema: Schema, event: MessageEvent): boolean {
    if (schema.filters.length === 0) return true;

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
          } catch {
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
  private resolvePath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  get activeListeners(): number {
    return this.listenerMap.size;
  }

  get isActive(): boolean {
    return this.active;
  }
}