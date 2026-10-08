#!/bin/sh
# 把构建产物同步到 write-it-microblog 部署仓库（轻壳，不含 data/）。
# 数据不经壳——应用从 jsDelivr（write-it@data-v1）按需拉取。
# 用法：scripts/sync-deploy.sh [deploy-repo-dir]，默认 ../write-it-microblog
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$ROOT/../write-it-microblog}"

if [ ! -f "$DEST/plugin.json" ] || [ ! -d "$DEST/static/zi" ]; then
  echo "Expected an existing deployment repo at: $DEST" >&2
  exit 1
fi

mkdir -p "$DEST/static/zi/icons"
cp "$ROOT/plugin.json" "$DEST/plugin.json"
for f in index.html app.js styles.css manifest.webmanifest service-worker.js; do
  cp "$ROOT/static/zi/$f" "$DEST/static/zi/$f"
done
cp "$ROOT"/static/zi/icons/*.png "$DEST/static/zi/icons/"

sh "$ROOT/scripts/check-deploy.sh" "$DEST"
echo "已同步到 $DEST —— 请 review 两个仓库的变更后再 commit + push"
