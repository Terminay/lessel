import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { Store, detectPlatforms, generateCatchAllSchema } from '@lessel/core';

/**
 * "lessel status" — Shows pipeline health and configuration overview.
 */
export async function runStatus(): Promise<void> {
  const cwd = process.cwd();
  const configPath = process.env.LESSEL_CONFIG || path.join(cwd, 'lessel.config.json');
  const dbPath = process.env.LESSEL_DB_PATH || path.join(cwd, 'data', 'lessel.db');

  console.log('╔══════════════════════════════════════════╗');
  console.log('║        lessel — Status Report            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  // ── Environment Detection ──────────────────────────
  const detected = detectPlatforms();
  console.log('📡 Platforms:');
  if (detected.length === 0) {
    console.log('   ⚠ No platforms detected');
  } else {
    for (const p of detected) {
      console.log(`   ✔ ${p.label} (${p.requiredEnv.join(', ')})`);
    }
  }
  console.log();

  // ── Config File ────────────────────────────────────
  console.log('📄 Config:');
  if (fs.existsSync(configPath)) {
    console.log(`   ✔ ${configPath}`);
  } else {
    console.log(`   ⚠ No config file at ${configPath}`);
    console.log('     (lessel will auto-generate from env vars)');
  }
  console.log();

  // ── Database ───────────────────────────────────────
  console.log('🗄️  Database:');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`   ✔ ${dbPath} (${sizeKB} KB)`);
  } else {
    console.log(`   ○ ${dbPath} (will be created on start)`);
  }
  console.log();

  // ── Schemas ────────────────────────────────────────
  console.log('📋 Schemas:');
  try {
    const store = new Store(dbPath);
    const schemas = store.getAllSchemas();
    if (schemas.length === 0) {
      console.log('   ○ No schemas yet (catch-all will be auto-created)');
      if (detected.length > 0) {
        for (const p of detected) {
          const schema = generateCatchAllSchema(p.name, 0);
          console.log(`   → Will create: "${schema.name}" for ${p.label}`);
        }
      }
    } else {
      for (const s of schemas) {
        const filterCount = s.filters?.length || 0;
        const extractCount = s.extract?.length || 0;
        console.log(`   ✔ "${s.name}" (${s.platforms.join(', ')}) — ${filterCount} filter(s), ${extractCount} extraction(s), store: ${s.store}`);
      }
    }
    store.close();
  } catch {
    console.log('   ⚠ Could not open database');
  }
  console.log();

  // ── Environment Variables ──────────────────────────
  console.log('🔑 Environment:');
  const envVars = [
    'DISCORD_BOT_TOKEN',
    'SLACK_BOT_TOKEN',
    'SLACK_APP_TOKEN',
    'WHATSAPP_PHONE',
    'LESSEL_API_PORT',
    'LESSEL_WEBHOOK_URL',
  ];
  for (const env of envVars) {
    const val = process.env[env];
    if (val && !val.includes('your_')) {
      const masked = val.length > 8 ? val.slice(0, 4) + '...' + val.slice(-4) : '***';
      console.log(`   ✔ ${env}=${masked}`);
    } else {
      console.log(`   ○ ${env} (not set)`);
    }
  }
  console.log();

  // ── Summary ────────────────────────────────────────
  console.log('📊 Summary:');
  console.log(`   Platforms ready: ${detected.length}`);
  console.log(`   Config file:     ${fs.existsSync(configPath) ? 'Yes' : 'No (auto)'}`);
  console.log(`   Database:        ${fs.existsSync(dbPath) ? 'Exists' : 'Not yet'}`);
  console.log();
  console.log('Run `lessel start` to start the pipeline.');
}