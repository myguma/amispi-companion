# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.30
**GitHub Actions / Windows Installer build:** v0.1.27 ✅ 成功済み (v0.1.28〜v0.1.30 は push 直後)
**フェーズ:** Phase 0〜6b-real-1 完了

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.30)
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
| Phase 6b-real-1 | Local STT Recording Foundation (実録音 + STTAdapter + Whisper skeleton) | ✅ 完了 |

---

## Phase 6b-real-1 実装詳細

### 新規追加ファイル

- `src/systems/voice/useVoiceRecorder.ts`
  - Push-to-talk 中だけ getUserMedia → 録音 → Blob
  - `maxDurationMs` で自動停止 (デフォルト 15000ms)
  - 停止後に `stream.getTracks().stop()` でマイクを解放
  - エラー: not_supported / permission_denied / no_microphone / recorder_error
- `src/systems/voice/WhisperCliSTTAdapter.ts`
  - executable path + model path が設定済みなら `isAvailable() = true`
  - 現在 `transcribe()` は `{ ok: false, error: "unavailable" }` を返す (skeleton)
  - Phase 6b-real-2 で Rust sidecar 統合予定

### 変更ファイル

- `src/systems/voice/STTAdapter.ts`: `STTInput = Blob | ArrayBuffer` 追加
- `src/systems/voice/MockSTTAdapter.ts`: STTInput 対応
- `src/systems/voice/STTAdapterManager.ts`: `sttEngine` 設定でアダプター切替
- `src/hooks/useCompanionState.ts`:
  - `voiceListeningStart()` — 録音開始時に voiceUIState を "voiceListening" へ
  - `requestVoiceFromBlob(blob)` — Blob → STT → AI パイプライン
  - `voiceRecordingError(err)` — エラー→3秒後に voiceReady/Off
- `src/App.tsx`: 実録音パイプラインへ切替 (`useVoiceRecorder` 使用)
- `src/settings/types.ts`: STTEngine / sttEngine / whisper* / maxRecordingMs 追加
- `src/settings/defaults.ts`: 対応デフォルト追加
- `src/settings/pages/VoicePage.tsx`: STT エンジン選択 UI / whisper path 入力

### 設定追加

```ts
sttEngine: "mock" | "whisperCli"  // デフォルト "mock"
whisperExecutablePath: string      // デフォルト ""
whisperModelPath: string           // デフォルト ""
whisperTimeoutMs: number           // デフォルト 30000
maxRecordingMs: number             // デフォルト 15000
```

---

## 次のフェーズ (優先順)

### Phase 6b-real-2 — WhisperCli Rust Sidecar Integration ← **次**

**目的:** 実際の whisper.cpp CLI を呼んで transcript を得る。

**実装すべき内容:**
1. `src-tauri/src/voice/mod.rs` 新規作成
   - `write_temp_audio(bytes: Vec<u8>, suffix: String) -> Result<String, String>` コマンド
   - `delete_temp_file(path: String) -> Result<(), String>` コマンド
   - または一気通貫の `transcribe_with_whisper(bytes, mime_type) -> Result<String, String>`
2. Rust 側の安全方針:
   - `std::process::Command` (shell 経由でない)
   - 引数は配列で渡す (shell injection なし)
   - temp file は処理後に必ず削除
   - タイムアウト (tokio::time::timeout 等)
3. `WhisperCliSTTAdapter.transcribe()` を実装:
   - Blob → ArrayBuffer → Vec<u8> 変換
   - `invoke("transcribe_with_whisper", { bytes, mimeType })` を呼ぶ
   - 返ってきた transcript テキストを STTAdapterOutput として返す
4. WAV 変換:
   - whisper.cpp は wav を期待することが多い
   - Rust 側で webm → wav 変換、または ffmpeg sidecar (将来)
   - まず webm をそのまま渡してみて、whisper CLI が対応するか確認
5. docs 更新 / build 確認

**完了条件:**
- whisper executable path + model path を設定すると実際に STT が動く
- 録音→transcript→無明返答 が動く
- 一時ファイルが残らない
- mock STT も引き続き動く
- `npm run build` / `cargo build` が通る

### Phase 6c — Voice UX Hardening

- 録音中のパルスアニメーション
- DND / Quiet / Focus との整合確認
- 連続録音防止
- 無音録音の検出と fallback

### Phase 7a — Screen Understanding Planning Only

- 実際のキャプチャ実装はまだしない
- `screenUnderstandingEnabled` / `screenCaptureMode` 設定追加
- Transparency UI に Screen / OCR 状態表示
- `docs/SCREEN_UNDERSTANDING.md` 作成

### Phase 8 — Optional TTS

- `ttsEnabled` / TTS adapter interface
- Windows TTS / Piper / VOICEVOX 候補

---

## 次に触るファイル (Phase 6b-real-2)

**新規作成:**
```
src-tauri/src/voice/mod.rs
```

**変更:**
```
src-tauri/src/lib.rs                    ← voice コマンドを登録
src/systems/voice/WhisperCliSTTAdapter.ts ← transcribe() 実装
docs/VOICE_INTERACTION.md              ← Phase 6b-real-2 実装詳細追記
docs/NEXT_SESSION.md                   ← (このファイル更新)
```

---

## 既知の注意事項・リスク

1. **WebView MediaRecorder 対応**: Tauri v2 の WebView (WebView2/Edge) は MediaRecorder / getUserMedia に対応しているはず。ただし Tauri のパーミッション設定 (capabilities) でマイクが許可されているか確認が必要。

2. **WebM → WAV 変換**: whisper.cpp は WAV を推奨するが、WebM でも動く場合がある。Phase 6b-real-2 で確認。

3. **Tauri capabilities**: `src-tauri/capabilities/` に `microphone` パーミッションが含まれているか確認が必要かもしれない。

4. **whisper.cpp のバイナリ・モデル同梱はまだしない**: ユーザーが自分で用意してパスを設定する。インストーラーサイズが大幅に増えるため。

5. **OllamaProvider の snapshot 参照**: Phase 6a.5 で修正済み。実際の `snapshotRef.current` が使われる。

---

## 実機確認チェックリスト

Phase 6b-real-1 完了後に確認すること:
- [ ] voiceInputEnabled OFF でマイク許可要求が出ない
- [ ] Voice Input ON + pushToTalk + Mock で長押し → マイク許可要求 → 録音中ドット表示
- [ ] 離したら STT 処理 → 無明が返答する (Mock transcript)
- [ ] 15秒を超えると自動停止する
- [ ] whisperCli + path 未設定で壊れない (Mock fallback)
- [ ] クリックしたら反応する (既存)
- [ ] Drag で位置が変わり、次回起動時に復元される (既存)
- [ ] 設定ウィンドウの全タブが表示される (既存)
- [ ] Ollama 未起動でもクリック反応する (fallback) (既存)
- [ ] MediaContext / Transparency UI が壊れていない (既存)

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
✅ voiceInputEnabled = false では録音しない
✅ STT 失敗時は fallback (固まらない)
```

---

## Claude Code が次セッションで迷わないための作業順 (Phase 6b-real-2)

```
1. npm run build → 通ることを確認
2. cargo build  → 通ることを確認
3. src-tauri/src/voice/mod.rs 新規作成 (transcribe_with_whisper コマンド)
4. src-tauri/src/lib.rs に voice コマンドを invoke_handler に追加
5. src/systems/voice/WhisperCliSTTAdapter.ts に transcribe() 実装
6. npm run build → 通ることを確認
7. cargo build  → 通ることを確認
8. docs/VOICE_INTERACTION.md 更新
9. docs/NEXT_SESSION.md 更新
10. git add / commit / bump v0.1.31 / push
```
