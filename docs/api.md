# Ponsbloom API Reference

Base URL: **`https://api.ponsbloom.com/v1`**

All requests require an `Authorization: Bearer pb-...` header. Keys are managed at [app.ponsbloom.com](https://app.ponsbloom.com).

---

## Authentication

```bash
curl https://api.ponsbloom.com/v1/models \
  -H "Authorization: Bearer pb-YOUR_KEY_HERE"
```

On error:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "type": "authentication_error"
  }
}
```

---

## Chat Completions

### `POST /v1/chat/completions`

OpenAI-compatible. All standard fields are supported.

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | ✅ | Model ID (see [Models](#models)) |
| `messages` | array | ✅ | Array of `{role, content}` objects |
| `stream` | boolean | | Enable SSE streaming (default `false`) |
| `temperature` | float | | 0–2, default 1.0 |
| `max_tokens` | integer | | Maximum tokens in completion |
| `top_p` | float | | Nucleus sampling, default 1.0 |
| `stop` | string \| array | | Stop sequence(s) |
| `presence_penalty` | float | | -2.0 to 2.0 |
| `frequency_penalty` | float | | -2.0 to 2.0 |
| `user` | string | | Your end-user identifier (for abuse tracking) |

#### Example — non-streaming (curl)

```bash
curl https://api.ponsbloom.com/v1/chat/completions \
  -H "Authorization: Bearer pb-YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.6-35b",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is 2 + 2?"}
    ],
    "max_tokens": 64
  }'
```

#### Response

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1718000000,
  "model": "qwen3.6-35b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "2 + 2 = 4."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 9,
    "total_tokens": 33
  },
  "pb_meta": {
    "provider_id": "prov_m3max_sf_01",
    "signature": "MEQCIB...==",
    "attestation_hash": "0xabc..."
  }
}
```

The `pb_meta` object contains:
- `provider_id` — which provider processed the request
- `signature` — ECDSA P-256 signature of the response body (hex-encoded)
- `attestation_hash` — on-chain attestation record for this provider

#### Example — streaming (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.ponsbloom.com/v1",
    api_key="pb-YOUR_KEY_HERE",
)

stream = client.chat.completions.create(
    model="gemma-4-26b",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Write a haiku about distributed systems."},
    ],
    stream=True,
    max_tokens=128,
)

for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
print()
```

---

## Models

### `GET /v1/models`

Returns the list of currently available models.

```bash
curl https://api.ponsbloom.com/v1/models \
  -H "Authorization: Bearer pb-YOUR_KEY_HERE"
```

#### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3.6-35b",
      "object": "model",
      "created": 1718000000,
      "owned_by": "ponsbloom",
      "context_window": 32768,
      "pricing": {
        "input_per_million": 0.05,
        "output_per_million": 0.70
      }
    },
    {
      "id": "gemma-4-26b",
      "object": "model",
      "created": 1718000000,
      "owned_by": "ponsbloom",
      "context_window": 131072,
      "pricing": {
        "input_per_million": 0.042,
        "output_per_million": 0.22
      }
    },
    {
      "id": "gpt-oss-20b",
      "object": "model",
      "created": 1718000000,
      "owned_by": "ponsbloom",
      "context_window": 8192,
      "pricing": {
        "input_per_million": 0.02,
        "output_per_million": 0.10
      }
    },
    {
      "id": "nvidia-nemotron-3.5",
      "object": "model",
      "created": 1718000000,
      "owned_by": "ponsbloom",
      "context_window": 16384,
      "pricing": {
        "input_per_million": 0.065,
        "output_per_million": 0.18
      }
    }
  ]
}
```

### `GET /v1/models/{model}`

Retrieve details for a specific model.

```bash
curl https://api.ponsbloom.com/v1/models/qwen3.6-35b \
  -H "Authorization: Bearer pb-YOUR_KEY_HERE"
```

---

## Pricing

### `GET /v1/pricing`

Returns the current network-average pricing for all models (no auth required).

```bash
curl https://api.ponsbloom.com/v1/pricing
```

#### Response

```json
{
  "object": "pricing",
  "updated_at": 1718000000,
  "currency": "USD",
  "models": [
    {
      "id": "qwen3.6-35b",
      "input_per_million_tokens": 0.05,
      "output_per_million_tokens": 0.70
    },
    {
      "id": "gemma-4-26b",
      "input_per_million_tokens": 0.042,
      "output_per_million_tokens": 0.22
    },
    {
      "id": "gpt-oss-20b",
      "input_per_million_tokens": 0.02,
      "output_per_million_tokens": 0.10
    },
    {
      "id": "nvidia-nemotron-3.5",
      "input_per_million_tokens": 0.065,
      "output_per_million_tokens": 0.18
    }
  ]
}
```

---

## Usage & Stats

### `GET /v1/usage`

Returns token usage for the current billing period, scoped to your API key.

```bash
curl https://api.ponsbloom.com/v1/usage \
  -H "Authorization: Bearer pb-YOUR_KEY_HERE"
```

#### Response

```json
{
  "object": "usage",
  "period_start": "2025-06-01T00:00:00Z",
  "period_end": "2025-06-30T23:59:59Z",
  "total_cost_usd": 1.24,
  "breakdown": [
    {
      "model": "qwen3.6-35b",
      "input_tokens": 120000,
      "output_tokens": 45000,
      "cost_usd": 0.9375
    },
    {
      "model": "gpt-oss-20b",
      "input_tokens": 80000,
      "output_tokens": 30000,
      "cost_usd": 0.3
    }
  ]
}
```

### `GET /v1/stats`

Public network statistics (no auth required).

```bash
curl https://api.ponsbloom.com/v1/stats
```

#### Response

```json
{
  "object": "network_stats",
  "providers_online": 142,
  "requests_last_24h": 890341,
  "tokens_last_24h": 4821000000,
  "p50_latency_ms": 312,
  "p99_latency_ms": 1840
}
```

---

## Error Codes

| HTTP Status | `error.code` | Meaning |
|---|---|---|
| 400 | `invalid_request_error` | Malformed request body |
| 401 | `invalid_api_key` | Key missing, invalid, or revoked |
| 402 | `insufficient_balance` | Prepaid balance depleted |
| 422 | `model_not_found` | Requested model ID does not exist |
| 429 | `rate_limit_exceeded` | Too many requests; retry after `Retry-After` header |
| 503 | `no_providers_available` | All providers for the model are busy; retry shortly |
| 500 | `internal_error` | Coordinator-side error; contact support |

---

## Rate Limits

Default limits per API key:

| Tier | Requests / min | Tokens / min |
|---|---|---|
| Free | 10 | 100,000 |
| Starter | 60 | 500,000 |
| Pro | 600 | 5,000,000 |
| Enterprise | Custom | Custom |

Limits are returned in response headers:

```
X-RateLimit-Limit-Requests: 60
X-RateLimit-Remaining-Requests: 58
X-RateLimit-Reset-Requests: 2025-06-15T12:00:30Z
```

---

## SDK Support

Any OpenAI-compatible SDK works by setting `base_url`:

```python
# Python
from openai import OpenAI
client = OpenAI(base_url="https://api.ponsbloom.com/v1", api_key="pb-...")
```

```typescript
// TypeScript / Node.js
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://api.ponsbloom.com/v1", apiKey: "pb-..." });
```

```bash
# CLI via llm tool
llm -m ponsbloom/qwen3.6-35b "Tell me about Apple Silicon"
```
