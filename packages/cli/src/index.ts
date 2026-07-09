import { runInit } from './init';
import { runStart } from './start';
import { runPlugin } from './plugin';
import { runStatus } from './status';

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'init':
      await runInit();
      break;
    case 'start':
      await runStart();
      break;
    case 'plugin':
      await runPlugin(args);
      break;
    case 'status':
      await runStatus();
      break;
    case 'version':
    case '--version':
    case '-v':
      printVersion();
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`[lessel] Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printVersion() {
  const pkg = require('../../package.json');
  console.log(`lessel v${pkg.version}`);
}

function printHelp() {
  console.log(`lessel — message pipeline framework

Usage:
  lessel init          Scaffold a new lessel project in the current directory
  lessel start         Start the lessel pipeline (auto-detects config & env vars)
  lessel status        Show pipeline health and configuration overview
  lessel plugin add    Install a plugin and register it in the config
  lessel version       Show version
  lessel help          Show this help

Zero-Config Quick Start:
  1. Set environment variables (e.g. DISCORD_BOT_TOKEN)
  2. Run: lessel start
  3. lessel auto-detects platforms and starts with catch-all schemas

Examples:
  npx @lessel/cli init
  npx @lessel/cli start
  npx @lessel/cli status
  npx @lessel/cli plugin add @lessel/plugin-logger
`);
}

main().catch((err) => {
  console.error('[lessel] Fatal error:', err);
  process.exit(1);
});