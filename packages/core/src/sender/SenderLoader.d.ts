import { ISender } from './ISender';
/**
 * Registry + factory for platform senders.
 * Senders must be registered before the pipeline starts.
 */
export declare class SenderLoader {
    private senders;
    /**
     * Register a sender instance directly (called from app.ts).
     */
    register(sender: ISender): void;
    startAll(config: Record<string, unknown> & {
        senders?: Record<string, Record<string, unknown>>;
    }): Promise<void>;
    getSendFn(): (platform: string, target: string, content: string) => Promise<void>;
    private send;
    stop(): Promise<void>;
}
//# sourceMappingURL=SenderLoader.d.ts.map