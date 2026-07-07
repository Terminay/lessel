# Consuming the REST API

lessel exposes a REST API so external tools can read captured messages, schemas, and stats. This guide shows you how to interact with it.

## Base URL

```
http://localhost:3100
```

Change `3100` if you set a different `port` in `lessel.config.json`.

## Authentication

Most endpoints require an API key. Create one using the admin endpoint:

```bash
curl -X POST http://localhost:3100/admin/keys \
  -H "Authorization: Bearer lsl_your_master_key" \
  -H "Content-Type: application/json" \
  -d '{"label": "my-app"}'
```

Response:
```json
{
  "id": "abc-123",
  "rawKey": "lsl_abc123...",
  "label": "my-app"
}
```

**Save the `rawKey`** — it's shown only once. Use it as a Bearer token:

```
Authorization: Bearer lsl_abc123...
```

## Endpoints

### Health Check (no auth)

```bash
curl http://localhost:3100/health
```

```json
{ "status": "ok" }
```

### Dashboard Stats

```bash
curl http://localhost:3100/stats \
  -H "Authorization: Bearer lsl_your_key"
```

```json
{
  "uptime": 12345,
  "messagesToday": 42,
  "activeSchemas": 3,
  "activeListeners": 1,
  "memoryUsage": {
    "rss": 128,
    "heapUsed": 64,
    "heapTotal": 128
  }
}
```

### List Schemas

```bash
curl http://localhost:3100/schemas \
  -H "Authorization: Bearer lsl_your_key"
```

### Fetch Messages

```bash
# Get last 50 messages
curl http://localhost:3100/messages \
  -H "Authorization: Bearer lsl_your_key"

# Filter by schema
curl "http://localhost:3100/messages?schema=all-messages" \
  -H "Authorization: Bearer lsl_your_key"

# Filter by platform
curl "http://localhost:3100/messages?platform=discord" \
  -H "Authorization: Bearer lsl_your_key"

# Pagination
curl "http://localhost:3100/messages?limit=20&offset=10" \
  -H "Authorization: Bearer lsl_your_key"
```

### Stream New Messages

Poll for messages since a specific timestamp:

```bash
curl "http://localhost:3100/messages/stream?since=2025-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer lsl_your_key"
```

Returns an array of new messages. Call this endpoint repeatedly (e.g., every 5 seconds) to check for updates.

## JavaScript Example

```javascript
const API_BASE = 'http://localhost:3100';
const API_KEY = 'lsl_your_key';

async function fetchMessages() {
  const res = await fetch(`${API_BASE}/messages?limit=10`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function streamMessages(since) {
  const url = `${API_BASE}/messages/stream?since=${encodeURIComponent(since)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Usage
const messages = await fetchMessages();
console.log('Recent messages:', messages);

const newMessages = await streamMessages(new Date(Date.now() - 60000).toISOString());
console.log('New messages:', newMessages);
```

## Python Example

```python
import requests

API_BASE = 'http://localhost:3100'
API_KEY = 'lsl_your_key'
HEADERS = {'Authorization': f'Bearer {API_KEY}'}

def fetch_messages(limit=10, schema=None, platform=None):
    params = {'limit': limit}
    if schema: params['schema'] = schema
    if platform: params['platform'] = platform
    
    res = requests.get(f'{API_BASE}/messages', headers=HEADERS, params=params)
    res.raise_for_status()
    return res.json()

def stream_messages(since):
    params = {'since': since}
    res = requests.get(f'{API_BASE}/messages/stream', headers=HEADERS, params=params)
    res.raise_for_status()
    return res.json()

# Usage
messages = fetch_messages(schema='all-messages')
print(messages)
```

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 401 | Missing/invalid API key | Check `Authorization: Bearer lsl_...` header |
| 403 | Key disabled or insufficient perms | Verify key is enabled in config |
| 404 | Endpoint not found | Check URL path |
| 500 | Server error | Check lessel logs |

## Next Steps

- [Your First Plugin](your-first-plugin.md) — Process messages internally
- [Understanding Schemas](schemas.md) — Filter what gets captured
- [API Reference](../api-reference.md) — Full type definitions