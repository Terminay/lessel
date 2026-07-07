# Your First Plugin

Plugins are executers that run **inside** the lessel pipeline. They hook into schemas and process matched messages.

## Plugin Structure

A plugin is a Node.js module that exports an object:

```javascript
module.exports = {
  name: 'my-plugin',
  schema: 'all-messages',        // which schema to hook into
  async execute(event, context) {
    // your code here
  }
};
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique plugin identifier |
| `schema` | string \| string[] | Schema name(s) to hook into. Use `'*'` for all |
| `schemas?` | Schema[] | Schemas to auto-register when plugin loads |
| `execute` | function | Called when a message matches |
| `onStart?` | function | Called once at startup |
| `onStop?` | function | Called on shutdown |

### The `execute` Function

```javascript
async execute(event, context) {
  // event.payload    — extracted fields from the message
  // event.platform   — 'discord' | 'whatsapp' | 'slack'
  // event.schemaName — which schema matched
  // context.store    — direct SQLite access
  // context.log      — logging helper
  // context.send     — (future) send a message back
}
```

## Example: Keyword Alert Plugin

Create `my-plugin.js`:

```javascript
module.exports = {
  name: 'keyword-alert',
  schema: 'all-messages',
  async execute(event, context) {
    const content = event.payload.content || '';
    const keywords = ['urgent', 'help', 'alert'];

    const found = keywords.filter(k => content.toLowerCase().includes(k));
    if (found.length > 0) {
      context.log('warn', `Alert! Found keywords: ${found.join(', ')}`);
      console.log(`[${event.platform}] ${event.payload.author}: ${content}`);
    }
  },
  async onStart(context) {
    context.log('info', 'Keyword alert plugin started');
  }
};
```

## Register Your Plugin

Add to `lessel.config.json`:

```json
{
  "plugins": ["./my-plugin.js"]
}
```

Or use the CLI:
```bash
npx @lessel/cli plugin add ./my-plugin.js
```

## Auto-Registering Schemas

Your plugin can define its own schemas that get registered automatically:

```javascript
module.exports = {
  name: 'my-plugin',
  schema: 'my-custom-schema',
  schemas: [
    {
      name: 'my-custom-schema',
      platforms: ['discord'],
      filters: [{ field: 'content', operator: 'contains', value: 'bot' }],
      extract: [
        { key: 'content', path: 'content' },
        { key: 'author', path: 'authorName' }
      ],
      store: true
    }
  ],
  async execute(event, context) {
    context.log('info', `Bot message from ${event.payload.author}`);
  }
};
```

## Install Published Plugins

```bash
npx @lessel/cli plugin add @lessel/plugin-logger
```

## Next Steps

- [Understanding Schemas](schemas.md) — Deep dive into filtering
- [API Reference](../api-reference.md) — Full type definitions
