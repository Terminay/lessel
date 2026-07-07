// ============================================================================
// lessel — Discord Sender
// ============================================================================

import { ISender } from '@lessel/core';
import type { Platform } from '@lessel/core';

export class SenderDiscord implements ISender {
  readonly platform: Platform = 'discord';
  private client: any = null;

  async start(config: Record<string, unknown>): Promise<void> {
    const token = config.token as string;
    if (!token) {
      throw new Error('Discord sender requires a bot token');
    }

    try {
      const { Client } = await import('discord.js');
      const client = new Client({ intents: [] });

      await client.login(token);
      this.client = client;
    } catch (err) {
      throw new Error(`Failed to login Discord bot: ${err}`);
    }
  }

  async send(target: string, content: string): Promise<void> {
    if (!this.client) {
      throw new Error('Discord sender not initialized');
    }

    try {
      const channel = await this.client.channels.fetch(target);
      if (!channel) {
        throw new Error(`Channel not found: ${target}`);
      }
      await channel.send(content);
    } catch (err) {
      throw new Error(`Failed to send Discord message: ${err}`);
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }
  }
}