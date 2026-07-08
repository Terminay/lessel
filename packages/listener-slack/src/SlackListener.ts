// ============================================================================
// lessel — Slack Listener
// ============================================================================

import { IListener, MessageEvent, Platform } from '@lessel/core';

export class SlackListener extends IListener {
  public readonly id: string;
  public readonly platform: Platform = 'slack';

  private app: any = null;
  private connected: boolean = false;
  private config: Record<string, unknown> = {};

  constructor() {
    super();
    this.id = 'slack-listener';
  }

  configure(config: Record<string, unknown>): void {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.connected) return;

    const token = this.config.token as string;
    const signingSecret = this.config.signingSecret as string;
    const appToken = this.config.appToken as string;

    if (!token || !signingSecret || !appToken) {
      throw new Error('Slack listener requires token, signingSecret, and appToken in config');
    }

    try {
      const { App } = await import('@slack/bolt');
      
      this.app = new App({
        token,
        signingSecret,
        appToken,
      });

      this.app.event('message', async ({ event, say }: any) => {
        if (event.bot_id || event.subtype) return;

        const messageEvent: MessageEvent = {
          id: `${event.channel}-${event.ts}`,
          platform: 'slack',
          direction: 'inbound',
          raw: event,
          payload: {
            content: event.text || '',
            channelId: event.channel,
            userId: event.user,
            ts: event.ts,
          },
          timestamp: new Date().toISOString(),
        };

        this.emit('message', messageEvent);
      });

      await this.app.start();
      this.connected = true;
      console.log('[slack-listener] Started');
    } catch (err) {
      throw new Error(`Failed to start Slack listener: ${err}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.connected) return;
    this.connected = false;
    if (this.app) {
      await this.app.stop();
    }
    console.log('[slack-listener] Stopped');
  }

  isConnected(): boolean {
    return this.connected;
  }
}