"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;
/**
 * REST API server for lessel.
 * External executers consume message data through this API.
 */
class ApiServer {
    app;
    store;
    port;
    constructor(store, port = 3100) {
        this.store = store;
        this.port = port;
        this.app = (0, express_1.default)();
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        this.registerRoutes();
    }
    registerRoutes() {
        // Rate limiting middleware for protected routes
        const rateLimiter = (req, res, next) => {
            const ip = (req.ip || 'unknown');
            const now = Date.now();
            const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
            if (now > entry.resetAt) {
                entry.count = 0;
                entry.resetAt = now + RATE_LIMIT_WINDOW;
            }
            entry.count++;
            if (entry.count > RATE_LIMIT_MAX) {
                res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
                res.status(429).json({ error: 'Rate limit exceeded' });
                return;
            }
            rateLimitMap.set(ip, entry);
            next();
        };
        // ── Health ───────────────────────────────────────────────────────
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
        });
        // ── Stats ────────────────────────────────────────────────────────
        this.app.get('/stats', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const stats = this.store.getDashboardStats();
            res.json(stats);
        });
        // ── Schemas ─────────────────────────────────────────────────────
        this.app.get('/schemas', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const schemas = this.store.getAllSchemas();
            res.json(schemas);
        });
        this.app.get('/schemas/:name', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const schema = this.store.getSchema(req.params.name);
            if (!schema) {
                res.status(404).json({ error: 'Schema not found' });
                return;
            }
            res.json(schema);
        });
        // ── Messages ────────────────────────────────────────────────────
        this.app.get('/messages', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const schemaName = req.query.schema;
            const platform = req.query.platform;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
            const offset = parseInt(req.query.offset, 10) || 0;
            const messages = this.store.getMessages(schemaName, platform, limit, offset);
            const total = this.store.getMessageCount(schemaName, platform);
            res.json({
                data: messages,
                pagination: { total, limit, offset },
            });
        });
        this.app.get('/messages/stream', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const since = req.query.since || new Date(Date.now() - 60000).toISOString();
            const messages = this.store.getMessagesSince(since);
            res.json({ data: messages });
        });
        // ── API Keys (admin) ────────────────────────────────────────────
        this.app.get('/admin/keys', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const keys = this.store.listApiKeys();
            // Strip secret material from API key responses
            const sanitized = keys.map(({ key, ...rest }) => rest);
            res.json(sanitized);
        });
        this.app.post('/admin/keys', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const { label } = req.body;
            if (!label || typeof label !== 'string' || label.length > 100) {
                res.status(400).json({ error: 'label is required and must be <= 100 chars' });
                return;
            }
            const result = this.store.createApiKey(label.trim());
            res.status(201).json(result);
        });
        this.app.patch('/admin/keys/:id/toggle', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            const { enabled } = req.body;
            if (typeof enabled !== 'boolean') {
                res.status(400).json({ error: 'enabled must be a boolean' });
                return;
            }
            this.store.toggleApiKey(req.params.id, enabled);
            res.json({ success: true });
        });
        this.app.delete('/admin/keys/:id', rateLimiter, this.authMiddleware.bind(this), (req, res) => {
            this.store.deleteApiKey(req.params.id);
            res.json({ success: true });
        });
    }
    authMiddleware(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header' });
            return;
        }
        const key = authHeader.slice(7);
        const apiKey = this.store.validateApiKey(key);
        if (!apiKey) {
            res.status(403).json({ error: 'Invalid or disabled API key' });
            return;
        }
        req.authKey = apiKey;
        next();
    }
    start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, () => {
                console.log(`⚡ lessel API server listening on port ${this.port}`);
                resolve();
            });
        });
    }
}
exports.ApiServer = ApiServer;
//# sourceMappingURL=ApiServer.js.map