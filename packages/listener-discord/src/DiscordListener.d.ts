import { Client } from 'discord.js';
import { IListener, Platform } from '@lessel/core';
/**
 * lessel Discord Listener
 * Connects to Discord via a bot token and emits message events
 * into the LES pipeline.
 */
export declare class DiscordListener extends IListener {
    readonly id: string;
    readonly platform: Platform;
    readonly client: Client;
    private token;
    private allowedChannels;
    private ignoreUsers;
    private connected;
    constructor(token: string, config?: {
        allowedChannels?: string[];
        ignoreUsers?: string[];
    });
    start(): Promise<void>;
    stop(): Promise<void>;
    isConnected(): boolean;
    configure(config: Record<string, unknown>): void;
    private handleMessage;
    private buildEvent;
}
//# sourceMappingURL=DiscordListener.d.ts.map