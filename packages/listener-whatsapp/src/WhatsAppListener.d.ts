import { IListener, Platform } from '@lessel/core';
export declare class WhatsAppListener extends IListener {
    readonly id: string;
    readonly platform: Platform;
    private client;
    private connected;
    private config;
    constructor();
    configure(config: Record<string, unknown>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=WhatsAppListener.d.ts.map