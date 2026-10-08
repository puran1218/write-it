#!/bin/sh
# Verify that the lightweight Micro.blog repository matches the built app shell.
# Usage: scripts/check-deploy.sh [path-to-write-it-microblog]
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$ROOT/../write-it-microblog}"

if [ ! -f "$DEST/plugin.json" ]; then
  echo "Deploy repository not found: $DEST" >&2
  exit 1
fi

for file in plugin.json; do
  if ! cmp -s "$ROOT/$file" "$DEST/$file"; then
    echo "Mismatch: $file — run scripts/sync-deploy.sh" >&2
    exit 1
  fi
done

for file in index.html app.js styles.css manifest.webmanifest service-worker.js; do
  if ! cmp -s "$ROOT/static/zi/$file" "$DEST/static/zi/$file"; then
    echo "Mismatch: static/zi/$file — run scripts/sync-deploy.sh" >&2
    exit 1
  fi
done

for file in "$ROOT"/static/zi/icons/*.png; do
  name="${file##*/}"
  if ! cmp -s "$file" "$DEST/static/zi/icons/$name"; then
    echo "Mismatch: static/zi/icons/$name — run scripts/sync-deploy.sh" >&2
    exit 1
  fi
done

if [ -d "$DEST/static/zi/data" ]; then
  echo "Unexpected data/ in deployment repo (large data belongs in write-it)" >&2
  exit 1
fi

echo "Deployment shell matches source (plugin.json, JS, CSS, SW, HTML, manifest, icons)."
