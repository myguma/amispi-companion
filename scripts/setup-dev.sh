#!/usr/bin/env bash
# 開発環境の初期セットアップ
# WSL から Windows ターゲットの型チェックができるようにする

set -euo pipefail

echo "=== git hook を有効化 ==="
git config core.hooksPath .githooks
chmod +x .githooks/pre-push

echo ""
echo "セットアップ完了"
echo "  main push → CI が自動で Windows cargo check を実行 (check.yml)"
echo "  タグ push 時 → hook が直近 check の結果を確認してから通過"
