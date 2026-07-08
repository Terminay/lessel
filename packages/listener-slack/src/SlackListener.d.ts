import { IListener, Platform } from '@lessel/core';
export declare class SlackListener extends IListener {
    readonly id: string;
    readonly platform: Platform;
    private app;
    private connected;
    private config;
    constructor();
    configure(config: Record<string, unknown>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=SlackListener.d.ts.map