# Getting Started

This guide walks you through installing and running lessel for the first time.

## Prerequisites

- **Node.js** >= 18 (download from [nodejs.org](https://nodejs.org/))
- **npm** (comes with Node.js)
- At least one platform token: **Discord bot token**, **Slack bot token**, or **WhatsApp** (phone)

### Get a Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section → "Add Bot"
4. Click "Reset Token" and copy the token
5. Enable "Message Content Intent" under Privileged Gateway Intents

### Get a Slack Bot Token

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app, enable Socket Mode
3. Add scopes: `channels:history`, `groups:history`, `im:history`, `mpim:history`, `app_mentions:read`
4. Install to workspace, copy the **Bot User OAuth Token** (`xoxb-...`)

### Get WhatsApp Access

1. Install the WhatsApp listener: `npm install @lessel/listener-whatsapp`
2. On first run, scan the QR code in your terminal with WhatsApp on your phone

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
- Listeners for any platforms you configured (Discord, Slack, WhatsApp)
- A **REST API** at `http://localhost:3100`

See which listeners are active in the startup logs.

Test the API health endpoint:
```bash
curl http://localhost:3100/health
```

Expected response:
```json
{ "status": "ok" }
```

## Next Steps

- [Listeners](listeners.md) — Setup Discord, Slack, and WhatsApp listeners
- [Your First Plugin](your-first-plugin.md) — Write a plugin
- [Sending Messages](sending-messages.md) — Reply to messages
- [Understanding Schemas](schemas.md) — Learn about filtering
- [Configuration](configuration.md) — Full config reference
