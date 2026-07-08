// ============================================================================
// lessel — WhatsApp Listener
// ============================================================================

import { IListener, MessageEvent, Platform } from '@lessel/core';

export class WhatsAppListener extends IListener {
  public readonly id: string;
  public readonly platform: Platform = 'whatsapp';

  private client: any = null;
  private connected: boolean = false;
  private config: Record<string, unknown> = {};

  constructor() {
    super();
    this.id = 'whatsapp-listener';
  }

  configure(config: Record<string, unknown>): void {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.connected) return;

    const sessionPath = (this.config.sessionPath as string) || './data/whatsapp-session';

    try {
      const { default: makeWASocket } = await import('@whiskeysockets/baileys');

      this.client = await makeWASocket({
        browser: ['lessel', 'Firefox', '1.0.0'],
        printQRInTerminal: true,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      this.client.ev.on('connection.update', (update: any) => {
        const { connection } = update;
        if (connection === 'close') {
          console.log('[whatsapp-listener] Connection closed, reconnecting...');
          this.connected = false;
        } else if (connection === 'open') {
          this.connected = true;
          console.log('[whatsapp-listener] Connected to WhatsApp');
        }
      });

      this.client.ev.on('messages.upsert', ({ messages, type }: any) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

          const messageEvent: MessageEvent = {
            id: msg.key.id,
            platform: 'whatsapp',
            direction: 'inbound',
            raw: msg,
            payload: {
              content: text,
              from: msg.key.remoteJid,
              fromMe: msg.key.fromMe,
            },
            timestamp: new Date().toISOString(),
          };

          this.emit('message', messageEvent);
        }
      });
    } catch (err) {
      throw new Error(`Failed to start WhatsApp listener: ${err}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.connected) return;
    this.connected = false;
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
    console.log('[whatsapp-listener] Stopped');
  }

  isConnected(): boolean {
    return this.connected;
  }
}