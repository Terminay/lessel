// ============================================================================
// lessel — Built-in Echo Plugin
// Auto-replies to matched messages with a simple echo for testing
// ============================================================================

import { LesselPlugin, MessageEvent, PluginContext } from '../types';

/**
 * Built-in echo plugin.
 * When a message matches a schema, it echoes the payload back.
 * Useful for testing pipeline connectivity.
 */
const EchoPlugin: LesselPlugin = {
  name: 'builtin/echo',
  schema: '*',
  async execute(event: MessageEvent, context: PluginContext): Promise<void> {
    const content = (event.payload.content || event.payload.text || JSON.stringify(event.payload)) as string;
    const target = (event.raw.channelId || event.raw.channel || event.raw.from) as string;

    if (target) {
      await context.send(event.platform, target, `Echo: ${content.slice(0, 200)}`);
      context.log('info', `[echo] Replied to "${event.schemaName}" on ${event.platform}`);
    }
  },
  async onStart(_context: PluginContext): Promise<void> {
    console.log('[lessel] ✔ Built-in echo active (will auto-reply to matched messages)');
  },
};

export default EchoPlugin;