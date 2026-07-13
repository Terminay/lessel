# lessel

**lessel** (from "vessel") is a general-purpose, open-source message pipeline framework. It connects to platforms like **Discord**, **WhatsApp**, and **Slack**, listens for messages that match your rules, stores them, and runs your own executers (plugins) to process them.

## What is the LES Framework?

lessel is built on three core concepts:

- **Listen** — Connect to platforms (Discord, WhatsApp, Slack) and capture incoming messages
- **Execute** — Run plugins (your code) against messages that match your filters
- **Send** — Send processed results back to any platform (Discord, Slack, WhatsApp)

## Quick Example

```javascript
// my-first-plugin.js
module.exports = {
  name: 'my-first-plugin',
  schema: 'all-messages',
  async execute(event, context) {
    context.log('info', `Got message: ${event.payload.content}`);
  }
};
```

## Why lessel?

| Feature | Description |
|---------|-------------|
| Platform-agnostic | Discord built-in. WhatsApp & Slack coming soon |
| Schema-based filtering | Define what messages to capture using simple JSON rules |
| SQLite storage | Zero-config persistence. No external database needed |
| API Key auth | Secure REST API for external integrations |
| Plugin system | Install `@lessel/plugin-*` packages that run inside the pipeline |
| Extensible | Build your own listeners, senders, and plugins |

## Plugin Registry

lessel has a community plugin registry powered by GitHub. Browse, search, and install plugins without running any servers.

```bash
# Search available plugins
npx lessel plugin search sentiment

# Install a plugin
npx lessel plugin install example-logger

# Prepare your plugin for publishing
npx lessel plugin publish ./path/to/plugin
```

**Browse the registry:** [https://terminay.github.io/lessel-plugins](https://terminay.github.io/lessel-plugins)

**Submit plugins via PR:** [https://github.com/Terminay/lessel-plugins](https://github.com/Terminay/lessel-plugins)

## Next Steps

- [Getting Started](guides/getting-started.md) — Install and run lessel
- [Your First Plugin](guides/your-first-plugin.md) — Write a plugin from scratch
- [Understanding Schemas](guides/schemas.md) — Learn how filtering works
- [Publishing Plugins](guides/publishing-plugins.md) — Publish to the community registry
- [API Reference](api-reference.md) — Auto-generated from source code
