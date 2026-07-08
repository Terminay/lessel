# Sending Messages

Senders let plugins send messages back to platforms. This is the reverse of listening — you capture inbound messages, process them, then send outbound results.

## How It Works

```javascript
module.exports = {
  name: 'my-bot',
  schema: 'all-messages',
  async execute(event, context) {
    // Send to Discord
    await context.send('discord', '123456789', 'Hello!');

    // Send to Slack
    await context.send('slack', 'C012345', 'Hello!');

    // Send to WhatsApp
    await context.send('whatsapp', '+1234567890', 'Hello!');
  }
};
```

## Available Senders

| Package | Platform | Install |
|---------|----------|---------|
| `@lessel/sender-discord` | Discord | `npm install @lessel/sender-discord` |
| `@lessel/sender-slack` | Slack | `npm install @lessel/sender-slack` |
| `@lessel/sender-whatsapp` | WhatsApp | `npm install @lessel/sender-whatsapp` |

## Sender Configuration

Enable senders in `lessel.config.json`:

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

### Discord Sender

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable sender |
| `token` | string | Discord bot token (same as listener) |

**Requirements:**
- Bot must be in the server with `Send Messages` permission
- Uses the same token as the Discord listener (shared client)

### Slack Sender

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable sender |
| `token` | string | Slack bot token (`xoxb-...`) |

**Requirements:**
- Slack app with `chat:write` scope
- Bot token from Slack API console

### WhatsApp Sender

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable sender |
| `sessionPath` | string | Path to save WhatsApp session (default: `./data/whatsapp-session`) |

**Requirements:**
- WhatsApp account (phone number)
- First run: QR code displayed in terminal for login
- Session persists on disk

## Target Format

The `target` parameter depends on the platform:

| Platform | Target Format | Example |
|----------|---------------|---------|
| Discord | Channel ID (snowflake) | `"123456789012345678"` |
| Slack | Channel ID | `"C012345"` |
| WhatsApp | Phone number | `"+1234567890"` |

### Getting Target IDs

**Discord:**
- Enable Developer Mode in Discord settings
- Right-click channel → Copy ID

**Slack:**
- Open channel → Click channel name → Copy member ID
- Or use Slack API: `conversations.list`

**WhatsApp:**
- Phone number in international format: `+<country><number>`
- Example: `"+1234567890"`

## Error Handling

Senders throw errors on failure. Always wrap in try-catch:

```javascript
async execute(event, context) {
  try {
    await context.send('discord', '123456', 'Hello!');
  } catch (error) {
    context.log('error', 'Failed to send message', { error: error.message });
  }
}
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `No sender loaded for platform` | Sender not enabled in config | Add `"enabled": true` to config |
| `Discord sender not initialized` | Bot token invalid or not connected | Check `DISCORD_BOT_TOKEN` env var |
| `Channel not found` | Wrong Discord channel ID | Copy correct ID from Discord |
| `Failed to send Slack message` | Missing `chat:write` scope | Add scope in Slack app settings |
| `WhatsApp sender not initialized` | QR code not scanned | Scan QR on first run |

## Next Steps

- [Listeners](listeners.md) — Setup platform listeners
- [Your First Plugin](your-first-plugin.md) — Plugin basics
- [Understanding Schemas](schemas.md) — Filter what triggers sends
- [Consuming the REST API](consuming-the-api.md) — Fetch data from other services