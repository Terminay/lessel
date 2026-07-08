"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * SQLite-backed persistence layer for lessel.
 * Handles API keys, schema storage, and message persistence.
 */
class Store {
    db;
    constructor(dbPath) {
        const resolvedPath = dbPath || path_1.default.join(process.cwd(), 'data', 'lessel.db');
        this.db = new better_sqlite3_1.default(resolvedPath);
        this.db.pragma('journal_mode = WAL');
        this.migrate();
    }
    // ── Schema ───────────────────────────────────────────────────────────
    migrate() {
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
    saveSchema(schema) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO schemas (name, config) VALUES (?, ?)');
        stmt.run(schema.name, JSON.stringify(schema));
    }
    getSchema(name) {
        const row = this.db.prepare('SELECT config FROM schemas WHERE name = ?').get(name);
        return row ? JSON.parse(row.config) : null;
    }
    getAllSchemas() {
        const rows = this.db.prepare('SELECT config FROM schemas').all();
        return rows.map((r) => JSON.parse(r.config));
    }
    deleteSchema(name) {
        this.db.prepare('DELETE FROM schemas WHERE name = ?').run(name);
    }
    // ── API Key operations ───────────────────────────────────────────────
    createApiKey(label) {
        const id = crypto_1.default.randomUUID();
        const rawKey = `lsl_${crypto_1.default.randomBytes(24).toString('hex')}`;
        const hash = this.hashKey(rawKey);
        this.db
            .prepare('INSERT INTO api_keys (id, key_hash, label) VALUES (?, ?, ?)')
            .run(id, hash, label);
        return { id, rawKey };
    }
    validateApiKey(rawKey) {
        const hash = this.hashKey(rawKey);
        // Fetch all enabled keys and compare in constant time
        const rows = this.db
            .prepare('SELECT * FROM api_keys WHERE enabled = 1')
            .all();
        for (const row of rows) {
            const keyHash = row.key_hash;
            if (this.constantTimeCompare(keyHash, hash)) {
                // Update last used timestamp
                this.db
                    .prepare('UPDATE api_keys SET last_used = datetime(?) WHERE id = ?')
                    .run(new Date().toISOString(), row.id);
                return {
                    id: row.id,
                    key: row.key_hash,
                    label: row.label,
                    createdAt: row.created_at,
                    lastUsedAt: row.last_used,
                    enabled: row.enabled === 1,
                };
            }
        }
        return null;
    }
    listApiKeys() {
        return this.db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
    }
    toggleApiKey(id, enabled) {
        this.db.prepare('UPDATE api_keys SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    }
    deleteApiKey(id) {
        this.db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
    }
    hashKey(key) {
        return crypto_1.default.createHash('sha256').update(key).digest('hex');
    }
    constantTimeCompare(a, b) {
        try {
            const bufA = Buffer.from(a);
            const bufB = Buffer.from(b);
            if (bufA.length !== bufB.length)
                return false;
            return crypto_1.default.timingSafeEqual(bufA, bufB);
        }
        catch {
            return false;
        }
    }
    // ── Message operations ───────────────────────────────────────────────
    storeMessage(msg) {
        this.db
            .prepare('INSERT OR IGNORE INTO messages (id, schema_name, platform, payload, raw, received_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(msg.id, msg.schemaName, msg.platform, msg.payload, msg.raw, msg.receivedAt);
    }
    getMessages(schemaName, platform, limit = 50, offset = 0) {
        let sql = 'SELECT * FROM messages WHERE 1=1';
        const params = [];
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
        return this.db.prepare(sql).all(...params);
    }
    getMessageCount(schemaName, platform) {
        let sql = 'SELECT COUNT(*) as count FROM messages WHERE 1=1';
        const params = [];
        if (schemaName) {
            sql += ' AND schema_name = ?';
            params.push(schemaName);
        }
        if (platform) {
            sql += ' AND platform = ?';
            params.push(platform);
        }
        const row = this.db.prepare(sql).get(...params);
        return row.count;
    }
    getMessagesSince(since) {
        return this.db
            .prepare('SELECT * FROM messages WHERE received_at >= ? ORDER BY received_at DESC')
            .all(since);
    }
    // ── Stats ────────────────────────────────────────────────────────────
    getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const msgCount = this.db
            .prepare('SELECT COUNT(*) as count FROM messages WHERE received_at >= ?')
            .get(today.toISOString());
        const schemaCount = this.db
            .prepare('SELECT COUNT(*) as count FROM schemas')
            .get();
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
    close() {
        this.db.close();
    }
}
exports.Store = Store;
//# sourceMappingURL=Store.js.map