# Contributing to Ponsbloom

Thank you for your interest in contributing! Ponsbloom is an open-source project and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and community support.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Good First Issues](#good-first-issues)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Development Setup](#development-setup)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) Code of Conduct. By participating you agree to uphold a welcoming and respectful environment.

---

## Reporting Bugs

Before opening a bug report, please:

1. Search [existing issues](https://github.com/ponsbloom/ponsbloom/issues) to avoid duplicates.
2. Confirm you're running the latest version of the affected component.
3. Collect logs — `ponsbloom provider logs --tail 100` for provider issues.

Use the **Bug Report** issue template and fill out every section. Incomplete reports are closed.

---

## Requesting Features

Open a **Feature Request** issue. Describe:

- The problem you're trying to solve (not just the proposed solution).
- Who benefits and how.
- Any prior art or references.

Large features benefit from a short design doc before implementation begins. Drop a draft in a GitHub Discussion and tag a maintainer.

---

## Good First Issues

Issues tagged [`good first issue`](https://github.com/ponsbloom/ponsbloom/labels/good%20first%20issue) are curated for newcomers. They include a scope description, pointers to relevant files, and a definition of done. Comment on the issue before starting so we can assign it and avoid duplicated effort.

---

## Pull Request Process

1. **Fork** the repo and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Write tests** before or alongside your changes. PRs without tests for new behavior are unlikely to be merged.

3. **Run CI locally** before pushing:
   ```bash
   # Coordinator (Go)
   cd coordinator && go test ./... && go vet ./...

   # Provider (Rust)
   cd provider && cargo test && cargo clippy -- -D warnings

   # Console UI (Next.js)
   cd console-ui && npm ci && npm run lint && npm test
   ```

4. **Open a draft PR** early if you want feedback before it's ready.

5. **Fill out the PR template** completely. Incomplete PRs are not reviewed.

6. Address all review comments. Once approved by a maintainer, your PR will be squash-merged into `main`.

7. **Do not** push directly to `main`. All changes go through PRs.

---

## Code Style

### Go (`coordinator`)

- `gofmt` and `goimports` — enforced in CI.
- Follow [Effective Go](https://go.dev/doc/effective_go) conventions.
- Exported symbols must have doc comments.
- Error handling: return errors; do not panic in library code.

### Rust (`provider`)

- `rustfmt` — enforced in CI.
- `clippy` with `-- -D warnings` must pass.
- Use `thiserror` for library errors, `anyhow` for binary entry-points.
- `unsafe` blocks require a `// SAFETY:` comment.

### TypeScript (`console-ui`)

- ESLint + Prettier — enforced in CI.
- Prefer functional components and React hooks.
- No `any` without a `// eslint-disable` comment explaining why.

### Python (`image-bridge`)

- `black` + `ruff` — enforced in CI.
- Type-annotate all public functions.
- Docstrings for public modules and functions.

---

## Development Setup

### Prerequisites

| Tool | Minimum version |
|---|---|
| Go | 1.22 |
| Rust | 1.78 (stable) |
| Node.js | 20 LTS |
| Python | 3.11 |
| macOS (for `enclave` / `provider`) | 13 Ventura |

### Clone and bootstrap

```bash
git clone https://github.com/ponsbloom/ponsbloom.git
cd ponsbloom

# Coordinator
cd coordinator && go mod download && cd ..

# Provider
cd provider && cargo fetch && cd ..

# Console UI
cd console-ui && npm ci && cd ..

# Image Bridge
cd image-bridge && pip install -e ".[dev]" && cd ..
```

### Running tests

```bash
make test          # runs all component test suites
make lint          # runs all linters
```

---

## Questions?

Open a [GitHub Discussion](https://github.com/ponsbloom/ponsbloom/discussions) or reach out on X at [@Ponsbloom](https://x.com/Ponsbloom).
