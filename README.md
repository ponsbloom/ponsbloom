# Ponsbloom

**Private AI inference on verified Apple Silicon.**

Ponsbloom is a decentralized inference network connecting idle Apple Silicon machines to AI demand. Every request is encrypted end-to-end. Every response is signed by hardware you can verify.

## What is this?

- **OpenAI-compatible API** — point any OpenAI SDK at Ponsbloom
- **Hardware-attested** — Apple Secure Enclave attestation per node
- **~50% cheaper** than centralized APIs
- **0% platform fee** for providers

## Links

- 🌐 **Website**: [ponsbloom.com](https://ponsbloom.com)
- 🚀 **Console**: [app.ponsbloom.com](https://app.ponsbloom.com)
- 🐦 **X**: [@Ponsbloom](https://x.com/Ponsbloom)

## Quickstart

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.ponsbloom.com/v1",
    api_key="<your-api-key>",
)

response = client.chat.completions.create(
    model="qwen3.6-35b",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True,
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

Get your API key at [app.ponsbloom.com](https://app.ponsbloom.com).

## Models

| Model | Providers | Input / 1M | Output / 1M |
|---|---|---|---|
| qwen3.6-35b | 680+ | $0.05 | $0.70 |
| gemma-4-26b | 500+ | $0.042 | $0.22 |
| gpt-oss-20b | 545+ | $0.02 | $0.10 |
| nvidia-nemotron-3.5 | 87+ | $0.065 | $0.18 |
| Qwen3.5-9B | 137+ | $0.08 | $0.13 |

## Network

The network is live with **1,100+ verified Apple Silicon providers** across 60+ countries. All providers are hardware-attested via Apple's device attestation framework.

## For Providers

Run AI inference on your Mac and earn USD:

```bash
curl -fsSL https://api.ponsbloom.com/install.sh | bash
ponsbloom start
```

Requirements: Apple Silicon Mac (M1 or later), macOS 13+, plugged into power.

---

*Research preview — provided as-is for evaluation.*
