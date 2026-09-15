# Provider Setup Guide

Turn your idle Apple Silicon Mac into a Ponsbloom inference node and earn passive income from your existing hardware.

---

## Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| Chip | Apple M1 | Apple M2 Pro / M3 / M4 |
| Unified Memory | 16 GB | 32 GB or more |
| macOS | 13 Ventura | 14 Sonoma or 15 Sequoia |
| Storage (free) | 50 GB | 200 GB (for multiple models) |
| Upload bandwidth | 25 Mbps | 100 Mbps |
| Uptime | Any | 8+ hours/day improves earnings |

---

## Quick Install

```bash
curl -fsSL https://ponsbloom.com/provider-install.sh | sh
```

This script:

1. Downloads the `ponsbloom-provider` binary for your architecture (arm64).
2. Installs a LaunchAgent plist so the agent auto-starts on login.
3. Guides you through first-time setup.

If you prefer to audit the installer first:

```bash
curl -fsSL https://ponsbloom.com/provider-install.sh -o install.sh
less install.sh         # review
bash install.sh
```

---

## First-Time Setup

### 1. Initialize the node

```bash
ponsbloom provider init
```

This command:

- Generates an ECDSA P-256 keypair inside your Mac's Secure Enclave (key never leaves hardware).
- Produces an Apple attestation statement binding the keypair to your device.
- Registers your node with the Ponsbloom coordinator.
- Publishes your public key + attestation hash on-chain (Ethereum mainnet) so consumers can verify you.

You will be prompted to create an account at [app.ponsbloom.com](https://app.ponsbloom.com) if you haven't already — this is where your earnings accumulate.

### 2. Choose models to serve

```bash
ponsbloom provider models add qwen3.6-35b
ponsbloom provider models add gemma-4-26b
```

Model weights are downloaded from Ponsbloom's CDN in MLX format. Download sizes:

| Model | Download size | RAM required |
|---|---|---|
| `gpt-oss-20b` (q4) | ~11 GB | 16 GB |
| `gemma-4-26b` (q4) | ~15 GB | 24 GB |
| `qwen3.6-35b` (q4) | ~20 GB | 32 GB |
| `nvidia-nemotron-3.5` (q4) | ~8 GB | 16 GB |

### 3. Start the agent

```bash
ponsbloom provider start
```

The agent launches in the background. Check status with:

```bash
ponsbloom provider status
```

```
● ponsbloom-provider.service — running
  Models loaded : qwen3.6-35b, gemma-4-26b
  Jobs today    : 341
  Tokens earned : 14.2M
  Earnings today: $8.42
  Uptime        : 6h 14m
```

---

## Configuration

The config file lives at `~/.ponsbloom/provider.toml`:

```toml
[node]
# Maximum concurrent inference jobs
max_concurrent_jobs = 2

# Fraction of unified memory reserved for system (0.0–0.5)
memory_headroom = 0.15

# Automatically pause jobs when macOS reports battery < threshold (0 = never)
battery_pause_threshold = 20

[models]
# Models to load on start (downloaded if missing)
autoload = ["qwen3.6-35b", "gemma-4-26b"]

[network]
# gRPC coordinator address (do not change unless self-hosting)
coordinator = "grpc.ponsbloom.com:443"

# Optional: expose a direct HTTPS endpoint for lower-latency consumers
direct_endpoint_enabled = false
direct_endpoint_port = 8443
```

### Tuning `max_concurrent_jobs`

Each concurrent job occupies the model's full RAM footprint. With 32 GB unified memory serving `gemma-4-26b` (15 GB), you can safely run `max_concurrent_jobs = 2` with headroom for macOS.

---

## Firewall & Networking

The provider agent only makes **outbound** connections:

| Destination | Port | Protocol | Purpose |
|---|---|---|---|
| `grpc.ponsbloom.com` | 443 | gRPC / HTTP/2 | Job assignments from coordinator |
| `cdn.ponsbloom.com` | 443 | HTTPS | Model weight downloads |
| `rpc.mainnet.example.com` | 443 | HTTPS | On-chain attestation publish |

No inbound ports need to be opened. The agent uses a persistent reverse connection for job delivery.

If you opt into `direct_endpoint_enabled = true`, port `8443` must be forwarded from your router to the Mac.

---

## Monitoring & Logs

```bash
# Live log stream
ponsbloom provider logs --follow

# Last 200 lines
ponsbloom provider logs --tail 200

# Filter for errors only
ponsbloom provider logs --level error
```

Logs are stored at `~/.ponsbloom/logs/provider.log` and rotate daily (7-day retention by default).

---

## Earnings & Payouts

Earnings accumulate in your account at [app.ponsbloom.com](https://app.ponsbloom.com).

- **Pricing**: You earn the network-average rate for each model (see [docs/api.md](api.md) for current rates). You keep 100% — Ponsbloom takes no platform fee.
- **Payouts**: Processed weekly. Choose USD bank transfer (ACH / SEPA) or USDC on Base.
- **Minimum payout**: $10.

### Earnings calculator

```bash
ponsbloom provider estimate \
  --models qwen3.6-35b,gemma-4-26b \
  --daily-hours 12 \
  --memory 32
```

Example output:
```
Estimated daily earnings : $12–18
Estimated monthly        : $360–540
(Based on current network demand; actual earnings vary)
```

---

## Security

Your inference node is protected by multiple layers:

1. **Secure Enclave keypair** — the signing key is hardware-bound and never exported.
2. **Hardened Runtime** — the provider binary is signed with the Hardened Runtime entitlement; debuggers and library injection are blocked.
3. **No prompt logging** — the provider agent does not write prompts or responses to disk. Logs contain only job IDs, token counts, and timing.
4. **Sandboxed model process** — the MLX inference subprocess runs in a restricted macOS sandbox profile.

---

## Stopping & Uninstalling

```bash
# Stop the agent (can restart later)
ponsbloom provider stop

# Uninstall completely (removes LaunchAgent, binary, and config)
ponsbloom provider uninstall

# Remove downloaded model weights only
ponsbloom provider models remove --all
```

---

## Troubleshooting

### Agent won't start

```bash
ponsbloom provider doctor
```

Checks system requirements, SEP availability, coordinator connectivity, and model integrity.

### `Secure Enclave unavailable`

- Ensure you are running on Apple Silicon (not an Intel Mac).
- Ensure you are running macOS 13 or later.
- Check that System Integrity Protection (SIP) is enabled: `csrutil status`.

### High CPU when idle

The agent is in a wait state and should consume < 1% CPU when no jobs are running. If you see high CPU, run `ponsbloom provider logs --level debug` and open a bug report.

### Coordinator connection refused

Check your outbound firewall rules for `grpc.ponsbloom.com:443`. Corporate firewalls sometimes block HTTP/2 on port 443.

---

## Support

- Documentation: [ponsbloom.com/docs](https://ponsbloom.com/docs)
- Discord: [ponsbloom.com/discord](https://ponsbloom.com/discord)
- X: [@Ponsbloom](https://x.com/Ponsbloom)
- Email: support@ponsbloom.com
