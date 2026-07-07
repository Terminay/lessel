import fs from 'fs';
import path from 'path';

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

export async function runInit(): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'lessel.config.json');
  const envPath = path.join(cwd, '.env');
  const envExamplePath = path.join(cwd, '.env.example');
  const pluginsDir = path.join(cwd, 'plugins');

  if (fs.existsSync(configPath)) {
    console.error('[lessel] lessel.config.json already exists. Aborting init.');
    process.exit(1);
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('[lessel] Created lessel.config.json');

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, ENV_EXAMPLE);
    console.log('[lessel] Created .env');
  }
  if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, ENV_EXAMPLE);
  }

  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
    console.log('[lessel] Created plugins/ directory');
  }

  console.log('');
  console.log('[lessel] Project scaffolded. Next steps:');
  console.log('  1. Edit .env and set DISCORD_BOT_TOKEN');
  console.log('  2. Run: lessel start');
  console.log('  3. (optional) lessel plugin add @lessel/plugin-logger');
}