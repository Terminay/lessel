"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInit = runInit;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_CONFIG = {
    port: 3100,
    schemas: [],
    plugins: [],
    apiKeys: [{ label: 'default' }],
};
const ENV_EXAMPLE = `# lessel configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_ALLOWED_CHANNELS=
DISCORD_IGNORE_USERS=
LESSEL_API_PORT=3100
LESSEL_CONFIG=./lessel.config.json
LESSEL_DB_PATH=./data/lessel.db
`;
async function runInit() {
    const cwd = process.cwd();
    const configPath = path_1.default.join(cwd, 'lessel.config.json');
    const envPath = path_1.default.join(cwd, '.env');
    const envExamplePath = path_1.default.join(cwd, '.env.example');
    const pluginsDir = path_1.default.join(cwd, 'plugins');
    if (fs_1.default.existsSync(configPath)) {
        console.error('[lessel] lessel.config.json already exists. Aborting init.');
        process.exit(1);
    }
    fs_1.default.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('[lessel] Created lessel.config.json');
    if (!fs_1.default.existsSync(envPath)) {
        fs_1.default.writeFileSync(envPath, ENV_EXAMPLE);
        console.log('[lessel] Created .env');
    }
    if (!fs_1.default.existsSync(envExamplePath)) {
        fs_1.default.writeFileSync(envExamplePath, ENV_EXAMPLE);
    }
    if (!fs_1.default.existsSync(pluginsDir)) {
        fs_1.default.mkdirSync(pluginsDir, { recursive: true });
        console.log('[lessel] Created plugins/ directory');
    }
    console.log('');
    console.log('[lessel] Project scaffolded. Next steps:');
    console.log('  1. Edit .env and set DISCORD_BOT_TOKEN');
    console.log('  2. Run: lessel start');
    console.log('  3. (optional) lessel plugin add @lessel/plugin-logger');
}
//# sourceMappingURL=init.js.map