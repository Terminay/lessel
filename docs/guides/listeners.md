# Listeners

Listeners connect lessel to chat platforms and ingest messages as `MessageEvent` objects. They are the entry point for the pipeline.

## Available Listeners

| Package | Platform | Install |
|---------|----------|---------|
| `@lessel/listener-discord` | Discord | `npm install @lessel/listener-discord` |
| `@lessel/listener-slack` | Slack | `npm install @lessel/listener-slack` |
| `@lessel/listener-whatsapp` | WhatsApp | `npm install @lessel/listener-whatsapp` |

---

## Discord Listener

Connects to Discord via the Gateway API and emits message events.

### Setup

1. Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable **Message Content Intent** under Privileged Gateway Intents
3. Invite the bot to your server with `bot` scope and these permissions:
   - `View Channels`
   - `Send Messages`
   - `Read Message History`

### Configuration

**Environment variable:**
```env
DISCORD_BOT_TOKEN=your_bot_token_here
```

**Or in `lessel.config.json`:**
```json
{
  "listeners": {
    "discord": {
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "allowedChannels": ["123456789012345678"],
      "ignoreUsers": ["987654321098765432"]
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Bot token (or use `DISCORD_BOT_TOKEN` env) |
| `allowedChannels` | string[] | Channel IDs to monitor (empty = all) |
| `ignoreUsers` | string[] | User IDs to ignore |

---

## Slack Listener

Connects to Slack via the Events API or Socket Mode and emits message events.

### Setup

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable **Socket Mode** or **Event Subscriptions**
3. Add these bot token scopes:
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `app_mentions:read`
4. Install the app to your workspace
5. Copy the **Bot User OAuth Token** (`xoxb-...`)

### Configuration

**Environment variable:**
```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
```

**Or in `lessel.config.json`:**
```json
{
  "listeners": {
    "slack": {
      "token": "xoxb-your-slack-bot-token",
      "appToken": "xapp-your-slack-app-token",
      "channels": ["C012345"]
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Bot token (`xoxb-...`) |
| `appToken` | string | App-level token for Socket Mode (`xapp-...`) |
| `channels` | string[] | Channel IDs to monitor (empty = all) |

---

## WhatsApp Listener

Connects to WhatsApp via `@whiskeysockets/baileys` and emits message events.

### Setup

1. Install the listener: `npm install @lessel/listener-whatsapp`
2. On first run, a QR code appears in the terminal
3. Scan with WhatsApp on your phone
4. Session is saved to disk for future runs

### Configuration

**Environment variable:**
```env
WHATSAPP_SESSION_PATH=./data/whatsapp-session
```

**Or in `lessel.config.json`:**
```json
{
  "listeners": {
    "whatsapp": {
      "sessionPath": "./data/whatsapp-session"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionPath` | string | Path to save session data (default: `./data/whatsapp-session`) |

### Notes

- The WhatsApp listener uses the same session as the sender
- If you restart lessel, you don't need to scan QR again unless the session expires
- Session data is sensitive — keep it private

---

## Registering Listeners

Listeners are registered in `lessel.config.json` under the `listeners` key. Each key is the platform name:

```json
{
  "listeners": {
    "discord": {
      "token": "YOUR_DISCORD_BOT_TOKEN"
    },
    "slack": {
      "token": "xoxb-your-slack-bot-token"
    },
    "whatsapp": {
      "sessionPath": "./data/whatsapp-session"
    }
  }
}
```

Or programmatically:

```javascript
const { PipelineManager, Store } = require('@lessel/core');
const { DiscordListener } = require('@lessel/listener-discord');
const { WhatsAppListener } = require('@lessel/listener-whatsapp');

const store = new Store();
const pipeline = new PipelineManager(store);

const discord = new DiscordListener('YOUR_DISCORD_BOT_TOKEN');
const whatsapp = new WhatsAppListener();

pipeline.registerListener(discord);
pipeline.registerListener(whatsapp);
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Discord not connecting | Invalid token or missing intents | Check token, enable Message Content Intent |
| Slack not receiving events | Missing scopes or wrong event URL | Add `channels:history` scope, verify request URL |
| WhatsApp QR not showing | Missing terminal support | Use a terminal that supports QR output, or check `sessionPath` |
| "Listener already started" | Calling `start()` twice | Ensure `pipeline.start()` is only called once |

---

## Next Steps

- [Sending Messages](sending-messages.md) — Send replies back to platforms
- [Understanding Schemas](schemas.md) — Filter which messages trigger plugins
- [Configuration Reference](configuration.md) — Full config options