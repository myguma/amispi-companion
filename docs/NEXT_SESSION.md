# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12 (v0.1.36)**

---

## 現在のステータス

**バージョン:** v0.1.36
**フェーズ:** Field QA Root Cause Fixes 完了 (実機確認待ち)
**全体進捗:** 約 69%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照
**記憶設計:** docs/MEMORY_AND_DATA_CONTROL.md 参照
**QA 記録:** docs/FIELD_QA_NOTES.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.36)
✅ cargo build  → Finished dev profile (v0.1.36)  ← ureq 2 追加 (初回 +14s)
✅ GitHub Actions / Windows Installer → v0.1.27 成功済み (v0.1.28〜v0.1.36 は push 直後)
```

---

## 完了済みフェーズ

| Phase / Milestone | 内容 | 状態 |
|---|---|---|
| Phase 0–5 | 土台・観測・PromptBuilder・MediaContext・ウィンドウ位置 | ✅ 完了 |
| Phase 6a / 6a.5 / 6b-real-1 | Voice Foundation・実録音・STTAdapter基盤 | ✅ 完了 |
| Milestone A 第1段階 | ActivityInsight精度・DailySummary・PromptBuilder改善・TransparencyUI | ✅ v0.1.31 |
| Milestone A 第2段階 | RuleProvider文脈強化・autonomous speech精度向上・発話制御UI | ✅ v0.1.32 |
| Milestone B 第1段階 | Memory Viewer UI・記憶削除機能・memoryStore拡張 | ✅ v0.1.33 |
| Milestone B 第2段階 | Character State Expression・状態別CSSアニメーション・VoiceUIState統合 | ✅ v0.1.34 |
| Field QA Fixes Round 1 | Ollamaキャッシュバグ修正・classify_app拡充・当たり判定改善・デバッグUI | ✅ v0.1.35 |
| Field QA Root Cause Fixes | Ollama CORS根本修正(Rust経由HTTP)・ActiveAppDebug・SPEECH_VISIBLE hit test | ✅ v0.1.36 |

---

## Field QA Fixes 実装詳細 (v0.1.35)

### 修正 A: OllamaProvider キャッシュバグ

- `AIProviderManager.ts`: モジュール変数 `_ollamaProvider` キャッシュを廃止
- 毎回 `getSettings()` から現在値を読み `new OllamaProvider()` を生成
- `LastAIResultDebug` pub/sub state を追加 (source / fallbackReason / latencyMs / responsePreview)
- AIPage に「接続テスト」「テスト発話」「最後のAI応答パネル」を追加
- デフォルト timeout: 8000ms → 20000ms
- `isAvailable()` timeout: 2000ms → 4000ms

### 修正 B: Active app 観測の classify_app 拡充

- `src-tauri/src/observation/mod.rs`:
  - `"self"` カテゴリ新設: `msedgewebview2.exe` / `amispi-companion.exe`
  - `"communication"` カテゴリ新設: `discord.exe` / `slack.exe` / `teams.exe` / `zoom.exe` / `skype.exe` 等
  - `"media"` 追加: `spotify.exe` / `musicbee.exe` / `foobar2000.exe` / `aimp.exe` / `tidal.exe` 等
  - `"daw"` 追加: `"bitwig studio.exe"` / `fl64.exe` / `reaper64.exe` / `studioone.exe` / `cubase.exe`
  - `"ide"` 追加: `notepad++.exe` / `sublime_text.exe`
  - `"terminal"` 追加: `hyper.exe` / `mintty.exe`
  - `"system"` 追加: `totalcmd.exe` / `freecommander.exe`
- `src/observation/types.ts`: `AppCategory` に `"communication"` / `"self"` を追加
- `src/companion/activity/inferActivity.ts`: `communication` / `self` カテゴリ処理追加
- TransparencyPage: `processName` 表示・`unknownReason` 警告・10秒自動更新

### 修正 C: 当たり判定 / pointer-events

- `src/App.tsx`:
  - 外側コンテナ: `pointer-events: none`
  - `drag-handle` / 吹き出しコンテナ / UpdateBadge / ContextMenu: `pointer-events: auto`
  - 吹き出し非表示時はコンテナ div を非レンダリング
  - `onContextMenu` を `drag-handle` に移動

### 修正 D: VoicePage ON/mode 連動

- 音声入力 ON 時に mode が `"off"` なら `"pushToTalk"` へ自動設定
- `mode=off` 状態で ON の時に警告メッセージを表示

---

## 次のフェーズ候補 (v0.1.37)

### 優先候補 A: First-run Onboarding ← **推奨**

**目的:** 初回起動時の権限・機能・記憶・安全性の説明。

**実装すべき内容:**
1. localStorage に `hasCompletedOnboarding` フラグ
2. 初回のみ表示されるオンボーディング画面 (メインウィンドウに overlay or 別ウィンドウ)
3. 主な項目: ローカル動作・観測内容・Ollama設定方法・記憶について
4. 「設定を開く」ボタンで設定画面に誘導

**完了条件:**
- 初回起動時に表示される
- 2回目以降は表示されない
- 「設定を開く」が機能する
- build が通る

### 優先候補 B: Memory Retention Policy

**目的:** 古いイベントを自動的に整理する仕組み。

**実装すべき内容:**
1. 設定: `memoryRetentionDays` (デフォルト30日)
2. 起動時に古い speech_shown / state_changed を削除
3. MemoryPage に設定UI追加

### 優先候補 C: Emotion Sprite Set

**目的:** CompanionEmotion (shy/concerned/happy) の専用スプライト。

**実装すべき内容:**
1. `public/characters/default/` に shy.png / concerned.png を追加
2. `emotionToSpriteState()` マッピングを更新
3. CryEngine sound との連動

---

## 今やらないこと

- Whisper実接続 (Phase 6b-real-2)
- Screen Capture / OCR
- TTS
- 長期RAG・ベクトルDB
- 大規模UI刷新
- クラウドAI追加
- クラウドSTT

---

## 壊してはいけないもの

```
✅ onCharacterClick → requestAIResponse → AI(none/mock/ollama/rule) → triggerSpeak
✅ fireReaction → fallback when AI unavailable
✅ SpeechPolicy (DND/quiet/focus/fullscreen 抑制)
✅ useObservationReactions (activity遷移発火・deepFocus/gaming/watchingVideo抑制)
✅ scheduleIdleSpeech の activity-aware 抑制
✅ overClicked / returnAfterBreak / returnAfterLongBreak reactions
✅ CryEngine (sleep/wake/touch sounds)
✅ ウィンドウ位置の保存・復元
✅ MediaContext (Spotify等のバックグラウンド検出)
✅ Transparency UI (ActivityInsight・reasons・記憶・発話制御パネル・10秒自動更新)
✅ Memory Viewer UI (MemoryPage) - 削除後も表示が壊れない
✅ Character State Expression - thinking/speaking/sleep/waking CSS アニメーション
✅ VoiceUIState dot インジケーター (Character 内部)
✅ OllamaProvider: invoke("ollama_list_models") / invoke("ollama_chat") で Rust 経由 HTTP (CORS 回避)
✅ LastAIResultDebug: AIPage でデバッグ情報が表示される
✅ classify_app: self/communication カテゴリを含む拡充済みマッピング
✅ pointer-events: none (外側コンテナ) — インタラクティブ要素のみ auto
✅ SPEECH_VISIBLE: 吹き出し非表示時はウィンドウ下部190pxのみ hit test 有効
✅ set_speech_visible: App.tsx から tinyText/speechText 変化時に invoke
✅ get_active_app_debug: フォアグラウンドプロセス取得の段階別デバッグ情報
✅ ActiveAppDebugPanel: TransparencyPage でデバッグパネルを表示
✅ cargo build が通ること
✅ npm run build が通ること
✅ Voice Input 基盤 (voiceInputEnabled=false では録音しない)
✅ Mock STT が動くこと
✅ buildMemorySummary([]) / buildDailySummary([]) が安全に動くこと
```

---

## Claude Code が次セッションで迷わないための作業順

```
1. docs/NEXT_SESSION.md を読む (このファイル)
2. docs/PROGRESS_TRACKER.md で現在地を確認
3. docs/PRODUCT_COMPLETION_ROADMAP.md で方針確認
4. docs/RESPONSE_QUALITY_GUIDE.md で発話品質基準確認
5. npm run build → 通ることを確認
6. cargo build  → 通ることを確認
7. 優先候補 A / B / C のどれかを選んで実装
8. npm run build / cargo build → 通ることを確認
9. docs/PROGRESS_TRACKER.md 更新 (進捗数値)
10. docs/NEXT_SESSION.md 更新 (このファイル)
11. git add / commit / bump v0.1.36 / push
```
