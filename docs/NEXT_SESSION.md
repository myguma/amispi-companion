# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.28
**GitHub Actions / Windows Installer build:** v0.1.27 ✅ 成功済み (v0.1.28 は push 直後)
**フェーズ:** Phase 0〜6a 完了、Phase 6b 準備済み

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.27)
✅ cargo build  → Finished dev profile
✅ GitHub Actions / Windows Installer → 成功済み
✅ v0.1.27 タグ push 済み
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

### Phase 6a — Voice Input Foundation ← **次に実装**

目的: 本物の STT 統合はまだ行わない。設定・状態・導線・mock transcript まで。

**実装すべき内容:**
1. `settings/types.ts`: `voiceInputMode: "off" | "pushToTalk"` 追加 (voiceInputEnabled は既存)
2. `settings/defaults.ts`: `voiceInputMode: "off"` 追加
3. `settings/pages/VoicePage.tsx` 新規作成 (Voice Input ON/OFF / mode / 説明文)
4. `settings/SettingsApp.tsx`: "音声" タブ追加
5. `useCompanionState.ts`: `requestVoiceResponse(transcript: string)` 追加
6. `App.tsx`: push-to-talk 長押しエントリポイント (キャラクター長押し or キーショートカット)
7. UI 状態: voiceOff / voiceReady / voiceListening / voiceTranscribing / voiceResponding
8. Mock transcript を CompanionContext.voiceInput に入れて trigger: "voice" で AI flow を通す
9. `docs/VOICE_INTERACTION.md` 新規作成
10. `npm run build`

**完了条件:**
- 設定画面から Voice Input ON/OFF できる
- push-to-talk mode が選べる
- キャラクター長押し or ショートカットで mock transcript が発火する
- voice trigger で無明が返答する
- 既存クリック反応・Ollama fallback・MediaContext が壊れない
- `npm run build` が通る

### Phase 6b — Local STT Adapter

- STTAdapter interface 設計
- MockSTTAdapter 実装
- WhisperCliSTTAdapter 設計 (実体統合は慎重に)
- 録音データは処理後即削除
- `docs/VOICE_INTERACTION.md` に STT 候補比較を追記

### Phase 6c — Voice UX Hardening

- 録音中の視覚フィードバック
- 長すぎる録音の自動停止
- DND/Quiet/Focus との整合
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

## 次に触るファイル (Phase 6a)

**新規作成:**
```
src/settings/pages/VoicePage.tsx
docs/VOICE_INTERACTION.md
```

**変更:**
```
src/settings/types.ts          ← voiceInputMode 追加
src/settings/defaults.ts       ← voiceInputMode: "off"
src/settings/SettingsApp.tsx   ← "音声" タブ追加
src/hooks/useCompanionState.ts ← requestVoiceResponse() 追加
src/App.tsx                    ← push-to-talk エントリポイント
src/systems/ai/PromptBuilder.ts ← voiceInput をプロンプトに追加 (確認)
docs/NEXT_SESSION.md           ← (このファイル更新)
docs/SAFETY_AND_PRIVACY_BOUNDARIES.md ← 音声入力境界を追記
```

---

## 既知の注意事項・リスク

1. **OllamaProvider の snapshot 参照**: `respond(_input)` が `EMPTY_SNAPSHOT` を使用している
   - Phase 6b 以降で実際の snapshot を渡せるようにする
   - 現状の動作には影響なし

2. **sysinfo "process" feature**: sysinfo 0.33 では `"process"` という feature 名は存在しない
   - `"system"` feature に含まれる (ProcessRefreshKind が使える)
   - Cargo.toml は `features = ["system"]` で正しい

3. **push-to-talk と startDragging の競合**: キャラクター長押しで録音を開始する場合、
   `startDragging()` と競合する可能性がある
   - 長押し判定 (500ms) と ドラッグ判定 (5px 移動閾値) を明確に分離すること

4. **voiceInputEnabled フラグ**: Phase 1 の時点で `settings/types.ts` に追加済みだが
   `voiceInputMode` はまだない。Phase 6a で追加する。

---

## 実機確認チェックリスト

Phase 6a 完了後に確認すること:
- [ ] クリックしたら反応する
- [ ] Drag で位置が変わり、次回起動時に復元される
- [ ] 設定ウィンドウの「AI エンジン」タブが表示される
- [ ] 設定ウィンドウの「無明が見ているもの」タブでライブ状態が表示される
- [ ] 設定ウィンドウの「音声」タブが表示される (Phase 6a 後)
- [ ] voice input OFF でクリック反応が壊れない
- [ ] Ollama 未起動でもクリック反応する (fallback)

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

## Claude Code が次セッションで迷わないための作業順

```
1. npm run build → 通ることを確認
2. cargo build  → 通ることを確認
3. settings/types.ts に voiceInputMode 追加
4. settings/defaults.ts に voiceInputMode: "off" 追加
5. settings/pages/VoicePage.tsx 新規作成 (Voice ON/OFF / mode / プライバシー説明)
6. settings/SettingsApp.tsx に "音声" タブ追加
7. useCompanionState.ts に requestVoiceResponse(transcript) 追加
8. App.tsx に push-to-talk エントリポイント追加 (長押し)
9. npm run build → 通ることを確認
10. docs/VOICE_INTERACTION.md 作成
11. docs/SAFETY_AND_PRIVACY_BOUNDARIES.md に音声境界追記
12. docs/NEXT_SESSION.md 更新
13. git add / commit / bump v0.1.28 / push
```
