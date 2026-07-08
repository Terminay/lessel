"use strict";
// ============================================================================
// lessel — WhatsApp Listener
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
exports.WhatsAppListener = void 0;
const core_1 = require("@lessel/core");
class WhatsAppListener extends core_1.IListener {
    id;
    platform = 'whatsapp';
    client = null;
    connected = false;
    config = {};
    constructor() {
        super();
        this.id = 'whatsapp-listener';
    }
    configure(config) {
        this.config = config;
    }
    async start() {
        if (this.connected)
            return;
        const sessionPath = this.config.sessionPath || './data/whatsapp-session';
        try {
            const { default: makeWASocket, useMultiFileAuthState } = await Promise.resolve().then(() => __importStar(require('@whiskeysockets/baileys')));
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            this.client = await makeWASocket({
                auth: state,
                browser: ['lessel', 'Firefox', '1.0.0'],
                printQRInTerminal: true,
                syncFullHistory: false,
                markOnlineOnConnect: false,
            });
            this.client.ev.on('creds.update', saveCreds);
            this.client.ev.on('connection.update', (update) => {
                const { connection } = update;
                if (connection === 'close') {
                    console.log('[whatsapp-listener] Connection closed, reconnecting...');
                    this.connected = false;
                }
                else if (connection === 'open') {
                    this.connected = true;
                    console.log('[whatsapp-listener] Connected to WhatsApp');
                }
            });
            this.client.ev.on('messages.upsert', ({ messages, type }) => {
                if (type !== 'notify')
                    return;
                for (const msg of messages) {
                    if (!msg.message || msg.key.fromMe)
                        continue;
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                    const messageEvent = {
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
        }
        catch (err) {
            throw new Error(`Failed to start WhatsApp listener: ${err}`);
        }
    }
    async stop() {
        if (!this.connected)
            return;
        this.connected = false;
        if (this.client) {
            await this.client.logout();
            this.client = null;
        }
        console.log('[whatsapp-listener] Stopped');
    }
    isConnected() {
        return this.connected;
    }
}
exports.WhatsAppListener = WhatsAppListener;
//# sourceMappingURL=WhatsAppListener.js.map