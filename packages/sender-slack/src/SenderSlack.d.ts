import { ISender } from '@lessel/core';
import type { Platform } from '@lessel/core';
export declare class SenderSlack implements ISender {
    readonly platform: Platform;
    private webClient;
    start(config: Record<string, unknown>): Promise<void>;
    send(target: string, content: string): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=SenderSlack.d.ts.map