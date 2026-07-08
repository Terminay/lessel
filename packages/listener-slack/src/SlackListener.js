"use strict";
// ============================================================================
// lessel — Slack Listener
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackListener = void 0;
const core_1 = require("@lessel/core");
class SlackListener extends core_1.IListener {
    id;
    platform = 'slack';
    app = null;
    connected = false;
    config = {};
    constructor() {
        super();
        this.id = 'slack-listener';
    }
    configure(config) {
        this.config = config;
    }
    async start() {
        if (this.connected)
            return;
        const token = this.config.token;
        const signingSecret = this.config.signingSecret;
        const appToken = this.config.appToken;
        if (!token || !signingSecret || !appToken) {
            throw new Error('Slack listener requires token, signingSecret, and appToken in config');
        }
        try {
            const { App } = await Promise.resolve().then(() => __importStar(require('@slack/bolt')));
            this.app = new App({
                token,
                signingSecret,
                appToken,
            });
            this.app.event('message', async ({ event, say }) => {
                if (event.bot_id || event.subtype)
                    return;
                const messageEvent = {
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
        }
        catch (err) {
            throw new Error(`Failed to start Slack listener: ${err}`);
        }
    }
    async stop() {
        if (!this.connected)
            return;
        this.connected = false;
        if (this.app) {
            await this.app.stop();
        }
        console.log('[slack-listener] Stopped');
    }
    isConnected() {
        return this.connected;
    }
}
exports.SlackListener = SlackListener;
//# sourceMappingURL=SlackListener.js.map