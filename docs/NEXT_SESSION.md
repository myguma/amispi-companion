# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.29
**GitHub Actions / Windows Installer build:** v0.1.27 ✅ 成功済み (v0.1.28, v0.1.29 は push 直後)
**フェーズ:** Phase 0〜6a.5 完了

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.29)
✅ cargo build  → Finished dev profile
✅ GitHub Actions / Windows Installer → v0.1.27 成功済み
```

---

## 完了済みフェーズ

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 0 | Planning and Guardrails (docs) | ✅ 完了 |
| Phase 1 | CompanionContext / SpeechPolicy / SpeechQueue / inferActivity | ✅ 完了 |
| Phase 2 | PromptBuilder / QualityFilter / OllamaProvider / AI設定UI | ✅ 完了 |
| Phase 3 | MediaContext — バックグラウンドメディアアプリ検出 | ✅ 完了 |
| Phase 4 | Transparency UI v2 — 観測状態ライブパネル | ✅ 完了 |
| Phase 5 | ウィンドウ位置の保存・復元 | ✅ 完了 |
| Phase 6a | Voice Input Foundation / mock transcript | ✅ 完了 |
| Phase 6a.5 | Context Wiring and Input Stabilization | ✅ 完了 |
| Phase 6b | STTAdapter interface / MockSTTAdapter | ✅ 準備済み |

---

## Phase 6a.5 実装詳細

### AIProvider インターフェース刷新

- `src/companion/ai/types.ts`: `AIProvider.respond(input: AIProviderInput)` → `respond(ctx: CompanionContext)`
- `src/companion/ai/OllamaProvider.ts`: `EMPTY_SNAPSHOT` 依存を完全除去。`respond(ctx)` で `buildPrompt(ctx)` を呼ぶだけ
- `src/companion/ai/MockProvider.ts`: `respond(_ctx: CompanionContext)` に変更
- `src/companion/ai/RuleProvider.ts`: `CompanionContext` フィールドで直接ルール判定
- `src/companion/ai/AIProviderManager.ts`: `getAIResponse(ctx: CompanionContext)` に変更

### 変換ブリッジ除去

- `src/systems/ai/buildCompanionContext.ts`: `contextToProviderInput()` を削除
- `src/hooks/useCompanionState.ts`: `contextToProviderInput` import を削除、`ctx` を直接 `getNewAIResponse(ctx)` に渡す

### VoiceUIState 安定化

- `requestVoiceResponse` に try/finally を追加。例外時も `setVoiceUIState("voiceReady")` が必ず実行される

### Push-to-talk / ドラッグ競合修正

- `src/App.tsx`: `isDragging` が true になった瞬間に PTT タイマーをキャンセルする `useEffect` 追加

---

## Phase 3〜5 実装詳細 (参考)

### Phase 3 — MediaContext

- `src-tauri/src/observation/mod.rs`: `detect_media()` 追加
  - `sysinfo::System::new_with_specifics(RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()))`
  - Spotify / MusicBee / foobar2000 / VLC / MPC-HC / PotPlayer 等を検出
  - フォアグラウンド判定 → バックグラウンドスキャンの順
- `src/observation/types.ts`: `MediaContext` 型追加、`ObservationSnapshot.media?: MediaContext`
- `src/companion/activity/inferActivity.ts`: バックグラウンド音楽検出 `listeningMusic` ケース追加
- `src/systems/ai/PromptBuilder.ts`: 音楽・動画再生中の情報をプロンプトに追加

### Phase 4 — Transparency UI v2

- `src/settings/pages/TransparencyPage.tsx`: 全面書き直し
  - `LiveStatusPanel`: 現在の ActivityInsight をリアルタイム表示 (更新ボタン付き)
  - `OllamaStatus`: `fetch /api/tags` で Ollama 接続確認
  - AI エンジン状態セクション追加
  - 「見ていないもの」に画面キャプチャ・マイク・クリップボードを明示

### Phase 5 — ウィンドウ位置保存

- `src-tauri/src/settings/mod.rs`: `window_x: Option<i32>`, `window_y: Option<i32>` 追加
- `src-tauri/src/lib.rs`:
  - `save_window_position(app, x, y)` コマンド追加
  - 起動時: 保存位置があれば復元 (範囲チェックあり)、なければデフォルト右下
- `src/App.tsx`: ドラッグ終了後 100ms で `outerPosition()` を取得し保存

---

## 次のフェーズ (優先順)

### Phase 6b-real — Local STT 統合 ← **次に実装**

現状: `STTAdapterManager` は常に `MockSTTAdapter` を返す。Phase 6b で whisper.cpp 等を統合する。

**実装すべき内容:**
1. `WhisperCliSTTAdapter` の設計と実装 (whisper.cpp CLI を sidecar として呼び出す)
2. `settings/types.ts`: `sttEngine: "mock" | "whisper_cli"` 追加
3. `STTAdapterManager`: 設定に応じてアダプターを切替
4. App.tsx: push-to-talk 中に実際の録音 (`navigator.mediaDevices.getUserMedia` or Tauri plugin)
5. 録音完了後に `adapter.transcribe(blob)` → `requestVoiceResponse(transcript)`
6. 録音データは処理後即破棄 (Blob URL revoke)
7. `docs/VOICE_INTERACTION.md` に WhisperCliSTTAdapter の設計を追記

**完了条件:**
- push-to-talk で実際に録音・STT が動く
- transcript が正しく AI flow に入る
- 録音データがメモリ外に残らない
- `npm run build` が通る

### Phase 6c — Voice UX Hardening

- 録音中の視覚フィードバック強化
- 長すぎる録音の自動停止 (30秒上限)
- DND/Quiet/Focus との整合確認
- 連続発話防止

### Phase 7a — Screen Understanding Planning Only

- 実際のキャプチャはまだ実装しない
- `screenUnderstandingEnabled` / `screenCaptureMode` 設定追加
- Transparency UI に Screen / OCR 状態表示
- `docs/SCREEN_UNDERSTANDING.md` 作成

### Phase 7b — Optional Local Screen Capture Prototype

- 明示許可時のみ / 生画像保存禁止 / local VLM のみ

### Phase 8 — Optional TTS

- `ttsEnabled` / TTS adapter interface
- Windows TTS / Piper / VOICEVOX 候補

---

## 次に触るファイル (Phase 6b-real)

**新規作成:**
```
src/systems/voice/WhisperCliSTTAdapter.ts
```

**変更:**
```
src/systems/voice/STTAdapterManager.ts  ← sttEngine 設定に応じて切替
src/settings/types.ts                   ← sttEngine 追加
src/settings/defaults.ts                ← sttEngine: "mock"
src/settings/pages/VoicePage.tsx        ← STT エンジン選択UI追加
src/App.tsx                             ← push-to-talk で実際の録音を起動
docs/VOICE_INTERACTION.md              ← WhisperCliSTTAdapter 設計追記
docs/NEXT_SESSION.md                   ← (このファイル更新)
```

---

## 既知の注意事項・リスク

1. **sysinfo "process" feature**: sysinfo 0.33 では `"process"` という feature 名は存在しない
   - `"system"` feature に含まれる (ProcessRefreshKind が使える)
   - Cargo.toml は `features = ["system"]` で正しい

2. **push-to-talk と startDragging の競合**: Phase 6a.5 で基本的な競合は解消 (isDragging で PTT キャンセル)
   - Phase 6b 以降で実際の録音を開始する場合は再確認

3. **voiceInputEnabled フラグ**: 設定画面で ON にしないと push-to-talk が発火しない
   - デフォルト: `voiceInputEnabled: false`、`voiceInputMode: "off"`

4. **OllamaProvider の snapshot 参照**: Phase 6a.5 で修正済み。実際の `snapshotRef.current` が使われる

---

## 実機確認チェックリスト

Phase 6a.5 完了後に確認すること:
- [ ] クリックしたら反応する
- [ ] Drag で位置が変わり、次回起動時に復元される
- [ ] 設定ウィンドウの「AI エンジン」タブが表示される
- [ ] 設定ウィンドウの「無明が見ているもの」タブでライブ状態が表示される
- [ ] 設定ウィンドウの「音声」タブが表示される
- [ ] voice input OFF でクリック反応が壊れない
- [ ] Ollama 未起動でもクリック反応する (fallback)
- [ ] 音声 ON + pushToTalk モードで長押し時に mock 返答が来る

---

## 壊してはいけないもの

```
✅ onCharacterClick → requestAIResponse → AI(none/mock/ollama) → triggerSpeak
✅ fireReaction → fallback when AI unavailable or policy blocks
✅ SpeechPolicy (DND/quiet/focus/fullscreen 抑制)
✅ useObservationReactions (fullscreenDetected/mediaDetected/gamingDetected/longIdle)
✅ overClicked, returnAfterBreak, returnAfterLongBreak reactions
✅ CryEngine (sleep/wake/touch sounds)
✅ ウィンドウ位置の保存・復元
✅ MediaContext (Spotify 等のバックグラウンド検出)
✅ Transparency UI v2 (ライブパネル・Ollama 接続確認)
✅ cargo build が通ること
✅ npm run build が通ること
```

---

## Claude Code が次セッションで迷わないための作業順 (Phase 6b-real)

```
1. npm run build → 通ることを確認
2. cargo build  → 通ることを確認
3. settings/types.ts に sttEngine 追加
4. settings/defaults.ts に sttEngine: "mock" 追加
5. WhisperCliSTTAdapter.ts 新規作成 (whisper.cpp CLI wrapper)
6. STTAdapterManager.ts: sttEngine 設定に応じて切替
7. VoicePage.tsx: STT エンジン選択UI追加
8. App.tsx: push-to-talk で実際の録音を呼ぶ (getUserMedia or Tauri plugin)
9. npm run build → 通ることを確認
10. docs/VOICE_INTERACTION.md 更新
11. docs/NEXT_SESSION.md 更新
12. git add / commit / bump v0.1.30 / push
```
