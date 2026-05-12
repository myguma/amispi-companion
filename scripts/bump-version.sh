#!/usr/bin/env bash
# バージョンを tauri.conf.json / Cargo.toml / package.json の3か所で同時に更新する
# 使い方: ./scripts/bump-version.sh 0.1.26

set -euo pipefail

NEW_VER="${1:-}"
if [[ -z "$NEW_VER" ]]; then
  echo "使い方: $0 <new-version>  例: $0 0.1.26"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# tauri.conf.json
python3 -c "
import json, sys
with open('$ROOT/src-tauri/tauri.conf.json') as f: c = json.load(f)
c['version'] = '$NEW_VER'
with open('$ROOT/src-tauri/tauri.conf.json', 'w') as f: json.dump(c, f, indent=2, ensure_ascii=False)
print('tauri.conf.json →', '$NEW_VER')
"

# Cargo.toml
sed -i "0,/^version = \"[^\"]*\"/{s/^version = \"[^\"]*\"/version = \"$NEW_VER\"/}" "$ROOT/src-tauri/Cargo.toml"
echo "Cargo.toml      → $NEW_VER"

# package.json
python3 -c "
import json, sys
with open('$ROOT/package.json') as f: c = json.load(f)
c['version'] = '$NEW_VER'
with open('$ROOT/package.json', 'w') as f: json.dump(c, f, indent=2, ensure_ascii=False)
print('package.json    →', '$NEW_VER')
"

echo ""
echo "完了。次のステップ:"
echo "  1. CHANGELOG.md に変更内容を記述"
echo "  2. git add -A && git commit -m 'feat: v$NEW_VER — ...'"
echo "  3. git tag v$NEW_VER && git push origin main v$NEW_VER"
