// ============================================================================
// lessel — Sender Loader
// ============================================================================

import { ISender } from './ISender';

/**
 * Registry + factory for platform senders.
 * Reads `lessel.config.json` senders block and instantiates them.
 */
export class SenderLoader {
  private senders: Map<string, ISender> = new Map();

  async load(
    config: Record<string, unknown> & { senders?: Record<string, Record<string, unknown>> }
  ): Promise<(platform: string, target: string, content: string) => Promise<void>> {
    const sendersConfig = config.senders;

    if (!sendersConfig) {
      return this.noopSend;
    }

    for (const [platform, senderConfig] of Object.entries(sendersConfig)) {
      if (!senderConfig || !('enabled' in senderConfig && senderConfig.enabled)) continue;

      let sender: ISender | null = null;

      switch (platform) {
        case 'discord': {
          const { SenderDiscord } = await import('@lessel/sender-discord');
          sender = new SenderDiscord();
          break;
        }
        case 'slack': {
          const { SenderSlack } = await import('@lessel/sender-slack');
          sender = new SenderSlack();
          break;
        }
        case 'whatsapp': {
          const { SenderWhatsApp } = await import('@lessel/sender-whatsapp');
          sender = new SenderWhatsApp();
          break;
        }
        default:
          console.warn(`[sender-loader] Unknown platform: ${platform}`);
      }

      if (sender) {
        try {
          await sender.start(senderConfig);
          this.senders.set(platform, sender);
          console.log(`[sender-loader] Loaded sender: ${platform}`);
        } catch (err) {
          console.error(`[sender-loader] Failed to start ${platform} sender:`, err);
        }
      }
    }

    return this.send.bind(this);
  }

  private async send(platform: string, target: string, content: string): Promise<void> {
    const sender = this.senders.get(platform);
    if (!sender) {
      throw new Error(`No sender loaded for platform: ${platform}`);
    }
    await sender.send(target, content);
  }

  private async noopSend(_platform: string, _target: string, _content: string): Promise<void> {
    // no senders configured
  }

  async stop(): Promise<void> {
    const stops = Array.from(this.senders.values()).map((s) => s.stop());
    await Promise.all(stops);
    this.senders.clear();
  }
}