"use strict";
// ============================================================================
// lessel — Sender Loader
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderLoader = void 0;
/**
 * Registry + factory for platform senders.
 * Senders must be registered before the pipeline starts.
 */
class SenderLoader {
    senders = new Map();
    /**
     * Register a sender instance directly (called from app.ts).
     */
    register(sender) {
        this.senders.set(sender.platform, sender);
        console.log(`[sender-loader] Registered sender: ${sender.platform}`);
    }
    async startAll(config) {
        const sendersConfig = config.senders;
        if (!sendersConfig)
            return;
        for (const [platform, senderConfig] of Object.entries(sendersConfig)) {
            if (!senderConfig || !('enabled' in senderConfig && senderConfig.enabled))
                continue;
            const sender = this.senders.get(platform);
            if (sender) {
                try {
                    await sender.start(senderConfig);
                    console.log(`[sender-loader] Started sender: ${platform}`);
                }
                catch (err) {
                    console.error(`[sender-loader] Failed to start ${platform} sender:`, err);
                }
            }
        }
    }
    getSendFn() {
        return this.send.bind(this);
    }
    async send(platform, target, content) {
        const sender = this.senders.get(platform);
        if (!sender) {
            throw new Error(`No sender loaded for platform: ${platform}`);
        }
        await sender.send(target, content);
    }
    async stop() {
        const stops = Array.from(this.senders.values()).map((s) => s.stop());
        await Promise.all(stops);
        this.senders.clear();
    }
}
exports.SenderLoader = SenderLoader;
//# sourceMappingURL=SenderLoader.js.map