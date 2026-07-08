import { EventEmitter } from 'events';
import { Platform } from '../types';
/**
 * Abstract base for all platform listeners.
 * Each platform (Discord, WhatsApp, Slack) implements this.
 */
export declare abstract class IListener extends EventEmitter {
    /** Unique identifier for this listener instance */
    abstract readonly id: string;
    /** Platform this listener connects to */
    abstract readonly platform: Platform;
    /**
     * Start the listener (connect to platform, begin ingesting).
     * Emits 'message' (MessageEvent) for each matched message.
     */
    abstract start(): Promise<void>;
    /**
     * Gracefully stop the listener.
     */
    abstract stop(): Promise<void>;
    /**
     * Returns true if the listener is currently connected.
     */
    abstract isConnected(): boolean;
    /**
     * Lifecycle hook called after construction to set up schemas.
     */
    abstract configure(config: Record<string, unknown>): void;
}
//# sourceMappingURL=IListener.d.ts.map