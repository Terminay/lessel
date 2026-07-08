// ============================================================================
// lessel — Sender Loader
// ============================================================================

import { ISender } from './ISender';

/**
 * Registry + factory for platform senders.
 * Senders must be registered before the pipeline starts.
 */
export class SenderLoader {
  private senders: Map<string, ISender> = new Map();

  /**
   * Register a sender instance directly (called from app.ts).
   */
  register(sender: ISender): void {
    this.senders.set(sender.platform, sender);
    console.log(`[sender-loader] Registered sender: ${sender.platform}`);
  }

  async startAll(config: Record<string, unknown> & { senders?: Record<string, Record<string, unknown>> }): Promise<void> {
    const sendersConfig = config.senders;
    if (!sendersConfig) return;

    for (const [platform, senderConfig] of Object.entries(sendersConfig)) {
      if (!senderConfig || !('enabled' in senderConfig && senderConfig.enabled)) continue;

      const sender = this.senders.get(platform);
      if (sender) {
        try {
          await sender.start(senderConfig);
          console.log(`[sender-loader] Started sender: ${platform}`);
        } catch (err) {
          console.error(`[sender-loader] Failed to start ${platform} sender:`, err);
        }
      }
    }
  }

  getSendFn(): (platform: string, target: string, content: string) => Promise<void> {
    return this.send.bind(this);
  }

  private async send(platform: string, target: string, content: string): Promise<void> {
    const sender = this.senders.get(platform);
    if (!sender) {
      throw new Error(`No sender loaded for platform: ${platform}`);
    }
    await sender.send(target, content);
  }

  async stop(): Promise<void> {
    const stops = Array.from(this.senders.values()).map((s) => s.stop());
    await Promise.all(stops);
    this.senders.clear();
  }
}