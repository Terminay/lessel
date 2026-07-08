# CLI Reference

The `@lessel/cli` package provides the command-line interface for scaffolding and running lessel.

## Usage

```bash
npx @lessel/cli <command>
```

## Commands

### `init`

Scaffolds a new lessel project in the current directory.

```bash
npx @lessel/cli init
```

Creates:
- `lessel.config.json` — base configuration
- `.env` — environment variables template

Prompts you to select which platforms to enable (Discord, Slack, WhatsApp) and generates the corresponding config sections.

### `start`

Starts the lessel pipeline (listeners + API server).

```bash
npx @lessel/cli start
```

Loads `lessel.config.json` and `.env`, then:
1. Starts all configured listeners (Discord, Slack, WhatsApp)
2. Starts the REST API server
3. Loads and initializes all plugins

Logs the active listeners and plugin count on startup.

### `plugin add <name>`

Installs and registers a plugin.

```bash
npx @lessel/cli plugin add @lessel/plugin-logger
npx @lessel/cli plugin add ./my-local-plugin.js
```

- Accepts an npm package name or a local file path
- Adds the entry to `lessel.config.json` `plugins` array
- Installs the package if it's from npm
- Validates that the plugin exports the required `name`, `schema`, and `execute` fields

### `plugin list`

Lists all installed plugins from `lessel.config.json`.

```bash
npx @lessel/cli plugin list
```

### `plugin remove <name>`

Removes a plugin from `lessel.config.json`.

```bash
npx @lessel/cli plugin remove my-plugin
```

Does not uninstall the npm package automatically.

### `--version`

Print CLI version.

```bash
npx @lessel/cli --version
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help for a command |
| `--version` | Print CLI version |

## Examples

```bash
# Full setup from scratch
npx @lessel/cli init
# edit .env to add DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN, etc.
npx @lessel/cli plugin add @lessel/plugin-logger
npx @lessel/cli start
```

```bash
# Add a local plugin
npx @lessel/cli plugin add ./my-custom-plugin.js
npx @lessel/cli start
```

```bash
# List installed plugins
npx @lessel/cli plugin list
```

## Next Steps

- [Getting Started](getting-started.md) — End-to-end walkthrough
- [Listeners](listeners.md) — Setup Discord, Slack, and WhatsApp
- [Your First Plugin](your-first-plugin.md) — Writing plugins
- [Sending Messages](sending-messages.md) — Send replies to platforms
- [API Reference](../api-reference.md) — Programmatic API