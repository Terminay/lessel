"use strict";
// ============================================================================
// lessel — Discord Sender
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
exports.SenderDiscord = void 0;
class SenderDiscord {
    platform = 'discord';
    client = null;
    async start(config) {
        const token = config.token;
        if (!token) {
            throw new Error('Discord sender requires a bot token');
        }
        try {
            const { Client } = await Promise.resolve().then(() => __importStar(require('discord.js')));
            const client = new Client({ intents: [] });
            await client.login(token);
            this.client = client;
        }
        catch (err) {
            throw new Error(`Failed to login Discord bot: ${err}`);
        }
    }
    async send(target, content) {
        if (!this.client) {
            throw new Error('Discord sender not initialized');
        }
        try {
            const channel = await this.client.channels.fetch(target);
            if (!channel) {
                throw new Error(`Channel not found: ${target}`);
            }
            await channel.send(content);
        }
        catch (err) {
            throw new Error(`Failed to send Discord message: ${err}`);
        }
    }
    async stop() {
        if (this.client) {
            await this.client.destroy();
            this.client = null;
        }
    }
}
exports.SenderDiscord = SenderDiscord;
//# sourceMappingURL=SenderDiscord.js.map