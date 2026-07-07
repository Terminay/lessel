import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  ChannelType,
} from 'discord.js';
import { IListener, MessageEvent, Platform } from '@lessel/core';
import crypto from 'crypto';

/**
 * lessel Discord Listener
 * Connects to Discord via a bot token and emits message events
 * into the LES pipeline.
 */
export class DiscordListener extends IListener {
  public readonly id: string;
  public readonly platform: Platform = 'discord';
  public readonly client: Client;

  private token: string;
  private allowedChannels: string[];
  private ignoreUsers: string[];
  private connected: boolean = false;

  constructor(token: string, config?: {
    allowedChannels?: string[];
    ignoreUsers?: string[];
  }) {
    super();
    this.id = 'discord-listener';
    this.token = token;
    this.allowedChannels = config?.allowedChannels || [];
    this.ignoreUsers = config?.ignoreUsers || [];

    // Determine intents
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ];

    this.client = new Client({
      intents,
    });

    this.client.once(Events.ClientReady, () => {
      this.connected = true;
      console.log(`[lessel] Discord connected as ${this.client.user?.tag}`);
    });

    this.client.on(Events.MessageCreate, (message: Message) => {
      this.handleMessage(message);
    });

    this.client.on('disconnect', () => {
      this.connected = false;
    });
  }

  async start(): Promise<void> {
    if (this.connected) return;

    try {
      await this.client.login(this.token);
    } catch (error: any) {
      console.error(`[lessel] Discord login failed: ${error.message}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.connected) return;
    this.connected = false;
    this.client.destroy();
    console.log('[lessel] Discord listener disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  configure(config: Record<string, unknown>): void {
    if (config.allowedChannels) {
      this.allowedChannels = config.allowedChannels as string[];
    }
    if (config.ignoreUsers) {
      this.ignoreUsers = config.ignoreUsers as string[];
    }
  }

  // ── Message handling ────────────────────────────────────────────

  private handleMessage(message: Message): void {
    // Ignore bot messages
    if (message.author.bot) return;

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

  private buildEvent(message: Message): MessageEvent {
    const raw: Record<string, unknown> = {
      id: message.id,
      channelId: message.channelId,
      channelName: message.channel.type === ChannelType.GuildText
        ? (message.channel as any).name
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
      id: crypto.randomUUID(),
      platform: 'discord',
      direction: 'inbound',
      raw,
      payload: {}, // Will be populated by schema matching in pipeline
      timestamp: new Date().toISOString(),
    };
  }
}