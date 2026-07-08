import dotenv from 'dotenv';
dotenv.config();

import { Store, PipelineManager, ApiServer } from '@lessel/core';
import { DiscordListener } from './DiscordListener';
import path from 'path';
import fs from 'fs';

/**
 * lessel — Main Application Entry Point
 *
 * Boot sequence:
 *   1. Initialise SQLite store
 *   2. Load schemas & API keys
 *   3. Set up Discord listener
 *   4. Wire pipeline
 *   5. Start API server
 */

async function main() {
  console.log('==========================================');
  console.log('        lessel v0.1.0');
  console.log('   Listen . Execute . Send');
  console.log('==========================================');

  // ── 1. Store ──────────────────────────────────────────────────
  const dbPath = process.env.LESSEL_DB_PATH || path.join(process.cwd(), 'data', 'lessel.db');
  const store = new Store(dbPath);
  console.log(`[lessel] SQLite store ready: ${dbPath}`);

  // ── 2. Seed default schemas, API keys & plugins from config ──
  const configPath = process.env.LESSEL_CONFIG || path.join(process.cwd(), 'lessel.config.json');
  let configPlugins: string[] = [];
  let config: Record<string, unknown> = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as any;
    config = parsed;
    if (parsed.schemas) {
      for (const schema of parsed.schemas) {
        store.saveSchema(schema);
        console.log(`[lessel] Schema loaded: ${schema.name}`);
      }
    }
    // Seed API keys from config
    if (parsed.apiKeys) {
      for (const keyInput of parsed.apiKeys) {
        const existing = store.listApiKeys();
        if (!existing.find((k: any) => k.label === keyInput.label)) {
          const result = store.createApiKey(keyInput.label);
          console.log(`[lessel] API key created: ${keyInput.label} -> ${result.rawKey}`);
          console.log(`   Save this key, it will not be shown again.`);
        }
      }
    }
    // Read plugins list
    if (parsed.plugins) {
      configPlugins = parsed.plugins as string[];
    }
  } catch (err) {
    console.log(`[lessel] No lessel.config.json found, using defaults (${(err as Error).message})`);
  }

  // ── 3. Pipeline ──────────────────────────────────────────────
  const pipeline = new PipelineManager(store);

  // Load plugins from config (npm packages or local paths)
  if (configPlugins.length > 0) {
    pipeline.loadPlugins(configPlugins);
  }
  // Also auto-scan node_modules for @lessel/plugin-* packages
  const autoPlugins = pipeline.getPluginLoader().scanNodeModules();
  if (autoPlugins.length > 0) {
    pipeline.loadPlugins(autoPlugins);
  }

  // ── 4. Discord Listener ──────────────────────────────────────
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('[lessel] DISCORD_BOT_TOKEN not set. Discord listener disabled.');
  } else {
    const discordListener = new DiscordListener(token, {
      allowedChannels: process.env.DISCORD_ALLOWED_CHANNELS
        ? process.env.DISCORD_ALLOWED_CHANNELS.split(',')
        : [],
      ignoreUsers: process.env.DISCORD_IGNORE_USERS
        ? process.env.DISCORD_IGNORE_USERS.split(',')
        : [],
    });
    pipeline.registerListener(discordListener);
  }

  // ── 5. Start Pipeline ────────────────────────────────────────
  await pipeline.start(config);

  // ── 6. API Server ────────────────────────────────────────────
  const apiPort = parseInt(process.env.LESSEL_API_PORT || '3100', 10);
  const api = new ApiServer(store, apiPort);
  await api.start();

  // ── 7. Handle Shutdown ────────────────────────────────────────
  const shutdown = async () => {
    console.log('\n[lessel] Shutting down...');
    await pipeline.stop();
    store.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`\n[lessel] lessel is running!`);
  console.log(`   API:      http://localhost:${apiPort}`);
  console.log(`   Health:   http://localhost:${apiPort}/health`);
  console.log();
}

main().catch((error) => {
  console.error('[lessel] Fatal error:', error);
  process.exit(1);
});
