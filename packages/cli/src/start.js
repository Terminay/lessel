"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStart = runStart;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const core_1 = require("@lessel/core");
const listener_discord_1 = require("@lessel/listener-discord");
async function runStart() {
    const cwd = process.cwd();
    const configPath = process.env.LESSEL_CONFIG || path_1.default.join(cwd, 'lessel.config.json');
    let config = { schemas: [], plugins: [], apiKeys: [] };
    try {
        const raw = fs_1.default.readFileSync(configPath, 'utf-8');
        config = JSON.parse(raw);
    }
    catch {
        console.log('[lessel] No lessel.config.json found, using empty defaults');
    }
    const dbPath = process.env.LESSEL_DB_PATH || path_1.default.join(cwd, 'data', 'lessel.db');
    const store = new core_1.Store(dbPath);
    console.log(`[lessel] SQLite store ready: ${dbPath}`);
    // Load schemas
    for (const schema of config.schemas || []) {
        store.saveSchema(schema);
        console.log(`[lessel] Schema loaded: ${schema.name}`);
    }
    // Seed API keys
    for (const keyInput of config.apiKeys || []) {
        const existing = store.listApiKeys();
        if (!existing.find((k) => k.label === keyInput.label)) {
            const result = store.createApiKey(keyInput.label);
            console.log(`[lessel] API key created: ${keyInput.label} -> ${result.rawKey}`);
            console.log('[lessel] Save this key, it will not be shown again.');
        }
    }
    const pipeline = new core_1.PipelineManager(store);
    // Load plugins (config + auto-scan)
    for (const source of config.plugins || []) {
        pipeline.loadPlugins([source]);
    }
    const auto = pipeline.getPluginLoader().scanNodeModules();
    if (auto.length > 0)
        pipeline.loadPlugins(auto);
    // Discord listener
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[lessel] DISCORD_BOT_TOKEN not set. Discord listener disabled.');
    }
    else {
        const listener = new listener_discord_1.DiscordListener(token, {
            allowedChannels: process.env.DISCORD_ALLOWED_CHANNELS
                ? process.env.DISCORD_ALLOWED_CHANNELS.split(',')
                : [],
            ignoreUsers: process.env.DISCORD_IGNORE_USERS
                ? process.env.DISCORD_IGNORE_USERS.split(',')
                : [],
        });
        pipeline.registerListener(listener);
    }
    await pipeline.start();
    const apiPort = parseInt(process.env.LESSEL_API_PORT || '3100', 10);
    const api = new core_1.ApiServer(store, apiPort);
    await api.start();
    const shutdown = async () => {
        console.log('\n[lessel] Shutting down...');
        await pipeline.stop();
        store.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    console.log(`[lessel] Running. API: http://localhost:${apiPort}`);
}
//# sourceMappingURL=start.js.map