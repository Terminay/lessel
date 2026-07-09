// ============================================================================
// lessel — Built-in Webhook Forwarder
// Forwards matched messages to a configurable HTTP endpoint
// ============================================================================

import { LesselPlugin, MessageEvent, PluginContext } from '../types';

/**
 * Built-in webhook plugin.
 * Forwards matched messages to a configurable HTTP(S) endpoint.
 * Configure via env: LESSEL_WEBHOOK_URL (comma-separated for multiple)
 * Optionally: LESSEL_WEBHOOK_SCHEMA (only forward specific schema)
 */
const WebhookPlugin: LesselPlugin = {
  name: 'builtin/webhook',
  schema: '*',
  async onStart(_context: PluginContext): Promise<void> {
    const urls = process.env.LESSEL_WEBHOOK_URL;
    const schemaFilter = process.env.LESSEL_WEBHOOK_SCHEMA;
    if (urls) {
      const count = urls.split(',').length;
      console.log(`[lessel] ✔ Built-in webhook active (${count} endpoint(s)${schemaFilter ? `, filtering on "${schemaFilter}"` : ''})`);
    }
  },
  async execute(event: MessageEvent, context: PluginContext): Promise<void> {
    const urls = process.env.LESSEL_WEBHOOK_URL;
    if (!urls) return;

    const schemaFilter = process.env.LESSEL_WEBHOOK_SCHEMA;
    if (schemaFilter && event.schemaName !== schemaFilter) return;

    const payload = JSON.stringify({
      id: event.id,
      schema: event.schemaName,
      platform: event.platform,
      payload: event.payload,
      raw: event.raw,
      timestamp: event.timestamp,
    });

    for (const url of urls.split(',')) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) continue;

      try {
        const response = await fetch(trimmedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!response.ok) {
          context.log('warn', `[webhook] ${trimmedUrl} returned ${response.status}`);
        }
      } catch (err) {
        context.log('error', `[webhook] Failed to POST to ${trimmedUrl}: ${(err as Error).message}`);
      }
    }
  },
};

export default WebhookPlugin;