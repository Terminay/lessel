// ============================================================================
// lessel — WhatsApp Sender
// ============================================================================

import { ISender } from '@lessel/core';
import type { Platform } from '@lessel/core';

export class SenderWhatsApp implements ISender {
  readonly platform: Platform = 'whatsapp';
  private client: any = null;

  async start(config: Record<string, unknown>): Promise<void> {
    const sessionPath = config.sessionPath as string || './data/whatsapp-session';
    
    try {
      const { default: makeWASocket } = await import('@whiskeysockets/baileys');
      
      this.client = await makeWASocket({
        session: { session: sessionPath },
        printQRInTerminal: false,
      });

      this.client.ev.on('connection.update', (update: any) => {
        const { connection } = update;
        if (connection === 'close') {
          console.log('[whatsapp-sender] Connection closed, reconnecting...');
        } else if (connection === 'open') {
          console.log('[whatsapp-sender] Connected to WhatsApp');
        }
      });
    } catch (err) {
      throw new Error(`Failed to initialise WhatsApp client: ${err}`);
    }
  }

  async send(target: string, content: string): Promise<void> {
    if (!this.client) {
      throw new Error('WhatsApp sender not initialised');
    }

    try {
      await this.client.sendMessage(target, { text: content });
    } catch (err) {
      throw new Error(`Failed to send WhatsApp message: ${err}`);
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
  }
}