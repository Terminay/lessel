// ============================================================================
// lessel — Sender Interface
// ============================================================================

import { Platform } from '../types';

/**
 * Abstract interface for all platform senders.
 * Implementations: DiscordSender, SlackSender, WhatsAppSender
 */
export interface ISender {
  /** Platform identifier */
  readonly platform: Platform;
  /** Send a message to a target (channel ID, phone number, etc.) */
  send(target: string, content: string): Promise<void>;
  /** Initialise the sender (login, connect, etc.) */
  start(config: Record<string, unknown>): Promise<void>;
  /** Shut down cleanly */
  stop(): Promise<void>;
}