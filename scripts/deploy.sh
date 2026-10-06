#!/usr/bin/env bash
# Push-to-deploy: run on the server by GitHub Actions over SSH.
# Fetches main, and if the deployed SHA differs, resets to it and rebuilds the container.
set -euo pipefail

# The repository is the parent of this script's directory, wherever it is checked out.
REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BRANCH=main
STATE_FILE=$REPO_DIR/scripts/.state/concepts.rev

cd "$REPO_DIR"
git fetch origin "$BRANCH"

target=$(git rev-parse "origin/$BRANCH")
deployed=$(cat "$STATE_FILE" 2>/dev/null || echo none)

if [ "$deployed" = "$target" ]; then
    echo "$(date -Is) already at $target, nothing to do"
    exit 0
fi

echo "$(date -Is) deploying $target"
git reset --hard "$target"
docker compose up -d --build --remove-orphans
docker image prune -f
mkdir -p "$(dirname "$STATE_FILE")"
echo "$target" > "$STATE_FILE"
echo "$(date -Is) deploy OK"
