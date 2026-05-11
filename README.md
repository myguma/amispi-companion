# AmitySpirit Companion

デスクトップ常駐型AIコンパニオン — Amispi / AmitySpirit プロジェクトの最初のボディ。

> ⚠️ v0.x — プレースホルダー実装。Amispi本来のキャラクター設定・ロアは未搭載。

---

## 概要

透明なデスクトップウィンドウに浮かぶ小さなキャラクター。  
クリックすると反応し、放置するとスリープし、ときどき短い言葉を発する。  
PC 起動時に自動で常駐し、新バージョンがあれば自分で通知してインストールする。

---

## インストール (エンドユーザー向け)

[Releases](https://github.com/myguma/amispi-companion/releases) から最新の  
`amispi-companion_X.Y.Z_x64-setup.exe` をダウンロードしてダブルクリック。

- 管理者権限は不要
- インストール完了後に「起動する」チェックボックスが出る
- 次回 PC 起動時から自動で常駐する

---

## 技術スタック

| | |
|---|---|
| デスクトップシェル | Tauri v2 (Rust) |
| フロントエンド | React 18 + TypeScript 5 |
| CSS | Tailwind CSS v3 |
| ビルドツール | Vite 6 |
| インストーラー | NSIS (管理者権限不要) |
| 自動アップデート | tauri-plugin-updater + GitHub Releases |
| スタートアップ登録 | tauri-plugin-autostart |

---

## 開発者向け

### 開発環境の起動

```bash
# 依存関係をインストール
npm install

# フロントエンドのみブラウザで確認 (Tauri API は動かない)
npm run dev

# Tauri デスクトップアプリとして起動 (WSL の場合 WSLg が必要)
npm run tauri:dev
```

### Windows インストーラーをビルドする

**方法 A — ダブルクリック (推奨)**

Windows エクスプローラーで `scripts\build-release.bat` をダブルクリック。  
自動で依存関係チェック・ビルド・エクスプローラー表示まで行う。

事前に署名鍵を保存しておく:
```
%USERPROFILE%\.tauri\amispi-companion.key
```
鍵の内容は `docs/RELEASE.md` を参照。

**方法 B — PowerShell から**

```powershell
# Windows PowerShell で実行
npm install
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content "$HOME\.tauri\amispi-companion.key" -Raw)
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri:build
```

生成物: `src-tauri\target\release\bundle\nsis\amispi-companion_X.Y.Z_x64-setup.exe`

> WSL2 からは Linux 向けビルドになります。Windows 向けは必ず Windows 側から実行してください。

### リリース (GitHub Actions)

```bash
# バージョンを上げてタグを push するだけ
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions が自動でビルド・署名・Draft Release を作成する。  
詳細は `docs/RELEASE.md` を参照。

---

## アップデートの仕組み

1. アプリ起動 8 秒後にサイレントで更新チェック
2. 新バージョンがあればキャラクターが一言通知
3. キャラクター下の `↑ vX.Y.Z` ボタンをクリック
4. NSIS が自動インストール → アプリが再起動

---

## キャラクターのカスタマイズ

`public/characters/default/` に PNG を配置するだけでスプライトに切り替わる。  
ファイルがなければ SVG の Spirit Orb フォールバックを使用。  
詳細は `public/characters/default/README.md` を参照。

---

## ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/TECHNICAL_DECISION.md` | スタック選定の根拠・リスク |
| `docs/PRODUCT_VISION.md` | プロダクトビジョン |
| `docs/ARCHITECTURE.md` | アーキテクチャ詳細 |
| `docs/ROADMAP.md` | 開発ロードマップ (Phase 0〜7) |
| `docs/RELEASE.md` | リリース手順・署名鍵セットアップ |
| `docs/DEVELOPMENT_LOG.md` | 実装ログ |
| `docs/NEXT_SESSION.md` | 次のセッションへの引継ぎ |
