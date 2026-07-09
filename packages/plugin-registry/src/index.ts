// ============================================================================
// lessel Plugin Registry Server
// Community plugin registry for lessel.
// Hosts plugins that are downloaded via `lessel plugin install`.
// ============================================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import {
  RegistryPlugin,
  PluginVersion,
  RegistryApiKey,
  PublishRequest,
  SearchQuery,
} from './types';

// ── Configuration ─────────────────────────────────────────────────
const PORT = parseInt(process.env.REGISTRY_PORT || '3456', 10);
const DATA_DIR = process.env.REGISTRY_DATA_DIR || path.join(process.cwd(), 'registry-data');
const PLUGINS_DIR = path.join(DATA_DIR, 'plugins');
const DB_PATH = path.join(DATA_DIR, 'registry.db');

// Ensure data directories exist
fs.mkdirSync(PLUGINS_DIR, { recursive: true });

// ── Database Setup ────────────────────────────────────────────────
import Database from 'better-sqlite3';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
migrate();

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      name           TEXT PRIMARY KEY,
      description    TEXT NOT NULL DEFAULT '',
      author_name    TEXT NOT NULL,
      author_pubkey  TEXT NOT NULL,
      latest_version TEXT NOT NULL DEFAULT '',
      total_downloads INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
      tags           TEXT NOT NULL DEFAULT '[]',
      listed         INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS plugin_versions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      plugin_name  TEXT NOT NULL,
      version      TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      checksum     TEXT NOT NULL,
      signature    TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      downloads    INTEGER NOT NULL DEFAULT 0,
      engine_req   TEXT NOT NULL DEFAULT '>=1.0.0',
      FOREIGN KEY (plugin_name) REFERENCES plugins(name),
      UNIQUE(plugin_name, version)
    );

    CREATE TABLE IF NOT EXISTS registry_api_keys (
      id          TEXT PRIMARY KEY,
      key_hash    TEXT NOT NULL UNIQUE,
      author_name TEXT NOT NULL,
      public_key  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      enabled     INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_versions_plugin ON plugin_versions(plugin_name);
    CREATE INDEX IF NOT EXISTS idx_versions_created ON plugin_versions(created_at);
  `);
}

// ── Helpers ───────────────────────────────────────────────────────

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function generateApiKey(): string {
  return `reg_${crypto.randomBytes(24).toString('hex')}`;
}

function rowToPlugin(row: Record<string, any>): RegistryPlugin | null {
  if (!row) return null;
  const versions = db.prepare(
    'SELECT * FROM plugin_versions WHERE plugin_name = ? ORDER BY created_at DESC'
  ).all(row.name) as Record<string, any>[];

  return {
    name: row.name,
    description: row.description,
    author: {
      name: row.author_name,
      publicKey: row.author_pubkey,
    },
    schema: [], // stored per-version, aggregated here from latest
    versions: versions.map(v => ({
      version: v.version,
      description: v.description,
      checksum: v.checksum,
      signature: v.signature,
      createdAt: v.created_at,
      downloads: v.downloads,
      engines: { lessel: v.engine_req },
    })),
    latestVersion: row.latest_version,
    totalDownloads: row.total_downloads,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: JSON.parse(row.tags || '[]'),
    listed: row.listed === 1,
  };
}

function validateApiKey(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const key = authHeader.slice(7);
  const hash = hashKey(key);
  const row = db.prepare('SELECT * FROM registry_api_keys WHERE enabled = 1').all() as Record<string, any>[];

  for (const r of row) {
    if (constantTimeCompare(r.key_hash, hash)) {
      (req as any).apiKey = r;
      next();
      return;
    }
  }

  res.status(403).json({ error: 'Invalid or disabled API key' });
}

// ── Express App ──────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ══════════════════════════════════════════════════════════════════
// Public Endpoints (no auth required)
// ══════════════════════════════════════════════════════════════════

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Search / List plugins
app.get('/api/v1/plugins', (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
  const schema = req.query.schema as string;
  const tag = req.query.tag as string;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM plugins WHERE listed = 1';
  const params: any[] = [];

  if (q) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(author_name) LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (tag) {
    sql += ' AND tags LIKE ?';
    params.push(`%"${tag}"%`);
  }

  // Count total
  const countRow = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as count')).get(...params) as { count: number };

  sql += ' ORDER BY total_downloads DESC, updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as Record<string, any>[];
  const plugins = rows.map(r => rowToPlugin(r)).filter(Boolean) as RegistryPlugin[];

  res.json({
    data: plugins.map(p => ({
      name: p.name,
      description: p.description,
      author: p.author,
      latestVersion: p.latestVersion,
      totalDownloads: p.totalDownloads,
      tags: p.tags,
      updatedAt: p.updatedAt,
    })),
    pagination: {
      total: countRow.count,
      page,
      limit,
      pages: Math.ceil(countRow.count / limit),
    },
  });
});

// Get single plugin details
app.get('/api/v1/plugins/:name', (req, res) => {
  const row = db.prepare('SELECT * FROM plugins WHERE name = ?').get(req.params.name) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Plugin not found' });
    return;
  }

  const plugin = rowToPlugin(row);
  res.json(plugin);
});

// Get specific version
app.get('/api/v1/plugins/:name/versions/:version', (req, res) => {
  const row = db.prepare(
    'SELECT * FROM plugin_versions WHERE plugin_name = ? AND version = ?'
  ).get(req.params.name, req.params.version) as Record<string, any> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Plugin version not found' });
    return;
  }

  res.json({
    pluginName: row.plugin_name,
    version: row.version,
    description: row.description,
    checksum: row.checksum,
    signature: row.signature,
    createdAt: row.created_at,
    downloads: row.downloads,
    engines: { lessel: row.engine_req },
  });
});

// Download plugin tarball
app.get('/api/v1/plugins/:name/download', (req, res) => {
  const version = req.query.version as string || '';
  const row = version
    ? db.prepare('SELECT * FROM plugin_versions WHERE plugin_name = ? AND version = ?')
        .get(req.params.name, version) as Record<string, any> | undefined
    : db.prepare('SELECT * FROM plugin_versions WHERE plugin_name = ? ORDER BY created_at DESC LIMIT 1')
        .get(req.params.name) as Record<string, any> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Plugin not found' });
    return;
  }

  const tarballPath = path.join(PLUGINS_DIR, req.params.name, `${row.version}.tar.gz`);
  if (!fs.existsSync(tarballPath)) {
    res.status(404).json({ error: 'Plugin tarball not found on server' });
    return;
  }

  // Increment download counter
  db.prepare('UPDATE plugin_versions SET downloads = downloads + 1 WHERE id = ?').run(row.id);
  db.prepare('UPDATE plugins SET total_downloads = total_downloads + 1 WHERE name = ?').run(req.params.name);

  res.download(tarballPath, `${req.params.name}-${row.version}.tar.gz`);
});

// Get plugin author's public key
app.get('/api/v1/plugins/:name/key', (req, res) => {
  const row = db.prepare('SELECT author_name, author_pubkey FROM plugins WHERE name = ?').get(req.params.name) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Plugin not found' });
    return;
  }
  res.json({ author: row.author_name, publicKey: row.author_pubkey });
});

// Register a new author API key
app.post('/api/v1/register', (req, res) => {
  const { authorName, publicKey } = req.body;
  if (!authorName || !publicKey) {
    res.status(400).json({ error: 'authorName and publicKey are required' });
    return;
  }

  const id = crypto.randomUUID();
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);

  try {
    db.prepare(
      'INSERT INTO registry_api_keys (id, key_hash, author_name, public_key) VALUES (?, ?, ?, ?)'
    ).run(id, keyHash, authorName, publicKey);

    res.status(201).json({
      id,
      authorName,
      apiKey: rawKey,
      message: 'Save this key — it will not be shown again.',
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ error: 'Author name or key already exists' });
      return;
    }
    throw err;
  }
});

// ══════════════════════════════════════════════════════════════════
// Authenticated Endpoints (API key required)
// ══════════════════════════════════════════════════════════════════

// Publish a new plugin or version
app.post('/api/v1/plugins', validateApiKey, (req, res) => {
  const body = req.body as PublishRequest;
  const apiKey = (req as any).apiKey as Record<string, any>;

  // Validate required fields
  if (!body.name || !body.version || !body.tarball || !body.checksum || !body.signature) {
    res.status(400).json({ error: 'Missing required fields: name, version, tarball, checksum, signature' });
    return;
  }

  // Validate name format (alphanumeric + hyphens only)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(body.name)) {
    res.status(400).json({ error: 'Plugin name must start with a lowercase letter/num and contain only hyphens' });
    return;
  }

  // Validate semver
  if (!/^\d+\.\d+\.\d+/.test(body.version)) {
    res.status(400).json({ error: 'Version must be semver (e.g. 1.0.0)' });
    return;
  }

  // Verify author matches API key owner
  if (body.author.name !== apiKey.author_name) {
    res.status(403).json({ error: `Author name "${body.author.name}" does not match API key owner "${apiKey.author_name}"` });
    return;
  }

  // Verify public key matches API key
  if (body.author.publicKey !== apiKey.public_key) {
    res.status(403).json({ error: 'Public key does not match registered key' });
    return;
  }

  // Check if version already exists
  const existing = db.prepare(
    'SELECT id FROM plugin_versions WHERE plugin_name = ? AND version = ?'
  ).get(body.name, body.version);
  if (existing) {
    res.status(409).json({ error: `Version ${body.version} already exists for plugin "${body.name}"` });
    return;
  }

  // Save tarball
  const pluginDir = path.join(PLUGINS_DIR, body.name);
  fs.mkdirSync(pluginDir, { recursive: true });
  const tarballPath = path.join(pluginDir, `${body.version}.tar.gz`);
  fs.writeFileSync(tarballPath, Buffer.from(body.tarball, 'base64'));

  // Verify checksum
  const fileContent = fs.readFileSync(tarballPath);
  const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');
  if (actualChecksum !== body.checksum) {
    fs.unlinkSync(tarballPath); // clean up
    res.status(400).json({ error: `Checksum mismatch. Expected ${body.checksum}, got ${actualChecksum}` });
    return;
  }

  const now = new Date().toISOString();

  // Upsert plugin record
  db.prepare(`
    INSERT INTO plugins (name, description, author_name, author_pubkey, latest_version, tags, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      description = excluded.description,
      latest_version = excluded.version,
      tags = excluded.tags,
      updated_at = excluded.updated_at
  `).run(
    body.name,
    body.description || '',
    body.author.name,
    body.author.publicKey,
    body.version,
    JSON.stringify(body.tags || []),
    now
  );

  // Insert version
  db.prepare(`
    INSERT INTO plugin_versions (plugin_name, version, description, checksum, signature, engine_req, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name,
    body.version,
    body.description || '',
    body.checksum,
    body.signature,
    body.engines?.lessel || '>=1.0.0',
    now
  );

  res.status(201).json({
    success: true,
    plugin: body.name,
    version: body.version,
  });
});

// Delete a plugin version (author only)
app.delete('/api/v1/plugins/:name/versions/:version', validateApiKey, (req, res) => {
  const apiKey = (req as any).apiKey as Record<string, any>;

  const plugin = db.prepare('SELECT * FROM plugins WHERE name = ?').get(req.params.name) as Record<string, any> | undefined;
  if (!plugin) {
    res.status(404).json({ error: 'Plugin not found' });
    return;
  }

  if (plugin.author_name !== apiKey.author_name) {
    res.status(403).json({ error: 'You can only delete your own plugins' });
    return;
  }

  // Delete version record
  db.prepare('DELETE FROM plugin_versions WHERE plugin_name = ? AND version = ?')
    .run(req.params.name, req.params.version);

  // Delete tarball
  const tarballPath = path.join(PLUGINS_DIR, req.params.name, `${req.params.version}.tar.gz`);
  if (fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }

  // Update latest version
  const latest = db.prepare(
    'SELECT version FROM plugin_versions WHERE plugin_name = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.params.name) as { version: string } | undefined;

  if (latest) {
    db.prepare('UPDATE plugins SET latest_version = ? WHERE name = ?').run(latest.version, req.params.name);
  }

  res.json({ success: true });
});

// List/unlist a plugin
app.patch('/api/v1/plugins/:name/toggle-listing', validateApiKey, (req, res) => {
  const apiKey = (req as any).apiKey as Record<string, any>;
  const { listed } = req.body;

  const plugin = db.prepare('SELECT * FROM plugins WHERE name = ?').get(req.params.name) as Record<string, any> | undefined;
  if (!plugin) {
    res.status(404).json({ error: 'Plugin not found' });
    return;
  }

  if (plugin.author_name !== apiKey.author_name) {
    res.status(403).json({ error: 'You can only modify your own plugins' });
    return;
  }

  db.prepare('UPDATE plugins SET listed = ? WHERE name = ?').run(listed ? 1 : 0, req.params.name);
  res.json({ success: true, listed: !!listed });
});

// ══════════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════╗`);
  console.log(`║    lessel Plugin Registry v0.1.0        ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`API:      http://localhost:${PORT}`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(`Data:     ${DATA_DIR}`);
  console.log();
});