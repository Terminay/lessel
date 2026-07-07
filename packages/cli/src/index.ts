import { runInit } from './init';
import { runStart } from './start';
import { runPlugin } from './plugin';

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

function printHelp() {
  console.log(`lessel CLI — message pipeline framework

Usage:
  lessel init                 Scaffold a new lessel project in the current directory
  lessel start                Start the lessel pipeline (reads lessel.config.json)
  lessel plugin add <name>    Install a plugin and register it in the config
  lessel help                 Show this help

Examples:
  npx @lessel/cli init
  npx @lessel/cli start
  npx @lessel/cli plugin add @lessel/plugin-logger
`);
}

main().catch((err) => {
  console.error('[lessel] Fatal error:', err);
  process.exit(1);
});