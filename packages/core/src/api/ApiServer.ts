import express from 'express';
import cors from 'cors';
import { Store } from '../store/Store';
import { Schema, MessageEvent, StoredMessage, DashboardStats } from '../types';

/**
 * REST API server for lessel.
 * External executers consume message data through this API.
 */
export class ApiServer {
  private app: express.Application;
  private store: Store;
  private port: number;

  constructor(store: Store, port = 3100) {
    this.store = store;
    this.port = port;
    this.app = express();

    this.app.use(cors());
    this.app.use(express.json());

    this.registerRoutes();
  }

  private registerRoutes(): void {
    // ── Health ───────────────────────────────────────────────────────
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });

    // ── Stats ────────────────────────────────────────────────────────
    this.app.get('/stats', this.authMiddleware.bind(this), (req, res) => {
      const stats = this.store.getDashboardStats();
      res.json(stats);
    });

    // ── Schemas ─────────────────────────────────────────────────────
    this.app.get('/schemas', this.authMiddleware.bind(this), (req, res) => {
      const schemas = this.store.getAllSchemas();
      res.json(schemas);
    });

    this.app.get('/schemas/:name', this.authMiddleware.bind(this), (req, res) => {
      const schema = this.store.getSchema(req.params.name);
      if (!schema) {
        res.status(404).json({ error: 'Schema not found' });
        return;
      }
      res.json(schema);
    });

    // ── Messages ────────────────────────────────────────────────────
    this.app.get('/messages', this.authMiddleware.bind(this), (req, res) => {
      const schemaName = req.query.schema as string | undefined;
      const platform = req.query.platform as string | undefined;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const messages = this.store.getMessages(schemaName, platform, Math.min(limit, 200), offset);
      const total = this.store.getMessageCount(schemaName, platform);

      res.json({
        data: messages,
        pagination: { total, limit, offset },
      });
    });

    this.app.get('/messages/stream', this.authMiddleware.bind(this), (req, res) => {
      // Polling-based stream for simplicity
      const since = (req.query.since as string) || new Date(Date.now() - 60000).toISOString();
      const messages = this.store.getMessagesSince(since);
      res.json({ data: messages });
    });

    // ── API Keys (admin) ────────────────────────────────────────────
    this.app.get('/admin/keys', this.authMiddleware.bind(this), (req, res) => {
      const keys = this.store.listApiKeys();
      res.json(keys);
    });

    this.app.post('/admin/keys', this.authMiddleware.bind(this), (req, res) => {
      const { label } = req.body;
      if (!label) {
        res.status(400).json({ error: 'label is required' });
        return;
      }
      const result = this.store.createApiKey(label);
      res.status(201).json(result);
    });

    this.app.patch('/admin/keys/:id/toggle', this.authMiddleware.bind(this), (req, res) => {
      const enabled = req.body.enabled === true;
      this.store.toggleApiKey(req.params.id, enabled);
      res.json({ success: true });
    });

    this.app.delete('/admin/keys/:id', this.authMiddleware.bind(this), (req, res) => {
      this.store.deleteApiKey(req.params.id);
      res.json({ success: true });
    });
  }

  private authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
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

    // Attach auth info for downstream handlers
    (req as any).authKey = apiKey;
    next();
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`⚡ lessel API server listening on port ${this.port}`);
        resolve();
      });
    });
  }
}