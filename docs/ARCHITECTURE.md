# Ponsbloom Architecture

This document is a technical deep-dive into Ponsbloom's architecture. For the high-level overview see [../README.md](../README.md).

---

## Table of Contents

- [System Overview](#system-overview)
- [Components](#components)
  - [Coordinator (Go)](#coordinator-go)
  - [Provider Agent (Rust + PyO3)](#provider-agent-rust--pyo3)
  - [MLX Runtime](#mlx-runtime)
  - [Secure Enclave Layer (Swift)](#secure-enclave-layer-swift)
  - [Console UI (Next.js)](#console-ui-nextjs)
  - [Image Bridge (Python)](#image-bridge-python)
- [Request Lifecycle](#request-lifecycle)
- [Trust Model](#trust-model)
- [Networking](#networking)
- [Billing & Metering](#billing--metering)
- [Attestation Registry](#attestation-registry)

---

## System Overview

```
  ┌──────────────────────────────────────────────────────┐
  │                   Internet / Consumer                │
  │                                                      │
  │   openai.ChatCompletion()  ·  cURL  ·  Any SDK       │
  └────────────────────┬─────────────────────────────────┘
                       │  HTTPS / TLS 1.3  (JWT Bearer)
                       ▼
  ┌──────────────────────────────────────────────────────┐
  │                   Coordinator                        │
  │                                                      │
  │  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
  │  │  REST API  │  │  Scheduler   │  │  Billing DB │  │
  │  │  (chi)     │  │  (job queue) │  │  (Postgres) │  │
  │  └────────────┘  └──────┬───────┘  └─────────────┘  │
  │                         │                            │
  │  ┌────────────────────┐ │ ┌────────────────────────┐ │
  │  │  Attestation Reg.  │ │ │  Provider Registry     │ │
  │  │  (on-chain + cache)│ │ │  (health · capacity)   │ │
  │  └────────────────────┘ │ └────────────────────────┘ │
  └─────────────────────────┼────────────────────────────┘
                            │  gRPC + mTLS
                            ▼
  ┌──────────────────────────────────────────────────────┐
  │                 Provider Agent (Rust)                │
  │                                                      │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
  │  │ gRPC client │  │  Job queue  │  │ Token meter │  │
  │  └─────────────┘  └──────┬──────┘  └─────────────┘  │
  │                          │                           │
  │  ┌───────────────────────▼───────────────────────┐   │
  │  │              PyO3 Bridge                       │   │
  │  │  (Rust → Python FFI; calls MLX Python API)    │   │
  │  └───────────────────────┬───────────────────────┘   │
  │                          │                           │
  │  ┌───────────────────────▼───────────────────────┐   │
  │  │              MLX Runtime (Apple Silicon)       │   │
  │  │  Metal shaders · Neural Engine · Unified RAM   │   │
  │  └───────────────────────────────────────────────┘   │
  │                                                      │
  │  ┌───────────────────────────────────────────────┐   │
  │  │          Secure Enclave (Swift / CryptoKit)   │   │
  │  │  SEP-bound key · Attestation · Output signing │   │
  │  └───────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────┘
```

---

## Components

### Coordinator (Go)

The coordinator is the central control plane. It is stateless across replicas (all state in Postgres + Redis) and horizontally scalable.

**Key responsibilities:**

- **Job scheduling** — accepts inference requests, selects a suitable provider based on model availability, capacity, and latency, then forwards the job over gRPC.
- **Billing** — tracks token usage per API key, generates invoices, and maintains provider payout ledgers.
- **Attestation cache** — queries the on-chain attestation registry and caches proofs locally to avoid per-request chain lookups.
- **Health monitoring** — maintains heartbeat connections to all registered providers; evicts unresponsive nodes.

**Tech:** Go 1.22, [chi](https://github.com/go-chi/chi) router, [grpc-go](https://github.com/grpc/grpc-go), Postgres (pgx), Redis (rueidis).

### Provider Agent (Rust + PyO3)

The provider agent runs on the Mac owner's machine. It is a long-lived daemon that registers with the coordinator, receives job assignments, and executes inference locally.

**Key responsibilities:**

- Maintain a persistent mTLS gRPC connection to the coordinator.
- Manage a local job queue with back-pressure.
- Invoke MLX models via the PyO3 Python bridge.
- Stream token output back to the coordinator.
- Sign each output batch with the Secure Enclave key.
- Report token counts to the coordinator for billing.

**Tech:** Rust 1.78 (stable), [tonic](https://github.com/hyperium/tonic), [PyO3](https://github.com/PyO3/pyo3), [tokio](https://tokio.rs).

### MLX Runtime

[MLX](https://github.com/ml-explore/mlx) is Apple's array framework for Apple Silicon. Ponsbloom uses the MLX Python API (called via PyO3) to load and run models.

Model weights are stored in MLX format (converted by the image-bridge tool). The runtime uses:

- **Metal GPU shaders** for attention and matrix multiply.
- **Apple Neural Engine (ANE)** for compatible operator patterns.
- **Unified memory** — no discrete VRAM copy; weights sit in shared DRAM.

### Secure Enclave Layer (Swift)

A small Swift framework wraps Apple CryptoKit and the Secure Enclave Processor (SEP). It is compiled into a macOS XPC service that the Rust agent communicates with via IPC.

**Operations exposed:**

| Function | Description |
|---|---|
| `generateKeypair()` | Creates an ECDSA P-256 key inside the SEP; private key never leaves hardware |
| `attest(nonce:)` | Returns an Apple-signed attestation token binding the public key to this device |
| `sign(data:)` | Signs a SHA-256 digest; private key operation happens inside SEP |
| `verify(signature:data:)` | Verifies a signature against the stored public key |

### Console UI (Next.js)

The web dashboard at [app.ponsbloom.com](https://app.ponsbloom.com). Built with Next.js 14 App Router, Tailwind CSS, and shadcn/ui.

Features: API key management, usage graphs, spend history, provider earnings dashboard, model explorer.

### Image Bridge (Python)

A CLI tool that converts model weights from HuggingFace SafeTensors or GGUF format into MLX format ready for the provider runtime.

```bash
pons-bridge convert \
  --input hf://Qwen/Qwen3-235B-A22B \
  --output ./models/qwen3.6-35b \
  --format mlx \
  --quantize q4
```

---

## Request Lifecycle

```
1. Consumer sends POST /v1/chat/completions (JWT bearer)
2. Coordinator authenticates key, validates request
3. Coordinator selects provider (model availability, capacity, latency score)
4. Coordinator opens/reuses gRPC stream to provider
5. Provider receives job, queues it
6. Provider calls MLX via PyO3 bridge
7. MLX generates tokens; provider streams each batch back
8. Provider signs each batch with Secure Enclave key
9. Coordinator forwards signed token batches to consumer (SSE)
10. On stream end, coordinator records token counts in billing DB
11. Consumer verifies ECDSA signature on final response (optional, SDK helper)
```

---

## Trust Model

### Layer 1 — E2E Encryption

All traffic between consumers and the coordinator uses TLS 1.3. Coordinator–provider gRPC uses mutual TLS with per-provider certificates issued at registration. No plaintext prompt ever reaches a provider's OS without a TLS unwrap inside the agent process.

### Layer 2 — Apple Secure Enclave

The provider's signing key is generated inside the SEP at registration time. The SEP is a separate microprocessor on Apple Silicon that is isolated from the main CPU and operating system. The private key cannot be exported, read, or copied — even by root processes on the provider machine.

### Layer 3 — Hardened Runtime

The provider agent binary is signed with Apple's Hardened Runtime entitlement. This prevents:
- Attaching a debugger to the process
- Injecting dynamic libraries (`DYLD_INSERT_LIBRARIES` is blocked)
- Memory-scanning by other processes

Combined with macOS SIP, a malicious process on the provider machine cannot observe model inputs or outputs at runtime.

### Layer 4 — Output Signing

Every token batch produced by the model is signed with the provider's SEP key before transmission. Consumers can verify the ECDSA P-256 signature using the provider's public key, which is published in the attestation registry. This ensures that a man-in-the-middle (including Ponsbloom's coordinator) cannot silently modify responses.

---

## Networking

Providers do not need port-forwarding. The provider agent maintains a long-lived outbound gRPC connection to the coordinator. The coordinator uses this reverse channel to push job assignments.

For consumers with strict latency requirements, the coordinator supports **direct routing**: the coordinator proxies only the first few tokens and then hands the stream directly to the provider's HTTPS endpoint (requires provider to have a reachable IP, optional).

---

## Billing & Metering

- Token counts are measured at the provider (source of truth) and countersigned by the coordinator.
- Consumers are billed in USD; invoices generated monthly or when a prepaid balance threshold is crossed.
- Providers accumulate earnings in a ledger; payouts are processed weekly via bank transfer or USDC on Base.
- The coordinator records a `job_id`, `provider_id`, `model`, `input_tokens`, `output_tokens`, and `price_per_token` for every completed job. All records are append-only.

---

## Attestation Registry

At registration, each provider submits:

1. An Apple attestation statement (from `DCAppAttestService`) binding the provider agent's App ID to the device's Secure Enclave.
2. The provider's ECDSA P-256 public key, co-signed by the attestation statement.

The coordinator verifies the attestation against Apple's root CA and publishes `(provider_id, public_key, attestation_hash)` to an Ethereum mainnet contract. This allows any third party — including consumers — to verify provider authenticity without trusting Ponsbloom's servers.

Contract address: published at [ponsbloom.com/registry](https://ponsbloom.com/registry).
