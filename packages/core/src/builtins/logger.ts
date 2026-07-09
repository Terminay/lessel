// ============================================================================
// lessel — Built-in Logger Plugin
// Logs every matched message to console + store
// ============================================================================

import { LesselPlugin, MessageEvent, PluginContext } from '../types';

/**
 * Built-in logger plugin.
 * Automatically logs every matched message with its payload and schema.
 * No config needed — always active.
 */
const LoggerPlugin: LesselPlugin = {
  name: 'builtin/logger',
  schema: '*',
  async execute(event: MessageEvent, context: PluginContext): Promise<void> {
    context.log('info', `[logger] Schema matched: "${event.schemaName}"`, {
      id: event.id,
      platform: event.platform,
      payload: event.payload,
      timestamp: event.timestamp,
    });
  },
  async onStart(_context: PluginContext): Promise<void> {
    console.log('[lessel] ✔ Built-in logger active (will log all matched messages)');
  },
};

export default LoggerPlugin;