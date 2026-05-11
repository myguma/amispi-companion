# AmitySpirit Companion

デスクトップ常駐型AIコンパニオン — Amispi / AmitySpirit プロジェクトの最初のボディ。

> ⚠️ v0.x — プレースホルダー実装。Amispi本来のキャラクター設定・ロアは未搭載。

## 概要

透明なデスクトップウィンドウに浮かぶ小さなキャラクター。  
クリックすると反応し、しばらく放置するとスリープし、ときどき短い言葉を発する。

## 技術スタック

- **シェル:** Tauri v2 (Rust)
- **フロントエンド:** React 18 + TypeScript 5
- **CSS:** Tailwind CSS v3
- **ビルドツール:** Vite 6

## セットアップ

```bash
# 依存関係をインストール
npm install

# 開発サーバー (フロントエンドのみ、ブラウザで確認)
npm run dev

# Tauriデスクトップアプリとして起動 (WSL では WSLg が必要)
npm run tauri:dev

# Windowsビルド (PowerShell から実行すること)
npm run tauri:build
```

## Windows でのビルド

WSL2 環境からは Linux 向けビルドになります。  
Windows デスクトップアプリとしてビルドするには、**Windows の PowerShell** から同じコマンドを実行してください。

```powershell
# Windows PowerShell で実行
npm install
npm run tauri:build
```

詳細は `docs/TECHNICAL_DECISION.md` を参照してください。

## ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/TECHNICAL_DECISION.md` | スタック選定の根拠 |
| `docs/PRODUCT_VISION.md` | プロダクトビジョン |
| `docs/ARCHITECTURE.md` | アーキテクチャ詳細 |
| `docs/ROADMAP.md` | 開発ロードマップ |
| `docs/DEVELOPMENT_LOG.md` | 実装ログ |
| `docs/NEXT_SESSION.md` | 次のセッションへの引継ぎ |

## キャラクターのカスタマイズ

`public/characters/default/` にスプライト画像 (PNG) を配置するだけで  
SVG フォールバックの代わりに使用されます。詳細は同ディレクトリの README.md を参照。
