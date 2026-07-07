// ============================================================================
// lessel — Core Type Definitions
// ============================================================================

/** Supported platform identifiers */
export type Platform = 'discord' | 'whatsapp' | 'slack';

/** Direction of message flow */
export type MessageDirection = 'inbound' | 'outbound';

/** Status of a message in the pipeline */
export type MessageStatus = 'received' | 'processed' | 'forwarded' | 'failed';

// ============================================================================
// Core Message Event — flows through the LES pipeline
// ============================================================================
export interface MessageEvent {
  /** Unique event ID */
  id: string;
  /** Which platform this originated from */
  platform: Platform;
  /** Direction of travel */
  direction: MessageDirection;
  /** Raw platform-specific message data */
  raw: Record<string, unknown>;
  /** Normalised payload extracted by the schema */
  payload: Record<string, unknown>;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Schema name that matched this event */
  schemaName?: string;
  /** Auth context (resolved API key info) */
  auth?: AuthContext;
}

export interface AuthContext {
  keyId: string;
  label: string;
}

// ============================================================================
// Schema — user-defined message filter / extractor
// ============================================================================
export interface Schema {
  /** Unique schema name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Which listeners this schema applies to */
  platforms: Platform[];
  /** Listener-specific filter rules */
  filters: SchemaFilter[];
  /** JSONPath/field extraction rules */
  extract: ExtractionRule[];
  /** Whether to store matched messages */
  store: boolean;
}

export interface SchemaFilter {
  field: string;       // e.g. "channelId", "authorId", "content"
  operator: 'eq' | 'ne' | 'contains' | 'regex' | 'startsWith';
  value: string;
}

export interface ExtractionRule {
  /** Target field name in the output payload */
  key: string;
  /** JSONPath or dot-path to extract from the raw message */
  path: string;
  /** Optional default if path yields nothing */
  default?: string;
}

// ============================================================================
// API Key
// ============================================================================
export interface ApiKey {
  id: string;
  key: string;       // hashed
  label: string;
  createdAt: string;
  lastUsedAt?: string;
  enabled: boolean;
}

// ============================================================================
// Stored Message (persisted to SQLite)
// ============================================================================
export interface StoredMessage {
  id: string;
  schemaName: string;
  platform: Platform;
  payload: string;           // JSON-serialised
  raw: string;               // JSON-serialised
  receivedAt: string;        // ISO-8601
  processedAt?: string;
}

// ============================================================================
// Pipeline configuration
// ============================================================================
export interface LesselConfig {
  /** API server port */
  port: number;
  /** Secret used to derive API keys */
  masterSecret?: string;
  /** Registered schemas */
  schemas: Schema[];
  /** API keys (plaintext in config, hashed at runtime) */
  apiKeys: ApiKeyInput[];
  /** Plugin npm packages or local paths to load */
  plugins?: string[];
  /** Listener-specific settings */
  listeners: {
    discord?: DiscordListenerConfig;
    whatsapp?: Record<string, unknown>;    // future
    slack?: Record<string, unknown>;      // future
  };
}

export interface ApiKeyInput {
  label: string;
  enabled?: boolean;
}

export interface DiscordListenerConfig {
  token: string;
  /** Channel IDs to monitor (empty = all accessible) */
  allowedChannels?: string[];
  /** User/role IDs to ignore */
  ignoreUsers?: string[];
  /** Intent flags */
  intents?: string[];
}

// ============================================================================
// ActionResult
// ============================================================================
export interface ActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Plugin System — Executers that run inside the pipeline
// ============================================================================

/** Context passed to every plugin execution */
export interface PluginContext {
  /** Persistence store */
  store: import('../store/Store').Store;
  /** Log a message */
  log: (level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>) => void;
  /** Send a message via a sender (future) */
  send?: (platform: Platform, target: string, content: string) => Promise<void>;
  /** Pipeline metadata */
  pipeline: {
    name: string;
    uptime: number;
  };
}

/** A single plugin module */
export interface LesselPlugin {
  /** Plugin name (must match npm package name or file path) */
  name: string;
  /** Which schema(s) to hook into. "*" means all. */
  schema: string | string[];
  /** Auto-register these schemas when the plugin loads */
  schemas?: Schema[];
  /** Called when a message matches the plugin's schema */
  execute(event: MessageEvent, context: PluginContext): Promise<void>;
  /** Optional: called once at startup */
  onStart?: (context: PluginContext) => Promise<void>;
  /** Optional: called on shutdown */
  onStop?: () => Promise<void>;
}

// ============================================================================
// Dashboard Stats
// ============================================================================
export interface DashboardStats {
  uptime: number;
  messagesToday: number;
  activeSchemas: number;
  activeListeners: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}