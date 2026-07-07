# Contributing to lessel

Thank you for your interest in contributing to lessel! This document covers the setup, workflow, and guidelines for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Questions?](#questions)

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/listener-bot.git
   cd listener-bot
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Byte-ne/listener-bot.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 18
- npm

### Install

```bash
npm install
```

This installs all workspace packages (`@lessel/core`, `@lessel/listener-discord`, `@lessel/cli`, `@lessel/plugin-logger`).

### Build

```bash
npm run build
```

Builds all packages via TypeScript.

### Run

```bash
# Copy the example env
cp .env.example .env
# Edit .env with your Discord bot token
npm start
```

### Test

```bash
node test/test-executer.js
```

## Project Structure

```
packages/
  core/              # @lessel/core — types, store, API, pipeline, plugin loader
  listener-discord/  # @lessel/listener-discord — Discord listener
  cli/               # @lessel/cli — npx @lessel/cli init/start/plugin
  plugin-logger/     # @lessel/plugin-logger — example plugin
```

## Coding Guidelines

- **Language**: TypeScript for all packages except plugins (which may be plain JS).
- **Style**: Follow the existing code style (strict TypeScript, 2-space indent, semicolons).
- **No emojis**: Do not use emoji characters in source code, comments, or documentation.
- **JSDoc / TypeDoc**: All public APIs must have JSDoc comments. Use `/** ... */` blocks.
- **Imports**: Use ES module-style imports (`import ... from '...'`).
- **No secrets**: Never commit tokens, keys, or `.env` files.

## Documentation

We use two tools for documentation:

- **TypeDoc** — Generates API docs from TypeScript source files (packages/core, listener-discord, cli).
- **JSDoc** — Generates docs for JavaScript plugins (plugin-logger).

To regenerate docs locally:

```bash
npx typedoc
npx jsdoc packages/plugin-logger/index.js -d docs/api/plugin-logger
```

The output goes to the `docs/` folder and is deployed to GitHub Pages via CI.

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes, following the coding guidelines.
3. Ensure the build passes:
   ```bash
   npm run build
   ```
4. Commit with a clear message:
   ```bash
   git commit -m "feat: add WhatsApp listener"
   ```
5. Push and open a Pull Request against `main`.
6. Ensure the PR template is filled out completely.
7. A maintainer will review your PR. Address any feedback.

## Questions?

Open a [Discussion](https://github.com/Byte-ne/listener-bot/discussions) or file an [Issue](https://github.com/Byte-ne/listener-bot/issues/new/choose).