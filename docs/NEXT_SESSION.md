# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-11**

---

## 現在のステータス

**フェーズ:** Phase 1 — Desktop Presence (完了)  
**次のフェーズ:** Phase 2 — State and Animation (本格デバッグ)

---

## ビルド確認済みの事実

```
✅ TypeScript: tsc --noEmit → クリーン
✅ Rustバックエンド: cargo build → Finished dev profile 14.15s
✅ フロントエンドビルド: npm run build → ✓ built 725ms
⚠️ Tauri dev 起動: 未テスト (WSLg での表示確認が必要)
⚠️ Windowsネイティブ動作: 未テスト
```

---

## アプリの起動方法

### フロントエンド単体確認 (ブラウザで)

```bash
cd ~/projects/amispi-companion
npm run dev
# http://localhost:1420 でブラウザ確認
# 注意: Tauri API は動かないがUIの確認はできる
```

### WSLg でTauriアプリとして起動 (Linux)

```bash
cd ~/projects/amispi-companion
npm run tauri:dev
# WSLg (DISPLAY=:0) が必要
# WSL → Linux ビルド。透明ウィンドウ動作はLinux/Waylandに依存
```

### Windows デスクトップアプリとして起動

**Windows PowerShell から実行すること (WSL内からは不可)**

```powershell
# 前提: Windows側にRust + Node.js + Tauri CLI がインストールされていること
cd \\wsl.localhost\Ubuntu-22.04\home\claw\projects\amispi-companion
npm install
npm run tauri:dev
```

または Windows 側に Rust/Node を入れず、WSL からクロスコンパイル (難易度高):
```bash
# 未セットアップ。TECHNICAL_DECISION.md の R2 リスクを参照
cargo install cross  # 要 Docker
```

---

## 何が動いているか

- ✅ TypeScript 型定義: CompanionState, CharacterConfig, MemoryEvent, AIProvider
- ✅ 状態マシン: idle → touched → sleep → waking → thinking → speaking → idle
- ✅ SVG Spirit Orb フォールバックキャラクター (状態別CSS アニメーション)
- ✅ 吹き出しコンポーネント
- ✅ ドラッグフック (Tauri startDragging)
- ✅ クリックスルー制御 (set_ignore_cursor_events)
- ✅ ダイアログシステム (プレースホルダーテキスト、重み付き抽選)
- ✅ メモリイベントログ (localStorage)
- ✅ モックAIプロバイダー (ネットワーク不要)
- ✅ デバッグオーバーレイ (開発モードのみ)

---

## 不確実・未テストな点

1. **WSLg での透明ウィンドウ表示** — Linux/Wayland 環境での動作は未確認。
   Tauri v2 の Linux 透明ウィンドウは環境依存。
   
2. **Windows ネイティブ動作** — WSL からビルドしているため実際の Windows 動作は未テスト。
   `set_ignore_cursor_events` の Windows 実装が重要。

3. **スプライト画像フォールバック** — `public/characters/default/` に PNG がないため常にSVFフォールバックが使われている。予期通り動くはずだが要確認。

4. **sleepタイムアウト** — 5分のデフォルト値は長い。テスト時は `DEFAULT_STATE_CONFIG` の `sleepTimeoutMs` を一時的に短くする (例: 10秒)。

---

## 次の推奨タスク

### タスク A: 実機動作確認 (最優先)

```bash
npm run tauri:dev
```
を実行して実際に画面を確認する。  
発生したエラーを診断して修正する。  
特に確認すべき点:
- ウィンドウが透明になっているか
- キャラクター (SVG Orb) が表示されているか  
- クリックで反応するか (touched状態)
- 吹き出しが表示されるか
- ドラッグで動くか

### タスク B: Phase 2 の実装

確認後、以下を実装する:
- スリープタイムアウトの動作確認
- 起床アニメーション確認
- 吹き出しフェードアウトアニメーション
- スプライトアセットシステムのテスト (test.png を置いてみる)

### タスク C: Windows ビルドの検討

Windows PowerShell 環境を準備して実際のデスクトップ動作を確認する。  
透明ウィンドウとクリックスルーのWindows実装を検証する。

---

## 重要な設計制約 (コーディング時の注意)

1. **キャラクター名・ロアはコードに書かない** — すべてデータ層 (`dialogueData.ts`, `public/characters/`) で管理
2. **秘密情報は触らない** — `.env` ファイルへの操作禁止
3. **Amispi の最終デザインを先取りしない** — SVG フォールバックはあくまでプレースホルダー
4. **メモリは端末外に送らない** — localStorage のみ使用
5. **AIなしでもアプリが動くこと** — MockProvider が常に利用可能

---

## プロジェクト構造 (概要)

```
~/projects/amispi-companion/
├── docs/                    ← ← ← 全ドキュメントはここ
│   ├── TECHNICAL_DECISION.md
│   ├── PRODUCT_VISION.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   ├── DEVELOPMENT_LOG.md
│   └── NEXT_SESSION.md  ← このファイル
├── src/                     ← React/TypeScript フロントエンド
│   ├── types/companion.ts   ← 全型定義
│   ├── hooks/               ← useCompanionState, useDrag
│   ├── components/          ← Character, SpeechBubble, DebugOverlay
│   ├── systems/             ← dialogue, memory, ai
│   └── styles/index.css     ← アニメーション定義
├── src-tauri/               ← Rust バックエンド
│   ├── src/lib.rs           ← Tauri commands
│   ├── tauri.conf.json      ← ウィンドウ設定
│   └── capabilities/        ← 権限設定
├── public/characters/default/ ← スプライトアセット置き場
└── dist/                    ← ビルド成果物 (gitignore)
```

---

## 検証コマンド

```bash
# TypeScript 型チェック
cd ~/projects/amispi-companion && npx tsc --noEmit

# Rust ビルド確認
cd ~/projects/amispi-companion && cargo build --manifest-path src-tauri/Cargo.toml

# フロントエンドビルド確認  
cd ~/projects/amispi-companion && npm run build

# ファイル構造確認
find ~/projects/amispi-companion/src -name "*.ts" -o -name "*.tsx" | sort
```
