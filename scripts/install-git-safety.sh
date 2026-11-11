#!/bin/sh
set -eu
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
git config core.hooksPath .githooks
git config push.default current
git config branch.main.pushRemote __protected_main__
git config branch.staging.remote origin
git config branch.staging.merge refs/heads/staging
git config branch.staging.pushRemote origin
echo "Installed repository-local Git safeguards in $repo_root"
