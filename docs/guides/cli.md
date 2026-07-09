# Command-Line Interface (CLI)

The `@lessel/cli` package provides the `lessel` command for managing and running your lessel pipeline.

## Installation

```bash
# Global installation (recommended)
npm install -g @lessel/cli

# Or run directly
npx @lessel/cli <command>
```

## Commands

### `lessel start`

Start the lessel pipeline.

With **zero config**, lessel automatically detects platform tokens from environment variables and starts with catch-all schemas and built-in plugins:

```bash
lessel start
```

This will:
1. Check environment variables (`DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN`, `WHATSAPP_PHONE`, etc.)
2. Auto-generate config if no `lessel.config.json` exists
3. Dynamically load listener/sender packages for detected platforms
4. Register built-in plugins (logger, echo, webhook, rate-limiter)
5. Start the API server

You can also specify a custom config:

```bash
lessel start --config ./path/to/config.json
```

### `lessel status`

Show pipeline health and configuration overview without starting the pipeline:

```bash
lessel status
```

Outputs:
- ✅ Detected platforms from environment variables
- ✅ Config file status
- ✅ Database status (exists, size)
- ✅ Schema list (or auto-creation preview)
- ✅ Environment variable status (masked)
- ✅ Summary

### `lessel init`

Scaffold a new lessel project in the current directory:

```bash
lessel init
```

Creates:
- `lessel.config.json` — your configuration with a sample Discord schema
- `.env` — environment variable template

### `lessel plugin add <name>`

Install a plugin package and register it in your config:

```bash
lessel plugin add @lessel/plugin-logger
```

This installs the npm package and adds it to the `plugins` array in `lessel.config.json`.

### `lessel version`

Show the installed version:

```bash
lessel version
```

### `lessel help`

Display usage information:

```bash
lessel help
```

## Quick Reference

```bash
lessel start              # Start pipeline (zero-config)
lessel status             # Show pipeline health
lessel init               # Scaffold a new project
lessel plugin add <name>  # Install a plugin
lessel help               # Show help
lessel version            # Show version
```

## Zero-Config Quick Start

```bash
# 1. Set your platform token
export DISCORD_BOT_TOKEN=your_token_here

# 2. Check that lessel detects it
lessel status

# 3. Start
lessel start
```

lessel handles everything else — no config file, no manual setup.