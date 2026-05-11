# リリース手順 — AmitySpirit Companion

> このファイルは Windows インストーラーのビルドとリリース方法を記載する。
> 将来のセッションでも参照できるよう、チャット履歴に依存しない形で記録する。

---

## 仕組み

1. `git tag vX.Y.Z` を push すると **GitHub Actions** が自動起動
2. `windows-latest` ランナーで Tauri + React をビルド
3. NSIS インストーラー (`.exe`) と更新マニフェスト (`latest.json`) を生成
4. GitHub Release (Draft) として自動公開
5. Release を Publish すると既存のアプリが次回起動時に更新を検知

---

## 初回セットアップ (一度だけ実施)

### ステップ 1: 署名鍵を GitHub Secrets に登録

GitHub リポジトリの **Settings → Secrets and variables → Actions** を開く。

以下の 2 つの Secret を追加する:

| Secret 名 | 値 |
|-----------|-----|
| `TAURI_SIGNING_PRIVATE_KEY` | 下記の秘密鍵をそのままペースト |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | (空白のまま) |

**秘密鍵 (TAURI_SIGNING_PRIVATE_KEY):**

```
dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5
ClJXUlRZMEl5TDhxektKUHBDejh5Q214TDcxUzZFK1NFd2IrRk5renRXbTEw
WXEzSXNtSUFBQkFBQUFBQUFBQUFBQUlBQUFBQW5uMmpuNEdDempnNW15Y1Mx
WlJwTktReU12YmtyamFtRHNmQWdmZGRTL3ZETE1FTk5hRklSYzVjMnBLZnBU
amI4STgrWjVydDcxSm1kdDJ4RXVzYUF4TUF1SjRsbzRyUUcvSGMvVTB5WlhV
QVVMYmZKRFBtOEVkSlh5c0xnK0RUYUQ2SXptV0hNYTg9Cg==
```

> ⚠️ この鍵をリポジトリにコミットしないこと。GitHub Secrets にのみ保存する。

**公開鍵 (参考):**  
すでに `tauri.conf.json` の `plugins.updater.pubkey` に設定済み。

---

### ステップ 2: 鍵ファイルのバックアップ

鍵ファイルは WSL 内の `~/.tauri/` に保存されている。  
紛失すると既存ユーザーへのアップデート配布が不可能になる。

```bash
# バックアップ場所の確認
ls ~/.tauri/amispi-companion.key*
```

安全な場所 (パスワードマネージャー等) にバックアップを保存すること。

---

## 新バージョンのリリース手順

### 1. バージョン番号を更新

以下の 2 ファイルのバージョンを同じ値に変更する:

**`src-tauri/tauri.conf.json`:**
```json
"version": "0.2.0",
```

**`src-tauri/Cargo.toml`:**
```toml
version = "0.2.0"
```

### 2. CHANGELOG.md を更新

```markdown
## [0.2.0] — YYYY-MM-DD

### Added
- ...
```

### 3. コミット

```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
```

### 4. タグを作成して push

```bash
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

→ GitHub Actions が自動起動し、約 5〜10 分で Draft Release が作成される。

### 5. GitHub Release を Publish

GitHub の Releases ページを開き、Draft を確認してから **Publish release** をクリック。

→ 公開後、既存アプリが次回起動の 8 秒後に更新を検知する。

---

## アップデートの仕組み (ユーザー視点)

1. アプリ起動 → 8 秒後にサイレントで更新チェック
2. 新バージョンがあれば → キャラクターが一言 (`"vX.Y.Z arrived."`)
3. キャラクター下部に小さいボタン `↑ vX.Y.Z` が表示される
4. ボタンをクリック → NSIS インストーラーが passive モードで動作
5. インストール完了 → アプリが自動再起動

---

## ビルドの手動確認

GitHub Actions を待たずにローカルでビルドを確認したい場合 (Windows PowerShell から):

```powershell
cd \path\to\amispi-companion
npm install
$env:TAURI_SIGNING_PRIVATE_KEY = "秘密鍵の値"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri:build
```

生成物: `src-tauri/target/release/bundle/nsis/amispi-companion_X.Y.Z_x64-setup.exe`

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| Actions が失敗する (署名エラー) | Secrets 未設定 | ステップ 1 を実行 |
| アップデートが検知されない | Release が Draft のまま | Publish する |
| アップデート後に起動しない | インストーラーがブロックされた | Windows Defender の除外設定 |
| バージョン番号が一致しない | タグとバージョンのズレ | タグとファイルを同じ番号にする |
