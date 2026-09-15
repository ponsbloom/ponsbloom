# Security Policy

## Supported Versions

| Component | Supported |
|---|---|
| `coordinator` latest release | ✅ |
| `provider` latest release | ✅ |
| `console-ui` latest release | ✅ |
| Older releases | ❌ |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Send a report to **security@ponsbloom.com**. Include as much of the following as possible:

- A description of the vulnerability and its potential impact
- The component(s) affected (`coordinator`, `provider`, `console-ui`, `enclave`, `image-bridge`)
- Steps to reproduce or a proof-of-concept (no need to weaponize)
- Your preferred credit attribution (name / handle / anonymous)

We will acknowledge receipt within **48 hours** and aim to send a status update within **5 business days**. Critical vulnerabilities are patched within **14 days**.

We do not currently offer a paid bug-bounty program, but we recognize contributors publicly in release notes (with your permission).

---

## Scope

The following are **in scope**:

- Authentication and authorization bypasses in the coordinator API
- Attestation forgery or Secure Enclave key extraction
- Prompt or response content leakage between tenants
- Remote code execution in any Ponsbloom component
- Cryptographic weaknesses in the trust model (E2E encryption, output signing)
- Privilege escalation in the provider agent
- Dependency vulnerabilities with a credible exploit path

---

## Out of Scope

The following are **out of scope** for this policy:

- Denial-of-service attacks requiring large resources (please report to support@ponsbloom.com)
- Social engineering attacks targeting Ponsbloom employees
- Physical attacks against provider hardware
- Vulnerabilities in third-party services or infrastructure we do not control
- Issues already publicly known or already reported
- Theoretical vulnerabilities without a demonstrable impact

---

## Disclosure Policy

We follow a **90-day coordinated disclosure** timeline. After a fix is released we will publish a security advisory. We ask that you refrain from public disclosure until the advisory is live.

---

## PGP Key

A PGP public key for **security@ponsbloom.com** is available at [ponsbloom.com/.well-known/security.txt](https://ponsbloom.com/.well-known/security.txt).
