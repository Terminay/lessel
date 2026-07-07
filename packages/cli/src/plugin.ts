import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function runPlugin(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub !== 'add') {
    console.error('[lessel] Usage: lessel plugin add <package-name>');
    process.exit(1);
  }

  const pkgName = args[1];
  if (!pkgName) {
    console.error('[lessel] Missing plugin package name.');
    process.exit(1);
  }

  console.log(`[lessel] Installing ${pkgName}...`);
  try {
    execSync(`npm install ${pkgName}`, { stdio: 'inherit', cwd: process.cwd() });
  } catch {
    console.error(`[lessel] Failed to install ${pkgName}`);
    process.exit(1);
  }

  // Register in lessel.config.json
  const configPath = path.join(process.cwd(), 'lessel.config.json');
  let config: any = { plugins: [] };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    console.error('[lessel] No lessel.config.json found. Run "lessel init" first.');
    process.exit(1);
  }

  config.plugins = config.plugins || [];
  if (!config.plugins.includes(pkgName)) {
    config.plugins.push(pkgName);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[lessel] Registered ${pkgName} in lessel.config.json`);
  } else {
    console.log(`[lessel] ${pkgName} already registered.`);
  }
}