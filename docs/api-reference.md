# API Reference

The API reference is generated from source code using **TypeDoc** (TypeScript) and **JSDoc** (JavaScript).

## Packages

| Package | Description | Docs |
|---------|-------------|------|
| `@lessel/core` | Core framework: types, store, API, pipeline, plugin loader | [View API](api/index.html) |
| `@lessel/listener-discord` | Discord listener implementation | [View API](api/index.html) |
| `@lessel/listener-slack` | Slack listener implementation | [View API](api/index.html) |
| `@lessel/listener-whatsapp` | WhatsApp listener implementation | [View API](api/index.html) |
| `@lessel/sender-discord` | Discord sender implementation | [View API](api/index.html) |
| `@lessel/sender-slack` | Slack sender implementation | [View API](api/index.html) |
| `@lessel/sender-whatsapp` | WhatsApp sender implementation | [View API](api/index.html) |
| `@lessel/cli` | Command-line interface | [View API](api/index.html) |
| `@lessel/plugin-logger` | Example plugin | [View API](api/plugin-logger/index.html) |

## Core Types

### `MessageEvent`

```typescript
interface MessageEvent {
  id: string;
  platform: 'discord' | 'whatsapp' | 'slack';
  direction: 'inbound' | 'outbound';
  raw: Record<string, unknown>;
  payload: Record<string, unknown>;
  timestamp: string;
  schemaName?: string;
  auth?: AuthContext;
}
```

### `LesselPlugin`

```typescript
interface LesselPlugin {
  name: string;
  schema: string | string[];
  schemas?: Schema[];
  execute(event: MessageEvent, context: PluginContext): Promise<void>;
  onStart?(context: PluginContext): Promise<void>;
  onStop?(): Promise<void>;
}
```

### `PluginContext`

```typescript
interface PluginContext {
  store: Store;
  log: (level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>) => void;
  send?: (platform: Platform, target: string, content: string) => Promise<void>;
  pipeline: { name: string; uptime: number };
}
```

### `Schema`

```typescript
interface Schema {
  name: string;
  platforms: Platform[];
  filters: Filter[];
  extract: ExtractRule[];
  store?: boolean;
}
```

### `Platform`

```typescript
type Platform = 'discord' | 'slack' | 'whatsapp';
```

## Listener Interfaces

### `IListener`

```typescript
interface IListener {
  id: string;
  platform: Platform;
  configure(config: Record<string, unknown>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  isConnected(): boolean;
}
```

## Sender Interfaces

### `ISender`

```typescript
interface ISender {
  platform: Platform;
  start(config: Record<string, unknown>): Promise<void>;
  send(target: string, content: string): Promise<void>;
  stop(): Promise<void>;
}
```

## REST API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | No | Health check |
| `GET /stats` | Yes | Dashboard statistics |
| `GET /schemas` | Yes | List all schemas |
| `GET /messages` | Yes | Retrieve stored messages |
| `GET /messages?schema=...&platform=...` | Yes | Filter messages |
| `GET /messages/stream?since=ISO8601` | Yes | Poll new messages |
| `POST /admin/keys` | Yes | Create a new API key |
| `GET /admin/keys` | Yes | List API keys |
| `DELETE /admin/keys/:id` | Yes | Delete an API key |
| `PATCH /admin/keys/:id/toggle` | Yes | Enable/disable an API key |

All protected endpoints require a `Bearer` token:
```
Authorization: Bearer lsl_<your_api_key>
```

## Full Reference

For complete type definitions, class methods, and interfaces, see the generated documentation:

- [Core API Reference](api/index.html)
- [Plugin Logger API Reference](api/plugin-logger/index.html)
- [Discord Listener API](api/index.html)
- [Slack Listener API](api/index.html)
- [WhatsApp Listener API](api/index.html)
- [Discord Sender API](api/index.html)
- [Slack Sender API](api/index.html)
- [WhatsApp Sender API](api/index.html)
- [CLI API](api/index.html)