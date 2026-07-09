// ============================================================================
// lessel — Built-in Plugin Loader
// Auto-registers all built-in plugins shipped with @lessel/core
// ============================================================================

import { LesselPlugin } from '../types';
import LoggerPlugin from './logger';
import EchoPlugin from './echo';
import WebhookPlugin from './webhook';
import RateLimiterPlugin from './rate-limiter';

const BUILTIN_PLUGINS: LesselPlugin[] = [
  LoggerPlugin,
  EchoPlugin,
  WebhookPlugin,
  RateLimiterPlugin,
];

/**
 * Get all built-in plugins.
 * These are always available without any configuration.
 */
export function getBuiltinPlugins(): LesselPlugin[] {
  return [...BUILTIN_PLUGINS];
}

/**
 * Load built-in plugins into a plugin register function.
 * @param registerFn A function that accepts a LesselPlugin to register
 */
export function loadBuiltins(registerFn: (plugin: LesselPlugin) => void): void {
  for (const plugin of BUILTIN_PLUGINS) {
    registerFn(plugin);
    console.log(`[lessel] ✔ Built-in plugin registered: ${plugin.name}`);
  }
}