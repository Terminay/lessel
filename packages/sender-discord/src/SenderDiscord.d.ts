import { ISender } from '@lessel/core';
import type { Platform } from '@lessel/core';
export declare class SenderDiscord implements ISender {
    readonly platform: Platform;
    private client;
    start(config: Record<string, unknown>): Promise<void>;
    send(target: string, content: string): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=SenderDiscord.d.ts.map