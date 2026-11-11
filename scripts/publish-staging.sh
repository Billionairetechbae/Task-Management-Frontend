#!/bin/sh
set -eu
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
current_branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
if [ "$current_branch" != "staging" ]; then
  echo "Refusing to publish: check out staging first (current: ${current_branch:-detached})." >&2
  exit 1
fi
local_sha=$(git rev-parse refs/heads/staging)
failed=0
for remote in origin second; do
  remote_sha=$(git ls-remote --heads "$remote" refs/heads/staging | awk 'NR == 1 { print $1 }')
  if [ -n "$remote_sha" ] && ! git merge-base --is-ancestor "$remote_sha" refs/heads/staging; then
    echo "Refusing: $remote/staging is not an ancestor of local staging ($remote_sha vs $local_sha)." >&2
    failed=1
  fi
done
if [ "$failed" -ne 0 ]; then
  echo "No staging push was attempted because remote divergence was detected." >&2
  exit 1
fi
for remote in origin second; do
  echo "Publishing staging $local_sha to $remote..."
  if ! git push "$remote" refs/heads/staging:refs/heads/staging; then
    echo "PARTIAL FAILURE: $remote/staging was not updated." >&2
    failed=1
  fi
done
for remote in origin second; do
  published_sha=$(git ls-remote --heads "$remote" refs/heads/staging | awk 'NR == 1 { print $1 }')
  if [ "$published_sha" != "$local_sha" ]; then
    echo "Verification failed: $remote/staging=$published_sha, expected $local_sha." >&2
    failed=1
  fi
done
if [ "$failed" -ne 0 ]; then
  echo "Retry ./scripts/publish-staging.sh after resolving the reported partial failure." >&2
  exit 1
fi
echo "Verified origin/staging and second/staging at $local_sha"
