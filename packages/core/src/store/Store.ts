import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { StoredMessage, ApiKey, Schema, LesselConfig, DashboardStats } from '../types';

/**
 * SQLite-backed persistence layer for lessel.
 * Handles API keys, schema storage, and message persistence.
 */
export class Store {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'lessel.db');
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  // ── Schema ───────────────────────────────────────────────────────────
  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schemas (
        name        TEXT PRIMARY KEY,
        config      TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id          TEXT PRIMARY KEY,
        key_hash    TEXT NOT NULL UNIQUE,
        label       TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        last_used   TEXT,
        enabled     INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS messages (
        id          TEXT PRIMARY KEY,
        schema_name TEXT NOT NULL,
        platform    TEXT NOT NULL,
        payload     TEXT NOT NULL,
        raw         TEXT NOT NULL,
        received_at TEXT NOT NULL,
        processed_at TEXT,
        FOREIGN KEY (schema_name) REFERENCES schemas(name)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_schema
        ON messages(schema_name);
      CREATE INDEX IF NOT EXISTS idx_messages_received
        ON messages(received_at);
      CREATE INDEX IF NOT EXISTS idx_messages_platform
        ON messages(platform);
    `);
  }

  // ── Schema operations ────────────────────────────────────────────────
  saveSchema(schema: Schema): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO schemas (name, config) VALUES (?, ?)'
    );
    stmt.run(schema.name, JSON.stringify(schema));
  }

  getSchema(name: string): Schema | null {
    const row = this.db.prepare('SELECT config FROM schemas WHERE name = ?').get(name) as
      | { config: string }
      | undefined;
    return row ? JSON.parse(row.config) : null;
  }

  getAllSchemas(): Schema[] {
    const rows = this.db.prepare('SELECT config FROM schemas').all() as { config: string }[];
    return rows.map((r) => JSON.parse(r.config));
  }

  deleteSchema(name: string): void {
    this.db.prepare('DELETE FROM schemas WHERE name = ?').run(name);
  }

  // ── API Key operations ───────────────────────────────────────────────
  createApiKey(label: string): { id: string; rawKey: string } {
    const id = crypto.randomUUID();
    const rawKey = `lsl_${crypto.randomBytes(24).toString('hex')}`;
    const hash = this.hashKey(rawKey);

    this.db
      .prepare('INSERT INTO api_keys (id, key_hash, label) VALUES (?, ?, ?)')
      .run(id, hash, label);

    return { id, rawKey };
  }

  validateApiKey(rawKey: string): ApiKey | null {
    const hash = this.hashKey(rawKey);
    // Fetch all enabled keys and compare in constant time
    const rows = this.db
      .prepare('SELECT * FROM api_keys WHERE enabled = 1')
      .all() as Record<string, unknown>[];

    for (const row of rows) {
      const keyHash = row.key_hash as string;
      if (this.constantTimeCompare(keyHash, hash)) {
        // Update last used timestamp
        this.db
          .prepare('UPDATE api_keys SET last_used = datetime(?) WHERE id = ?')
          .run(new Date().toISOString(), row.id);
        return {
          id: row.id as string,
          key: row.key_hash as string,
          label: row.label as string,
          createdAt: row.created_at as string,
          lastUsedAt: row.last_used as string | undefined,
          enabled: (row.enabled as number) === 1,
        };
      }
    }

    return null;
  }

  listApiKeys(): ApiKey[] {
    return this.db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as ApiKey[];
  }

  toggleApiKey(id: string, enabled: boolean): void {
    this.db.prepare('UPDATE api_keys SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
  }

  deleteApiKey(id: string): void {
    this.db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private constantTimeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  // ── Message operations ───────────────────────────────────────────────
  storeMessage(msg: StoredMessage): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO messages (id, schema_name, platform, payload, raw, received_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(msg.id, msg.schemaName, msg.platform, msg.payload, msg.raw, msg.receivedAt);
  }

  getMessages(
    schemaName?: string,
    platform?: string,
    limit = 50,
    offset = 0
  ): StoredMessage[] {
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params: unknown[] = [];

    if (schemaName) {
      sql += ' AND schema_name = ?';
      params.push(schemaName);
    }
    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }

    sql += ' ORDER BY received_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(sql).all(...params) as StoredMessage[];
  }

  getMessageCount(schemaName?: string, platform?: string): number {
    let sql = 'SELECT COUNT(*) as count FROM messages WHERE 1=1';
    const params: unknown[] = [];

    if (schemaName) {
      sql += ' AND schema_name = ?';
      params.push(schemaName);
    }
    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }

    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }

  getMessagesSince(since: string): StoredMessage[] {
    return this.db
      .prepare('SELECT * FROM messages WHERE received_at >= ? ORDER BY received_at DESC')
      .all(since) as StoredMessage[];
  }

  // ── Stats ────────────────────────────────────────────────────────────
  getDashboardStats(): DashboardStats {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msgCount = this.db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE received_at >= ?')
      .get(today.toISOString()) as { count: number };

    const schemaCount = this.db
      .prepare('SELECT COUNT(*) as count FROM schemas')
      .get() as { count: number };

    const mem = process.memoryUsage();

    return {
      uptime: process.uptime(),
      messagesToday: msgCount.count,
      activeSchemas: schemaCount.count,
      activeListeners: 0, // populated by the pipeline manager
      memoryUsage: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
    };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  close(): void {
    this.db.close();
  }
}