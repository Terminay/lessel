"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordListener = void 0;
const discord_js_1 = require("discord.js");
const core_1 = require("@lessel/core");
const crypto_1 = __importDefault(require("crypto"));
/**
 * lessel Discord Listener
 * Connects to Discord via a bot token and emits message events
 * into the LES pipeline.
 */
class DiscordListener extends core_1.IListener {
    id;
    platform = 'discord';
    client;
    token;
    allowedChannels;
    ignoreUsers;
    connected = false;
    constructor(token, config) {
        super();
        this.id = 'discord-listener';
        this.token = token;
        this.allowedChannels = config?.allowedChannels || [];
        this.ignoreUsers = config?.ignoreUsers || [];
        // Determine intents
        const intents = [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.MessageContent,
        ];
        this.client = new discord_js_1.Client({
            intents,
        });
        this.client.once(discord_js_1.Events.ClientReady, () => {
            this.connected = true;
            console.log(`[lessel] Discord connected as ${this.client.user?.tag}`);
        });
        this.client.on(discord_js_1.Events.MessageCreate, (message) => {
            this.handleMessage(message);
        });
        this.client.on('disconnect', () => {
            this.connected = false;
        });
    }
    async start() {
        if (this.connected)
            return;
        try {
            await this.client.login(this.token);
        }
        catch (error) {
            console.error(`[lessel] Discord login failed: ${error.message}`);
            throw error;
        }
    }
    async stop() {
        if (!this.connected)
            return;
        this.connected = false;
        this.client.destroy();
        console.log('[lessel] Discord listener disconnected');
    }
    isConnected() {
        return this.connected;
    }
    configure(config) {
        if (config.allowedChannels) {
            this.allowedChannels = config.allowedChannels;
        }
        if (config.ignoreUsers) {
            this.ignoreUsers = config.ignoreUsers;
        }
    }
    // ── Message handling ────────────────────────────────────────────
    handleMessage(message) {
        // Ignore bot messages
        if (message.author.bot)
            return;
        // Filter by allowed channels
        if (this.allowedChannels.length > 0 && !this.allowedChannels.includes(message.channelId)) {
            return;
        }
        // Filter by ignored users
        if (this.ignoreUsers.includes(message.author.id)) {
            return;
        }
        const event = this.buildEvent(message);
        this.emit('message', event);
    }
    buildEvent(message) {
        const raw = {
            id: message.id,
            channelId: message.channelId,
            channelName: message.channel.type === discord_js_1.ChannelType.GuildText
                ? message.channel.name
                : undefined,
            guildId: message.guildId,
            authorId: message.author.id,
            authorName: message.author.username,
            authorGlobalName: message.author.globalName,
            content: message.content,
            cleanContent: message.cleanContent,
            timestamp: message.createdTimestamp,
            attachments: message.attachments.map((a) => ({
                id: a.id,
                url: a.url,
                name: a.name,
                size: a.size,
                contentType: a.contentType,
            })),
            embeds: message.embeds.map((e) => ({
                title: e.title,
                description: e.description,
                url: e.url,
                color: e.color,
                fields: e.fields?.map((f) => ({ name: f.name, value: f.value, inline: f.inline })),
            })),
            mentions: {
                users: message.mentions.users.map((u) => u.id),
                roles: message.mentions.roles.map((r) => r.id),
            },
            reference: message.reference?.messageId || null,
            messageType: message.type,
        };
        return {
            id: crypto_1.default.randomUUID(),
            platform: 'discord',
            direction: 'inbound',
            raw,
            payload: {}, // Will be populated by schema matching in pipeline
            timestamp: new Date().toISOString(),
        };
    }
}
exports.DiscordListener = DiscordListener;
//# sourceMappingURL=DiscordListener.js.map