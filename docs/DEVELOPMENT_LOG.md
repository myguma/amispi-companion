# Development Log — AmitySpirit Companion

> このファイルは実装ログ。セッションをまたいで継続的に追記していく。
> 日時・変更内容・理由・変更ファイル・次のステップを必ず記録する。

---

## 2026-05-11 — Phase 0 & Phase 1 初期実装

### 実施内容

**Phase 0: リポジトリ調査**
- `~/projects/` にamispiプロジェクトが存在しないことを確認
- Rust 1.95.0, Cargo 1.95.0, Node.js 25.6.0, npm 11.8.0, cargo-tauri 2.10.1 を確認
- WSLg 利用可能 (DISPLAY=:0), webkit2gtk-4.1 インストール済みを確認
- 新規プロジェクトとして `~/projects/amispi-companion/` を作成

**技術選定**
- Tauri v2 + React 18 + TypeScript 5 を選定
- Electron は RAM 使用量の問題で却下
- 選定根拠を `docs/TECHNICAL_DECISION.md` に記録

**ドキュメント作成**
- `docs/TECHNICAL_DECISION.md` — スタック比較・選定根拠・リスク・アーキテクチャ
- `docs/PRODUCT_VISION.md` — プロダクトビジョン・想定UX・Amispiとの関係
- `docs/ARCHITECTURE.md` — 全体アーキテクチャ・コンポーネント構成・状態モデル
- `docs/ROADMAP.md` — Phase 0〜7 のロードマップ

**Phase 1: 実装**

Tauri v2 プロジェクトを手動スキャフォールド:

- `src-tauri/Cargo.toml` — tauri 2, tauri-plugin-fs, tauri-plugin-shell
- `src-tauri/src/main.rs` — エントリーポイント
- `src-tauri/src/lib.rs` — ウィンドウ設定・Tauri commands (set_ignore_cursor_events, move_window, get_app_version)
- `src-tauri/tauri.conf.json` — 透明・フレームレス・200x300px・always-on-top・skip-taskbar
- `src-tauri/capabilities/default.json` — Tauri v2 権限システム設定
- `src-tauri/build.rs` — tauri-build

フロントエンド:

- `package.json` — 依存関係定義
- `vite.config.ts` — Vite 6 + React, port 1420 固定
- `tsconfig.json` — ES2022 target, vite/client types
- `tailwind.config.js` / `postcss.config.js` — Tailwind v3
- `index.html` — body/html 透明化

TypeScript 実装:

- `src/types/companion.ts` — 全型定義 (CompanionState, StateConfig, CharacterConfig, DialogueEntry, MemoryEvent, AIProvider)
- `src/hooks/useCompanionState.ts` — 状態マシン (idle/touched/sleep/waking/thinking/speaking)
- `src/hooks/useDrag.ts` — Tauri startDragging() を使ったドラッグ
- `src/components/Character.tsx` — スプライト + SVG Spirit Orb フォールバック
- `src/components/SpeechBubble.tsx` — 吹き出しコンポーネント
- `src/components/DebugOverlay.tsx` — 開発時デバッグ表示
- `src/systems/dialogue/dialogueData.ts` — プレースホルダーダイアログ (重み付き抽選)
- `src/systems/memory/memoryStore.ts` — localStorage イベントログ
- `src/systems/ai/AIProvider.ts` — AIプロバイダー抽象
- `src/systems/ai/MockProvider.ts` — モックプロバイダー
- `src/styles/index.css` — Tailwind + 状態別CSSSアニメーション
- `src/App.tsx` — ルートコンポーネント (クリックスルー制御統合)
- `src/main.tsx` — React エントリー

アセット:

- `public/characters/default/README.md` — キャラクターアセットガイド
- `src-tauri/icons/` — プレースホルダーアイコン (RGBA PNG)

### ビルド確認

```
✅ tsc --noEmit → エラーなし
✅ cargo build → Finished dev profile in 14.15s
✅ npm run build → ✓ built in 725ms (dist/ 生成)
```

### 修正した問題

1. `tsconfig.json` に `"types": ["vite/client"]` を追加 → `import.meta.env` 型エラー解消
2. `capabilities/default.json` から `core:window:allow-open-devtools` を削除 → 無効な権限名
3. `src-tauri/icons/` の PNG を RGBA フォーマットで再生成 → tauri-build が RGB PNG を拒否

### 次のステップ

→ `docs/NEXT_SESSION.md` を参照

---

## テンプレート (次のエントリ用)

### YYYY-MM-DD — タイトル

**実施内容:**
- ...

**変更ファイル:**
- ...

**次のステップ:**
- ...
