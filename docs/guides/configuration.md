# Configuration

lessel is configured via `lessel.config.json` at the project root.

## Full Example

```json
{
  "port": 3100,
  "masterSecret": "change-me-in-production",
  "schemas": [
    {
      "name": "all-messages",
      "platforms": ["discord"],
      "filters": [],
      "extract": [
        { "key": "content", "path": "content" },
        { "key": "author", "path": "authorName" }
      ],
      "store": true
    }
  ],
  "apiKeys": [
    { "label": "default", "enabled": true }
  ],
  "plugins": ["@lessel/plugin-logger"],
  "listeners": {
    "discord": {
      "token": "YOUR_DISCORD_TOKEN",
      "allowedChannels": [],
      "ignoreUsers": [],
      "intents": ["Guilds", "GuildMessages", "MessageContent"]
    }
  }
}
```

## Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | `3100` | REST API port |
| `masterSecret` | string? | — | Secret used to derive API keys |
| `schemas` | Schema[] | `[]` | Registered schemas |
| `apiKeys` | ApiKeyInput[] | `[]` | API key definitions |
| `plugins` | string[] | `[]` | Plugin packages or paths |
| `listeners` | object | `{}` | Platform-specific listener config |

## Listener Config (Discord)

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Discord bot token (or use `DISCORD_BOT_TOKEN` env) |
| `allowedChannels` | string[] | Channel IDs to monitor (empty = all) |
| `ignoreUsers` | string[] | User IDs to ignore |
| `intents` | string[] | Gateway intents to enable |

## Listener Config (Slack)

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Slack bot token (`xoxb-...` or use `SLACK_BOT_TOKEN` env) |
| `appToken` | string | App-level token for Socket Mode (`xapp-...`) |
| `channels` | string[] | Channel IDs to monitor (empty = all) |

## Listener Config (WhatsApp)

| Field | Type | Description |
|-------|------|-------------|
| `sessionPath` | string | Path to save session data (default: `./data/whatsapp-session`) |

## Sender Config

Senders are configured under the `senders` key:

```json
{
  "senders": {
    "discord": {
      "enabled": true,
      "token": "YOUR_DISCORD_BOT_TOKEN"
    },
    "slack": {
      "enabled": true,
      "token": "xoxb-your-slack-bot-token"
    },
    "whatsapp": {
      "enabled": true,
      "sessionPath": "./data/whatsapp-session"
    }
  }
}
```

### Sender Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable this sender |

### Discord Sender

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Discord bot token (uses same client as listener) |

### Slack Sender

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Slack bot token with `chat:write` scope |

### WhatsApp Sender

| Field | Type | Description |
|-------|------|-------------|
| `sessionPath` | string | Path to save session (uses same session as listener) |

## Environment Variables

The `.env` file is loaded at startup:

```
# Discord
DISCORD_BOT_TOKEN=your_token_here

# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-token

# WhatsApp
WHATSAPP_SESSION_PATH=./data/whatsapp-session
```

Environment variables override config file values for the same key.

**Current behavior:**
- `DISCORD_BOT_TOKEN` overrides `listeners.discord.token`
- `SLACK_BOT_TOKEN` overrides `listeners.slack.token`

## API Keys

API keys protect the REST API endpoints. Create one via the admin endpoint:

```bash
curl -X POST http://localhost:3100/admin/keys \
  -H "Authorization: Bearer lsl_your_master_key" \
  -d '{"label": "my-app"}'
```

Or define them statically in config:

```json
"apiKeys": [
  { "label": "my-app", "enabled": true }
]
```

## Next Steps

- [Listeners](listeners.md) — Setup Discord, Slack, and WhatsApp listeners
- [Sending Messages](sending-messages.md) — Send replies to platforms
- [CLI Reference](cli.md) — All CLI commands
- [Getting Started](getting-started.md) — First run walkthrough
- [API Reference](../api-reference.md) — `LesselConfig` type
