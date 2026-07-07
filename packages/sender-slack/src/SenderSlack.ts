// ============================================================================
// lessel — Slack Sender
// ============================================================================

import { ISender } from '@lessel/core';
import type { Platform } from '@lessel/core';

export class SenderSlack implements ISender {
  readonly platform: Platform = 'slack';
  private webClient: any = null;

  async start(config: Record<string, unknown>): Promise<void> {
    const token = config.token as string;
    if (!token) {
      throw new Error('Slack sender requires a bot token');
    }

    try {
      const { WebClient } = await import('@slack/web-api');
      this.webClient = new WebClient(token);
    } catch (err) {
      throw new Error(`Failed to initialise Slack client: ${err}`);
    }
  }

  async send(target: string, content: string): Promise<void> {
    if (!this.webClient) {
      throw new Error('Slack sender not initialised');
    }

    try {
      await this.webClient.chat.postMessage({
        channel: target,
        text: content,
      });
    } catch (err) {
      throw new Error(`Failed to send Slack message: ${err}`);
    }
  }

  async stop(): Promise<void> {
    this.webClient = null;
  }
}