## Summary

<!-- A short description of what this PR does. -->

## Linked issue

<!-- Fixes #<issue_number> — required unless this is a trivial docs fix. -->

Fixes #

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (requires a deprecation notice or migration guide)
- [ ] Documentation / comment update
- [ ] Refactor / code quality (no behavior change)
- [ ] Dependency update

## Components touched

- [ ] `coordinator` (Go)
- [ ] `provider` (Rust / PyO3)
- [ ] `console-ui` (Next.js)
- [ ] `enclave` (Swift)
- [ ] `image-bridge` (Python)
- [ ] `docs/`
- [ ] `.github/`

## Test plan

<!-- Describe how you tested this change. Include commands to run manually. -->

```bash
# e.g.
cd coordinator && go test ./...
cd provider && cargo test
```

## Screenshots / recordings

<!-- For UI changes, attach a screenshot or screen recording. Delete this section if not applicable. -->

## Checklist

- [ ] My code compiles without warnings and all CI checks pass locally.
- [ ] I have added tests that cover the new behavior.
- [ ] I have updated documentation where needed (README, docs/, inline comments).
- [ ] I have not introduced any `println!` / `fmt.Println` / `console.log` debug output.
- [ ] For `enclave` / security-sensitive changes, I have noted the security implications below.

## Security notes

<!-- Required if this PR touches authentication, encryption, attestation, or key handling. Delete if not applicable. -->
