// ============================================================================
// lessel — Built-in Rate Limiter Plugin
// Prevents plugin execution floods per channel/user
// ============================================================================

import { LesselPlugin, MessageEvent, PluginContext } from '../types';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Module-level rate limit state (per channel/user key)
const state = new Map<string, RateLimitEntry>();

/**
 * Built-in rate limiter plugin.
 * When installed, it blocks duplicate plugin execution for the same
 * channel/user within a configurable time window.
 *
 * Configure via env:
 *   LESSEL_RATE_LIMIT_WINDOW  — window in ms (default: 5000)
 *   LESSEL_RATE_LIMIT_MAX     — max executions per window (default: 5)
 */
const RateLimiterPlugin: LesselPlugin = {
  name: 'builtin/rate-limiter',
  schema: '*',

  async onStart(_context: PluginContext): Promise<void> {
    const windowMs = parseInt(process.env.LESSEL_RATE_LIMIT_WINDOW || '5000', 10);
    const maxExec = parseInt(process.env.LESSEL_RATE_LIMIT_MAX || '5', 10);
    console.log(`[lessel] ✔ Built-in rate limiter active (max ${maxExec} exec per ${windowMs}ms per channel)`);
  },

  async execute(event: MessageEvent, context: PluginContext): Promise<void> {
    const windowMs = parseInt(process.env.LESSEL_RATE_LIMIT_WINDOW || '5000', 10);
    const maxExec = parseInt(process.env.LESSEL_RATE_LIMIT_MAX || '5', 10);

    // Use channel/user as the rate limit key
    const key = (event.raw.channelId || event.raw.channel || event.raw.from || event.platform) as string;
    if (!key) return;

    const now = Date.now();
    let entry = state.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 0, windowStart: now };
      state.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxExec) {
      context.log('warn', `[rate-limiter] Rate limited for "${key}": ${entry.count}/${maxExec} in ${windowMs}ms`);
      throw new Error('RATE_LIMITED');
    }
  },
};

export default RateLimiterPlugin;