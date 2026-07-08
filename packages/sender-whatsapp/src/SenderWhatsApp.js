"use strict";
// ============================================================================
// lessel — WhatsApp Sender
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
exports.SenderWhatsApp = void 0;
class SenderWhatsApp {
    platform = 'whatsapp';
    client = null;
    async start(config) {
        const sessionPath = config.sessionPath || './data/whatsapp-session';
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
                    console.log('[whatsapp-sender] Connection closed, reconnecting...');
                }
                else if (connection === 'open') {
                    console.log('[whatsapp-sender] Connected to WhatsApp');
                }
            });
        }
        catch (err) {
            throw new Error(`Failed to initialise WhatsApp client: ${err}`);
        }
    }
    async send(target, content) {
        if (!this.client) {
            throw new Error('WhatsApp sender not initialised');
        }
        try {
            await this.client.sendMessage(target, { text: content });
        }
        catch (err) {
            throw new Error(`Failed to send WhatsApp message: ${err}`);
        }
    }
    async stop() {
        if (this.client) {
            await this.client.logout();
            this.client = null;
        }
    }
}
exports.SenderWhatsApp = SenderWhatsApp;
//# sourceMappingURL=SenderWhatsApp.js.map