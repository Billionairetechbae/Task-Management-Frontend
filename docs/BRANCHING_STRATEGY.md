# Git Branching Strategy

Admiino uses `main` for production releases and `staging` for integration, QA, security validation, compatibility testing, and release approval. Coding agents and developers must start work from `staging`, never from production `main`.

- `main`: protected production branch; changes enter through an approved pull request.
- `staging`: shared integration branch, mirrored to `origin/staging` and `second/staging`.
- `feature/*`, `fix/*`, `security/*`, and `perf/*`: individual branches created from `staging`.
- `legacy/staging-org-onboarding`: preserved local legacy branch formerly named `staging/org-onboarding`.

The initial staging baseline is `d7c9d0fbe5576830b25bc0ed62371331342481ac`. Dual-remote synchronization is verified after every publication because two remotes are not atomic.

Agents may not merge, push, or deploy to production without explicit authorization.
