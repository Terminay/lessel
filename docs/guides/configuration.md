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
| `ignoreUsers` | string[] | User/role IDs to ignore |
| `intents` | string[] | Gateway intents to enable |

## Environment Variables

The `.env` file is loaded at startup:

```
DISCORD_BOT_TOKEN=your_token_here
```

If `DISCORD_BOT_TOKEN` is set, it overrides the `listeners.discord.token` config value.

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

- [CLI Reference](cli.md) — All CLI commands
- [Getting Started](getting-started.md) — First run walkthrough
- [API Reference](api-reference.md) — `LesselConfig` type