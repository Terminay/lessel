# Publishing Plugins

Once you've built a plugin, you can publish it to npm so others can install it with `npx @lessel/cli plugin add @lessel/plugin-your-name`.

## Prerequisites

- An [npm](https://www.npmjs.com/) account
- Your plugin code ready
- The `@lessel` npm org (ask the maintainers for access, or just publish under your own name)

## Plugin Structure

A minimal plugin is a single JavaScript or TypeScript file:

```
my-plugin/
  index.js
  package.json
  README.md
```

Or for TypeScript:

```
my-plugin/
  src/
    index.ts
  package.json
  tsconfig.json
```

## package.json

```json
{
  "name": "@lessel/plugin-my-plugin",
  "version": "1.0.0",
  "description": "Description of what this plugin does",
  "main": "index.js",
  "files": ["index.js"],
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "@lessel/core": "^0.1.0"
  },
  "license": "MIT"
}
```

### Field explanations

| Field | Description |
|-------|-------------|
| `name` | Must start with `@lessel/plugin-` |
| `version` | Semver (1.0.0, 1.1.0, etc.) |
| `main` | Entry point file |
| `files` | Files to include in the npm package |
| `peerDependencies` | Specify compatible `@lessel/core` version |

## Writing the Plugin Code

### JavaScript (index.js)

```javascript
module.exports = {
  name: '@lessel/plugin-my-plugin',
  description: 'My awesome plugin',
  schema: 'all-messages',

  schemas: [
    {
      name: 'my-custom-schema',
      platforms: ['discord'],
      filters: [{ field: 'content', operator: 'contains', value: 'hello' }],
      extract: [{ key: 'content', path: 'content' }],
      store: true
    }
  ],

  async execute(event, context) {
    context.log('info', 'Plugin executed', {
      schema: event.schemaName,
      content: event.payload.content
    });
  },

  async onStart(context) {
    context.log('info', 'My plugin started');
  }
};
```

### TypeScript (src/index.ts)

```typescript
import type { LesselPlugin, PluginContext, MessageEvent } from '@lessel/core';

const plugin: LesselPlugin = {
  name: '@lessel/plugin-my-plugin',
  description: 'My awesome plugin',
  schema: 'all-messages',

  schemas: [
    {
      name: 'my-custom-schema',
      platforms: ['discord'],
      filters: [{ field: 'content', operator: 'contains', value: 'hello' }],
      extract: [{ key: 'content', path: 'content' }],
      store: true
    }
  ],

  async execute(event: MessageEvent, context: PluginContext) {
    context.log('info', 'Plugin executed', {
      schema: event.schemaName,
      content: event.payload.content
    });
  },

  async onStart(context: PluginContext) {
    context.log('info', 'My plugin started');
  }
};

export = plugin;
```

## Build (if using TypeScript)

```json
{
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

The `prepublishOnly` hook ensures TypeScript compiles before `npm publish`.

## Publish to npm

```bash
# Login
npm login

# Verify
npm whoami

# Publish
npm publish --access public
```

If you're publishing under the `@lessel` org:

```bash
npm publish --access public
```

Make sure you have write access to the `@lessel` org. If not, publish under your own npm username (e.g., `@yourname/plugin-my-plugin`) — lessel will still load it.

## Test Before Publishing

```bash
npm link
cd /path/to/your/lessel/project
npm link @lessel/plugin-my-plugin
```

Then add to `lessel.config.json`:
```json
{
  "plugins": ["@lessel/plugin-my-plugin"]
}
```

## After Publishing

Users install your plugin with:

```bash
npx @lessel/cli plugin add @lessel/plugin-my-plugin
```

Or manually in `lessel.config.json`:
```json
{
  "plugins": ["@lessel/plugin-my-plugin"]
}
```

## Best Practices

- **No emojis** in code, comments, or README
- **JSDoc comments** on public functions
- **Readme.md** — explain what the plugin does, how to configure it, examples
- **Semantic versioning** — bump major for breaking changes, minor for features, patch for fixes
- **Test locally** before publishing
- **License** — include a LICENSE file (MIT recommended)

## Next Steps

- [Your First Plugin](your-first-plugin.md) — Writing the plugin itself
- [Configuration](configuration.md) — Plugin config options
- [Contributing](https://github.com/Terminay/lessel/blob/main/CONTRIBUTING.md) — Submit your plugin to the lessel org