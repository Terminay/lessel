# Getting Started

This guide walks you through installing and running lessel for the first time.

## Prerequisites

- **Node.js** >= 18 (download from [nodejs.org](https://nodejs.org/))
- **npm** (comes with Node.js)
- At least one platform token: **Discord bot token**, **Slack bot token**, or **WhatsApp phone**

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
4. Install to workspace, copy the **Bot User OAuth Token** (`xoxb-...`) and **App-Level Token** (`xapp-...`)

### Get WhatsApp Access

1. WhatsApp uses QR code authentication via the `@lessel/listener-whatsapp` package
2. On first run, scan the QR code in your terminal with WhatsApp on your phone

---

## 🚀 Zero-Config Quick Start (Recommended)

lessel automatically detects your platform from environment variables.
Set just the tokens and run:

```bash
# 1. Install lessel
npm install -g @lessel/cli

# 2. Set your platform token
#    (lessel detects which platform to use automatically)
export DISCORD_BOT_TOKEN=your_token_here
# or: export SLACK_BOT_TOKEN=your_token_here
# or: export WHATSAPP_PHONE=your_phone

# 3. Start — no config file needed
lessel start
```

That's it. lessel will:

- ✅ Detect your platform(s) from environment variables
- ✅ Auto-create catch-all schemas that match every message
- ✅ Dynamically load the correct listener and sender packages
- ✅ Register built-in plugins (logger, echo, webhook, rate-limiter)
- ✅ Start a REST API server on port 3100

Check your setup first:

```bash
lessel status
```

This shows detected platforms, schema status, database state, and environment variables.

---

## Option 1: No Clone Needed

```bash
npx @lessel/cli init
```

This creates:
- `lessel.config.json` — your configuration
- `.env` — environment variables (edit this!)

Edit `.env`:

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
- **Built-in plugins** (logger, echo, webhook, rate-limiter) loaded automatically

Test the API health endpoint:

```bash
curl http://localhost:3100/health
```

Expected response:

```json
{ "status": "ok" }
```

View your pipeline status:

```bash
lessel status
```

## How Auto-Detection Works

lessel checks environment variables on startup:

| Platform   | Required Env Vars                        | Optional                        |
|------------|------------------------------------------|---------------------------------|
| Discord    | `DISCORD_BOT_TOKEN`                      | `DISCORD_ALLOWED_CHANNELS`, `DISCORD_IGNORE_USERS` |
| Slack      | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`     | `SLACK_ALLOWED_CHANNELS`, `SLACK_IGNORE_USERS` |
| WhatsApp   | `WHATSAPP_PHONE`                         | `WHATSAPP_SESSION`, `WHATSAPP_ALLOWED_NUMBERS` |

If no config file exists, lessel auto-generates one with catch-all schemas for each detected platform. These schemas match every inbound message and store it — so you can start receiving messages immediately.

## Next Steps

- [Listeners](listeners.md) — Setup Discord, Slack, and WhatsApp listeners
- [Your First Plugin](your-first-plugin.md) — Write a plugin
- [Sending Messages](sending-messages.md) — Reply to messages
- [Understanding Schemas](schemas.md) — Learn about filtering
- [Configuration](configuration.md) — Full config reference

## Plugin Registry

lessel has a community plugin registry powered by GitHub. No servers to run — just search and install:

```bash
# Search for plugins
npx lessel plugin search sentiment

# Install a plugin
npx lessel plugin install example-logger

# List what you have installed
npx lessel plugin list

# Prepare your own plugin for publishing
npx lessel plugin publish ./my-plugin
```

Browse the full catalog: **[https://terminay.github.io/lessel-plugins](https://terminay.github.io/lessel-plugins)**

To submit a plugin, fork [lessel-plugins](https://github.com/Terminay/lessel-plugins), add your plugin under `plugins/<name>/`, and open a PR. The registry auto-builds on merge.
