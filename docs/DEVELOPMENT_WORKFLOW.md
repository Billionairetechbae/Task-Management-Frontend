# Development Workflow

Install safeguards after cloning:

```sh
./scripts/install-git-safety.sh
```

Start work from staging:

```sh
git fetch --no-prune origin
git switch staging
git pull --ff-only origin staging
git switch -c feature/short-description
```

Commit and push only the feature branch:

```sh
git add path/to/intentional/files
git commit -m "Describe the focused change"
git push -u origin HEAD
```

Open a pull request into `staging`; do not push feature commits directly to it. If an approved feature must be mirrored, push the same branch name to `second` separately.

After an approved staging merge:

```sh
git switch staging
./scripts/publish-staging.sh
```

The publisher refuses divergent history, never force-pushes, and verifies both SHAs. If one remote succeeds and the other fails, keep the successful update and rerun the command after resolving the failure. Never reset or force-push.

Production requires a separate reviewed pull request from `staging` to `main`, passing checks, explicit release authorization, and the provider's protected-branch process. `git push origin HEAD:main` deliberately targets production and must not bypass protection.

Urgent fixes use `hotfix/*` from verified production `main`, then follow the approved release process and are reviewed back into `staging`. Agents must not perform production release actions without explicit authorization.
