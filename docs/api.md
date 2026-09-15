## Ponsbloom API Docs

Base URL: `https://api.ponsbloom.com/v1`

Full documentation at [ponsbloom.com](https://ponsbloom.com).

### Authentication

```
Authorization: Bearer <your-api-key>
```

Get your key at [app.ponsbloom.com](https://app.ponsbloom.com).

### Chat Completions

`POST /v1/chat/completions`

OpenAI-compatible. Works with any OpenAI SDK.

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.ponsbloom.com/v1",
    api_key="<key>",
)

response = client.chat.completions.create(
    model="qwen3.6-35b",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)
print(response.choices[0].message.content)
```

### Models

`GET /v1/models` — list available models (requires API key)

`GET /v1/pricing` — list models + pricing (public, no auth)

### Network Stats

`GET /v1/stats` — live network statistics (public)

Returns: provider count, token throughput, regional distribution, silicon mix.
