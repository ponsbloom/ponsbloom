# Ponsbloom

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/ponsbloom/ponsbloom/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Research Preview](https://img.shields.io/badge/status-research%20preview-blue)](https://ponsbloom.com)

**Decentralized private AI inference on idle Apple Silicon Macs.**

The cloud AI inference market extracts margin at every layer — GPU fleets, data-center overhead, and opaque pricing leave both users and compute owners shortchanged. Ponsbloom routes inference requests directly to verified Apple Silicon machines sitting idle on desks and in homes worldwide. Every inference request is encrypted end-to-end, every response is cryptographically signed by Apple Secure Enclave hardware you can verify yourself, and every provider earns 100% of the compute fee with no platform cut.

---

## Architecture

```
  Consumer (OpenAI SDK / cURL)
           │
           │  HTTPS + JWT
           ▼
  ┌─────────────────────────┐
  │      Coordinator        │  ← Go  ·  job scheduling · billing · attestation registry
  └─────────┬───────────────┘
            │  gRPC (mTLS)
            ▼
  ┌─────────────────────────┐
  │    Provider Agent       │  ← Rust + PyO3  ·  sandboxed model runner
  │                         │
  │  ┌───────────────────┐  │
  │  │   MLX Runtime     │  │  ← Apple Silicon neural engine  ·  Metal shaders
  │  └───────────────────┘  │
  │                         │
  │  ┌───────────────────┐  │
  │  │  Secure Enclave   │  │  ← attestation token  ·  output signing key
  │  └───────────────────┘  │
  └─────────────────────────┘
```

---

## Components

| Component | Language / Runtime | Description |
|---|---|---|
| [`coordinator`](./coordinator) | Go 1.22 | Job scheduler, billing, attestation registry, REST + gRPC gateway |
| [`provider`](./provider) | Rust + PyO3 / MLX | On-device inference agent; communicates with coordinator over mTLS |
| [`console-ui`](./console-ui) | Next.js 14 / React | Web dashboard at [app.ponsbloom.com](https://app.ponsbloom.com) |
| [`enclave`](./enclave) | Swift / CryptoKit | Secure Enclave key generation, attestation, and output signing |
| [`image-bridge`](./image-bridge) | Python | Model image converter; GGUF / SafeTensors → MLX format |

---

## Quickstart

### Use the API (consumers)

```bash
# Install the Ponsbloom CLI (macOS / Linux)
curl -fsSL https://ponsbloom.com/install.sh | sh

# Or just use any OpenAI-compatible client
pip install openai
```

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.ponsbloom.com/v1",
    api_key="pb-...",          # from app.ponsbloom.com
)

stream = client.chat.completions.create(
    model="qwen3.6-35b",
    messages=[{"role": "user", "content": "Explain differential privacy in one paragraph."}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### Become a provider (Mac owners)

```bash
# Requirements: Apple Silicon Mac, macOS 13+, 16 GB+ unified memory
curl -fsSL https://ponsbloom.com/provider-install.sh | sh

ponsbloom provider init      # generates Secure Enclave keypair + registers node
ponsbloom provider start     # begins accepting inference jobs
```

See [docs/provider-setup.md](docs/provider-setup.md) for the full guide.

---

## API Example

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.ponsbloom.com/v1",
    api_key="pb-YOUR_KEY_HERE",
)

# Streaming chat completions
response = client.chat.completions.create(
    model="gemma-4-26b",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the capital of France?"},
    ],
    stream=True,
    temperature=0.7,
    max_tokens=512,
)

for chunk in response:
    delta = chunk.choices[0].delta
    if delta.content:
        print(delta.content, end="", flush=True)
print()

# Non-streaming
response = client.chat.completions.create(
    model="gpt-oss-20b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
```

See [docs/api.md](docs/api.md) for the full API reference.

---

## Models & Pricing

All prices are per million tokens. Providers set their own floor; the table shows network-average rates.

| Model | Input ($/M) | Output ($/M) | Context | Notes |
|---|---|---|---|---|
| `qwen3.6-35b` | $0.05 | $0.70 | 32k | Best quality/cost for reasoning |
| `gemma-4-26b` | $0.042 | $0.22 | 128k | Long-context tasks |
| `gpt-oss-20b` | $0.02 | $0.10 | 8k | Fastest, lowest cost |
| `nvidia-nemotron-3.5` | $0.065 | $0.18 | 16k | Instruction-following |

---

## Trust Model

Ponsbloom applies four independent security layers so that neither Ponsbloom nor any provider can observe plaintext prompts or tamper with responses.

| Layer | Mechanism | What it guarantees |
|---|---|---|
| **E2E Encryption** | TLS 1.3 + per-session key | Prompt and response never travel in plaintext |
| **Secure Enclave** | Apple CryptoKit / SEP | Signing key is hardware-bound; never exported to the OS |
| **Hardened Runtime** | macOS SIP + entitlement restrictions | Model process cannot be debugged or injected by the host |
| **Output Signing** | ECDSA P-256 (Enclave key) | Every token stream is signed; clients verify before display |

Attestation tokens are published on-chain (Ethereum mainnet) so any client can verify a provider's Secure Enclave registration without trusting Ponsbloom's servers.

---

## Provider Setup

Mac owners earn passive income by sharing idle compute. Requirements:

- Apple Silicon Mac (M1 / M2 / M3 / M4 family)
- macOS 13 Ventura or later
- 16 GB unified memory minimum (24 GB+ recommended for larger models)
- Residential or commercial internet, ≥ 50 Mbps upload

```bash
curl -fsSL https://ponsbloom.com/provider-install.sh | sh
ponsbloom provider init
ponsbloom provider start
```

Full setup instructions, firewall rules, and earnings calculator at [docs/provider-setup.md](docs/provider-setup.md).

---

## Links

| | |
|---|---|
| 🌐 Website | [ponsbloom.com](https://ponsbloom.com) |
| 🚀 Console | [app.ponsbloom.com](https://app.ponsbloom.com) |
| 📖 API Docs | [docs/api.md](docs/api.md) |
| 🐦 X / Twitter | [@Ponsbloom](https://x.com/Ponsbloom) |
| 🔒 Security | [SECURITY.md](SECURITY.md) |
| 🤝 Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

---

## License

MIT — see [LICENSE](LICENSE).
