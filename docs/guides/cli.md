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

### `start`

Starts the lessel pipeline (listeners + API server).

```bash
npx @lessel/cli start
```

Loads `lessel.config.json` and `.env`, then:
1. Starts all configured listeners (e.g., Discord)
2. Starts the REST API server
3. Loads and initializes all plugins

### `plugin add <name>`

Installs and registers a plugin.

```bash
npx @lessel/cli plugin add @lessel/plugin-logger
npx @lessel/cli plugin add ./my-local-plugin.js
```

- Accepts an npm package name or a local file path
- Adds the entry to `lessel.config.json` `plugins` array
- Installs the package if it's from npm

## Global Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help for a command |
| `--version` | Print CLI version |

## Examples

```bash
# Full setup from scratch
npx @lessel/cli init
# edit .env to add DISCORD_BOT_TOKEN
npx @lessel/cli plugin add @lessel/plugin-logger
npx @lessel/cli start
```

## Next Steps

- [Getting Started](getting-started.md) — End-to-end walkthrough
- [Your First Plugin](your-first-plugin.md) — Writing plugins
- [API Reference](../api-reference.md) — Programmatic API
