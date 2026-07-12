// ============================================================================
// lessel — Core Framework Entry Point
// ============================================================================

export { IListener } from './listener/IListener';
export { Store } from './store/Store';
export { ApiServer } from './api/ApiServer';
export { PipelineManager } from './pipeline/PipelineManager';
export { PluginLoader } from './plugin/PluginLoader';
export { SenderLoader } from './sender/SenderLoader';
export { ISender } from './sender/ISender';

export { getBuiltinPlugins, loadBuiltins } from './builtins';
export { bootstrap, run, detectPlatforms, generateCatchAllSchema, generateConfig } from './lessel';
export type { BootstrapOptions, BootstrapResult } from './lessel';
export { GitHubPluginRegistry, generatePluginChecksum } from './registry/GitHubPluginRegistry';
export type { GitHubPluginInfo, RegistryIndex } from './registry/GitHubPluginRegistry';
export { default as LoggerPlugin } from './builtins/logger';
export { default as EchoPlugin } from './builtins/echo';
export { default as WebhookPlugin } from './builtins/webhook';
export { default as RateLimiterPlugin } from './builtins/rate-limiter';

export * from './types';