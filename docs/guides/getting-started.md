# Getting Started

This guide walks you through installing and running lessel for the first time.

## Prerequisites

- **Node.js** >= 18 (download from [nodejs.org](https://nodejs.org/))
- **npm** (comes with Node.js)
- A **Discord bot token** (see below)

### Get a Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section → "Add Bot"
4. Click "Reset Token" and copy the token
5. Enable "Message Content Intent" under Privileged Gateway Intents

## Option 1: No Clone Needed (Recommended)

Use the CLI directly without cloning the repo:

```bash
npx @lessel/cli init
```

This creates:
- `lessel.config.json` — your configuration
- `.env` — environment variables (edit this!)

Then edit `.env`:
```
DISCORD_BOT_TOKEN=your_token_here
```

Start the pipeline:
```bash
npx @lessel/cli start
```

Add a plugin:
```bash
npx @lessel/cli plugin add @lessel/plugin-logger
```

## Option 2: From Source

```bash
git clone https://github.com/Terminay/lessel.git
cd lessel
npm install
npm run build
```

Copy the env file and fill in your token:
```bash
cp .env.example .env
```

Edit `.env`:
```
DISCORD_BOT_TOKEN=your_token_here
```

Run:
```bash
npm start
```

## Verify It Works

lessel starts:
- A **Discord listener** that connects to your bot
- A **REST API** at `http://localhost:3100`

Test the API health endpoint:
```bash
curl http://localhost:3100/health
```

Expected response:
```json
{ "status": "ok" }
```

## Next Steps

- [Your First Plugin](your-first-plugin.md) — Write a plugin
- [Understanding Schemas](schemas.md) — Learn about filtering
- [Configuration](configuration.md) — Full config reference