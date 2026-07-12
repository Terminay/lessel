// ============================================================================
// lessel — Auto-Bootstrapper (Seamless Entry Point)
// Detects environment, auto-configures listeners/senders, and starts the
// pipeline with zero manual configuration.
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { Store } from './store/Store';
import { PipelineManager } from './pipeline/PipelineManager';
import { ApiServer } from './api/ApiServer';
import { Schema, Platform, LesselConfig } from './types';
import { ISender } from './sender/ISender';
import { IListener } from './listener/IListener';

// ── Platform Detection ─────────────────────────────────────────────
// Each platform defines what env vars to check, and how to dynamically
// import the listener/sender packages.

interface PlatformConfig {
  name: Platform;
  label: string;
  requiredEnv: string[];
  optionalEnv: Record<string, string>;
  listenerPackage: string;
  senderPackage: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    name: 'discord',
    label: 'Discord',
    requiredEnv: ['DISCORD_BOT_TOKEN'],
    optionalEnv: {
      DISCORD_ALLOWED_CHANNELS: '',
      DISCORD_IGNORE_USERS: '',
    },
    listenerPackage: '@lessel/listener-discord',
    senderPackage: '@lessel/sender-discord',
  },
  {
    name: 'slack',
    label: 'Slack',
    requiredEnv: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
    optionalEnv: {
      SLACK_ALLOWED_CHANNELS: '',
      SLACK_IGNORE_USERS: '',
    },
    listenerPackage: '@lessel/listener-slack',
    senderPackage: '@lessel/sender-slack',
  },
  {
    name: 'whatsapp',
    label: 'WhatsApp',
    requiredEnv: ['WHATSAPP_PHONE'],
    optionalEnv: {
      WHATSAPP_SESSION: '',
      WHATSAPP_ALLOWED_NUMBERS: '',
    },
    listenerPackage: '@lessel/listener-whatsapp',
    senderPackage: '@lessel/sender-whatsapp',
  },
];

/**
 * Detect which platforms are configured via environment variables.
 */
export function detectPlatforms(): PlatformConfig[] {
  const detected: PlatformConfig[] = [];

  for (const platform of PLATFORMS) {
    const allPresent = platform.requiredEnv.every((env) => {
      const val = process.env[env];
      return val && val.length > 0 && !val.includes('your_');
    });
    if (allPresent) {
      detected.push(platform);
    }
  }

  return detected;
}

/**
 * Generate a catch-all schema for a given platform.
 * Matches everything, stores messages, extracts basic fields.
 */
export function generateCatchAllSchema(platform: Platform, index: number): Schema {
  const extractByPlatform: Record<string, Array<{ key: string; path: string }>> = {
    discord: [
      { key: 'content', path: 'content' },
      { key: 'author', path: 'authorName' },
      { key: 'channel', path: 'channelName' },
      { key: 'channelId', path: 'channelId' },
    ],
    slack: [
      { key: 'content', path: 'text' },
      { key: 'author', path: 'user' },
      { key: 'channel', path: 'channel' },
      { key: 'channelId', path: 'channel' },
    ],
    whatsapp: [
      { key: 'content', path: 'body' },
      { key: 'author', path: 'from' },
      { key: 'channel', path: 'from' },
      { key: 'channelId', path: 'from' },
    ],
  };

  return {
    name: `catch-all-${platform}`,
    description: `Auto-generated catch-all schema for ${platform}. Matches all messages.`,
    platforms: [platform],
    filters: [],
    extract: extractByPlatform[platform] || [{ key: 'raw', path: '' }],
    store: true,
  };
}

/**
 * Auto-generate a lessel.config.json file based on detected platforms.
 */
export function generateConfig(detectedPlatforms: PlatformConfig[]): LesselConfig {
  const schemas: Schema[] = detectedPlatforms.map((p, i) => generateCatchAllSchema(p.name, i));
  const plugins = detectedPlatforms.map((p) => p.listenerPackage);

  const config: LesselConfig = {
    port: parseInt(process.env.LESSEL_API_PORT || '3100', 10),
    schemas,
    apiKeys: [],
    plugins,
    listeners: {},
    senders: {},
  };

  for (const platform of detectedPlatforms) {
    if (platform.name === 'discord') {
      config.listeners!.discord = {
        token: process.env.DISCORD_BOT_TOKEN || '',
        allowedChannels: process.env.DISCORD_ALLOWED_CHANNELS?.split(',').filter(Boolean),
        ignoreUsers: process.env.DISCORD_IGNORE_USERS?.split(',').filter(Boolean),
      };
    }
    if (platform.name === 'slack') {
      (config.listeners! as any).slack = {
        botToken: process.env.SLACK_BOT_TOKEN,
        appToken: process.env.SLACK_APP_TOKEN,
        allowedChannels: process.env.SLACK_ALLOWED_CHANNELS?.split(',').filter(Boolean),
        ignoreUsers: process.env.SLACK_IGNORE_USERS?.split(',').filter(Boolean),
      };
    }
    if (platform.name === 'whatsapp') {
      (config.listeners! as any).whatsapp = {
        phoneNumber: process.env.WHATSAPP_PHONE,
        sessionPath: process.env.WHATSAPP_SESSION || './whatsapp-session',
        allowedNumbers: process.env.WHATSAPP_ALLOWED_NUMBERS?.split(',').filter(Boolean),
      };
    }
    // Auto-enable senders for detected platforms
    if (platform.name === 'discord') {
      config.senders!.discord = { enabled: true };
    }
    if (platform.name === 'slack') {
      config.senders!.slack = { enabled: true };
    }
    if (platform.name === 'whatsapp') {
      config.senders!.whatsapp = { enabled: true, phoneNumber: process.env.WHATSAPP_PHONE };
    }
  }

  return config;
}

/**
 * Try to dynamically import a package.
 * Returns undefined if not installed.
 */
async function tryImport(packageName: string): Promise<any> {
  try {
    return await import(packageName);
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(packageName);
      return mod.default || mod;
    } catch {
      return undefined;
    }
  }
}

// ── Main Boot Function ────────────────────────────────────────────

export interface BootstrapOptions {
  /** Path to config file (optional — if not set, auto-detect) */
  configPath?: string;
  /** Database path */
  dbPath?: string;
  /** API port (overrides config) */
  port?: number;
  /** Allow no config — auto-generate from env */
  allowAutoGenerate?: boolean;
}

export interface BootstrapResult {
  store: Store;
  pipeline: PipelineManager;
  api: ApiServer;
  detectedPlatforms: PlatformConfig[];
  config: LesselConfig;
}

/**
 * Bootstrap lessel with automatic detection and configuration.
 * This is the primary entry point — handles all platforms seamlessly.
 */
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║           lessel — v0.1.0                ║');
  console.log('║   Listen . Execute . Send                ║');
  console.log('╚══════════════════════════════════════════╝');

  // ── 1. Detect platforms from env ─────────────────────
  const detectedPlatforms = detectPlatforms();

  if (detectedPlatforms.length === 0) {
    console.warn('[lessel] ⚠ No platforms detected via environment variables.');
    console.warn('[lessel]   Set at least one: DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN, or WHATSAPP_PHONE');
  } else {
    console.log(`[lessel] Detected ${detectedPlatforms.length} platform(s): ${detectedPlatforms.map(p => p.label).join(', ')}`);
  }

  // ── 2. Load or auto-generate config ──────────────────
  const configPath = options.configPath || process.env.LESSEL_CONFIG || path.join(process.cwd(), 'lessel.config.json');
  let config: LesselConfig;
  let configLoadedFromFile = false;

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as LesselConfig;
    config = parsed;
    configLoadedFromFile = true;
    console.log(`[lessel] Config loaded: ${configPath}`);
  } catch {
    if (options.allowAutoGenerate === false && detectedPlatforms.length === 0) {
      throw new Error(
        `No config found at ${configPath} and no platforms detected. ` +
        `Set environment variables or create lessel.config.json`
      );
    }
    config = generateConfig(detectedPlatforms);
    console.log(`[lessel] No config found. Auto-generated from environment.`);
  }

  // Merge port override
  if (options.port) config.port = options.port;

  // ── 3. Initialise store ─────────────────────────────
  const dbPath = options.dbPath || process.env.LESSEL_DB_PATH || path.join(process.cwd(), 'data', 'lessel.db');
  const store = new Store(dbPath);
  console.log(`[lessel] SQLite store ready: ${dbPath}`);

  // ── 4. Seed schemas ────────────────────────────────
  const existingSchemas = store.getAllSchemas();
  if (existingSchemas.length === 0 && config.schemas) {
    for (const schema of config.schemas) {
      store.saveSchema(schema);
      console.log(`[lessel] Schema loaded: "${schema.name}" (${schema.platforms.join(', ')})`);
    }
  } else if (existingSchemas.length === 0) {
    // No schemas at all — create catch-all schemas for detected platforms
    for (let i = 0; i < detectedPlatforms.length; i++) {
      const schema = generateCatchAllSchema(detectedPlatforms[i].name, i);
      store.saveSchema(schema);
      console.log(`[lessel] Auto-created catch-all schema: "${schema.name}"`);
    }
  } else {
    console.log(`[lessel] ${existingSchemas.length} schema(s) loaded from store`);
  }

  // ── 5. Seed API keys from config ──────────────────
  if (config.apiKeys) {
    for (const keyInput of config.apiKeys) {
      const existing = store.listApiKeys();
      if (!existing.find((k: any) => k.label === keyInput.label)) {
        const result = store.createApiKey(keyInput.label);
        console.log(`[lessel] API key created: ${keyInput.label} -> ${result.rawKey}`);
        console.log('   Save this key, it will not be shown again.');
      }
    }
  }

  // ── 6. Pipeline ──────────────────────────────────
  const pipeline = new PipelineManager(store);

  // Load plugins from config
  if (config.plugins && config.plugins.length > 0) {
    pipeline.loadPlugins(config.plugins);
  }

  // Also auto-scan node_modules for @lessel/plugin-* packages
  const autoPlugins = pipeline.getPluginLoader().scanNodeModules();
  if (autoPlugins.length > 0) {
    pipeline.loadPlugins(autoPlugins);
  }

  // Auto-scan local plugins/ directory for registry-installed plugins
  const localPlugins = pipeline.getPluginLoader().scanLocalPluginsDir();
  if (localPlugins.length > 0) {
    pipeline.loadPlugins(localPlugins);
  }

  // ── 7. Register listeners for each detected platform ──
  for (const platform of detectedPlatforms) {
    await registerListenerForPlatform(platform, pipeline, config);
  }

  // ── 8. Register senders ──────────────────────────
  for (const platform of detectedPlatforms) {
    await registerSenderForPlatform(platform, pipeline);
  }

  // ── 9. Start pipeline ───────────────────────────
  await pipeline.start(config as any);

  // ── 10. API server ──────────────────────────────
  const apiPort = config.port || 3100;
  const api = new ApiServer(store, apiPort);
  await api.start();

  // ── 11. Print status ────────────────────────────
  console.log();
  console.log('[lessel] ════════════════════════════════');
  console.log('[lessel]  lessel is running!');
  console.log(`[lessel]  API:      http://localhost:${apiPort}`);
  console.log(`[lessel]  Health:   http://localhost:${apiPort}/health`);
  console.log(`[lessel]  Platforms: ${detectedPlatforms.map(p => p.label).join(', ') || 'none'}`);
  console.log(`[lessel]  Schemas:  ${store.getAllSchemas().length}`);
  console.log(`[lessel]  Plugins:  ${pipeline.getPluginLoader().getAll().length}`);
  console.log('[lessel] ════════════════════════════════');
  console.log();

  return { store, pipeline, api, detectedPlatforms, config };
}

/**
 * Dynamically import and register a listener for a platform.
 */
async function registerListenerForPlatform(
  platform: PlatformConfig,
  pipeline: PipelineManager,
  config: LesselConfig
): Promise<void> {
  const mod = await tryImport(platform.listenerPackage);
  if (!mod) {
    console.warn(`[lessel] ⚠ ${platform.label} listener package not installed: ${platform.listenerPackage}`);
    console.warn(`   Install: npm install ${platform.listenerPackage}`);
    return;
  }

  // Try <Platform>Listener or default export
  const className = `${platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}Listener`;
  const ListenerClass = mod[className] || mod.default || mod;

  if (!ListenerClass || typeof ListenerClass !== 'function') {
    console.warn(`[lessel] ⚠ ${platform.label} listener module has no export named "${className}"`);
    return;
  }

  try {
    const listenerConfig = (config.listeners as any)?.[platform.name] || {};
    let listener: IListener;

    if (platform.name === 'discord') {
      listener = new ListenerClass(process.env.DISCORD_BOT_TOKEN || '', {
        allowedChannels: listenerConfig.allowedChannels || [],
        ignoreUsers: listenerConfig.ignoreUsers || [],
      });
    } else if (platform.name === 'slack') {
      listener = new ListenerClass(
        process.env.SLACK_BOT_TOKEN || '',
        process.env.SLACK_APP_TOKEN || '',
        {
          allowedChannels: listenerConfig.allowedChannels || [],
          ignoreUsers: listenerConfig.ignoreUsers || [],
        }
      );
    } else if (platform.name === 'whatsapp') {
      listener = new ListenerClass(
        process.env.WHATSAPP_PHONE || '',
        {
          sessionPath: process.env.WHATSAPP_SESSION || './whatsapp-session',
          allowedNumbers: listenerConfig.allowedNumbers || [],
        }
      );
    } else {
      listener = new ListenerClass(listenerConfig);
    }

    pipeline.registerListener(listener);
  } catch (err) {
    console.error(`[lessel] ✗ Failed to start ${platform.label} listener:`, (err as Error).message);
  }
}

/**
 * Dynamically import and register a sender for a platform.
 */
async function registerSenderForPlatform(
  platform: PlatformConfig,
  pipeline: PipelineManager
): Promise<void> {
  const mod = await tryImport(platform.senderPackage);
  if (!mod) {
    console.warn(`[lessel] ⚠ ${platform.label} sender package not installed: ${platform.senderPackage}`);
    console.warn(`   Install: npm install ${platform.senderPackage}`);
    return;
  }

  const className = `Sender${platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}`;
  const SenderClass = mod[className] || mod.default || mod;

  if (!SenderClass || typeof SenderClass !== 'function') {
    console.warn(`[lessel] ⚠ ${platform.label} sender module has no export named "${className}"`);
    return;
  }

  try {
    const sender: ISender = new SenderClass();
    const senderLoader = (pipeline as any).senderLoader;
    if (senderLoader && typeof senderLoader.register === 'function') {
      senderLoader.register(sender);
      console.log(`[lessel] ✔ ${platform.label} sender registered`);
    }
  } catch (err) {
    console.error(`[lessel] ✗ Failed to register ${platform.label} sender:`, (err as Error).message);
  }
}

/**
 * CLI-friendly startup — handles shutdown gracefully.
 */
export async function run(options: BootstrapOptions = {}): Promise<void> {
  try {
    const result = await bootstrap(options);

    // Handle shutdown
    const shutdown = async () => {
      console.log('\n[lessel] Shutting down...');
      await result.pipeline.stop();
      result.store.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[lessel] Fatal error:', error);
    process.exit(1);
  }
}