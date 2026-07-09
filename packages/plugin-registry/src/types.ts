// ============================================================================
// lessel Plugin Registry — Type Definitions
// ============================================================================

/** Plugin author information */
export interface RegistryAuthor {
  name: string;
  publicKey: string; // Ed25519 public key for signature verification
}

/** A single plugin version */
export interface PluginVersion {
  version: string;
  description: string;
  checksum: string;       // SHA-256 of the tarball
  signature: string;      // Ed25519 signature (hex)
  createdAt: string;      // ISO-8601
  downloads: number;
  /** Which lessel engine versions this supports */
  engines: {
    lessel: string;       // semver range, e.g. ">=1.0.0"
  };
}

/** Full plugin record */
export interface RegistryPlugin {
  name: string;           // e.g. "sentiment-analysis"
  description: string;
  author: RegistryAuthor;
  schema: string[];       // Which schemas this plugin hooks into
  versions: PluginVersion[];
  latestVersion: string;
  totalDownloads: number;
  createdAt: string;
  updatedAt: string;
  /** Tags for search */
  tags: string[];
  /** Whether the plugin is listed in search results */
  listed: boolean;
}

/** API key for plugin authors */
export interface RegistryApiKey {
  id: string;
  keyHash: string;
  authorName: string;
  publicKey: string;
  createdAt: string;
  enabled: boolean;
}

/** Request to publish a plugin */
export interface PublishRequest {
  name: string;
  version: string;
  description: string;
  author: RegistryAuthor;
  schema: string[];
  engines: { lessel: string };
  tags?: string[];
  /** Base64-encoded tarball content */
  tarball: string;
  checksum: string;
  signature: string;
}

/** Search query parameters */
export interface SearchQuery {
  q?: string;
  schema?: string;
  tag?: string;
  page?: number;
  limit?: number;
}