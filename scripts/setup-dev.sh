#!/usr/bin/env bash
# 開発環境の初期セットアップ
# WSL から Windows ターゲットの型チェックができるようにする

set -euo pipefail

echo "=== Windows ターゲット追加 ==="
rustup target add x86_64-pc-windows-msvc

echo "=== git hook を有効化 ==="
git config core.hooksPath .githooks
chmod +x .githooks/pre-push

echo ""
echo "セットアップ完了"
echo "  タグ push 時に自動で Windows コンパイルチェックが走ります"
echo "  手動チェック: npm run check:win"
