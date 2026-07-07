# Understanding Schemas

Schemas are the **filtering and extraction rules** that decide which messages lessel captures and what data gets stored.

## Schema Anatomy

```json
{
  "name": "all-messages",
  "platforms": ["discord"],
  "filters": [],
  "extract": [
    { "key": "content", "path": "content" },
    { "key": "author", "path": "authorName" }
  ],
  "store": true
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique schema identifier |
| `description?` | string | Human-readable description |
| `platforms` | Platform[] | Which platforms this applies to |
| `filters` | SchemaFilter[] | Conditions messages must meet |
| `extract` | ExtractionRule[] | Fields to pull from the raw message |
| `store` | boolean | Whether to persist matched messages |

## Filters

Filters decide **which** messages match. All filters must pass (logical AND).

```json
"filters": [
  { "field": "content", "operator": "contains", "value": "hello" },
  { "field": "channelId", "operator": "eq", "value": "123456789" }
]
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ field: "authorId", op: "eq", value: "123" }` |
| `ne` | Not equals | `{ field: "authorId", op: "ne", value: "123" }` |
| `contains` | String contains | `{ field: "content", op: "contains", value: "bot" }` |
| `regex` | Regex match | `{ field: "content", op: "regex", value: "^!cmd" }` |
| `startsWith` | String prefix | `{ field: "content", op: "startsWith", value: "!" }` |

## Extraction Rules

Extraction decides **what data** gets pulled from the raw message into `event.payload`.

```json
"extract": [
  { "key": "content", "path": "content" },
  { "key": "author", "path": "authorName" },
  { "key": "channel", "path": "channelName" }
]
```

- `key` — The field name in the extracted payload
- `path` — Dot-path or JSONPath into the raw message object
- `default?` — Fallback value if path yields nothing

## Example: Channel-Specific Logger

```json
{
  "name": "support-channel",
  "platforms": ["discord"],
  "filters": [
    { "field": "channelId", "operator": "eq", "value": "999999999" }
  ],
  "extract": [
    { "key": "content", "path": "content" },
    { "key": "author", "path": "authorName" },
    { "key": "timestamp", "path": "timestamp" }
  ],
  "store": true
}
```

## Where Schemas Live

Schemas can be defined in two places:

1. **lessel.config.json** — Static schemas you write
2. **Plugin `schemas` field** — Auto-registered when a plugin loads

When a plugin declares `schemas`, lessel saves them to the SQLite store automatically on startup.

## Next Steps

- [Your First Plugin](your-first-plugin.md) — Use schemas in a plugin
- [Configuration](configuration.md) — Full config reference
- [API Reference](../api-reference.md) — `Schema` type definition
