# Voice Interaction — 音声入力設計と STT 候補

**最終更新: 2026-05-14 (v1.0.1)**

AmitySpirit Companion / 無明 の音声入力機能の設計方針。

---

## 原則

- **Push-to-talk only**: 常時マイク監視禁止。明示的な操作中のみ録音する
- **ローカルファースト**: クラウド STT 禁止 (Google / Azure / OpenAI Whisper API 等)
- **音声データ非保存**: 生録音データは STT 処理後に即破棄
- **transcript は一時保持のみ**: CompanionContext.voiceInput として短期使用、長期保存しない
- **汎用チャットボット化しない**: voice trigger でも無明は短く観察的な返答に留める

---

## フェーズ別実装状態

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 6a | 設定・状態・導線・mock transcript | ✅ 完了 (v0.1.28) |
| Phase 6a.5 | Context Wiring / AIProvider 整理 | ✅ 完了 (v0.1.29) |
| Phase 6b-real-1 | 実録音パイプライン + STTAdapter + WhisperCli skeleton | ✅ 完了 (v0.1.30) |
| Phase 6b-real-2 | WhisperCli Rust sidecar 統合 + FFmpeg WAV 変換 | ✅ v1.0.1 hotfix / field QA pending |
| Phase 6c | UX 強化・フィードバック・DND 整合 | ✅ v0.3.1 hardening / field QA pending |

---

## v1.0.1 FFmpeg conversion hotfix

- v1.0.0 field QAでwhisper-cli起動自体は確認されたが、WebView録音形式を直接渡すと transcript が空になる可能性が高かった
- `ffmpegExecutablePath` をVoice設定に追加
- WebView録音Blobはまず一時ファイルへ保存し、FFmpegで `16kHz mono PCM WAV` に変換してからWhisper CLIへ渡す
- 変換コマンド相当: `ffmpeg -y -i input.webm -ar 16000 -ac 1 -c:a pcm_s16le input.wav`
- FFmpeg未設定時は「FFmpegの設定、まだみたい。」として短く復帰する
- 元音声・変換WAV・transcriptは処理後に一時ディレクトリごと削除する
- WindowsではFFmpeg/Whisper起動時に黒いコンソールが出にくいよう `CREATE_NO_WINDOW` を指定
- 実STT成功は v1.0.1 field QA pending

---

## v0.3.1 QA hardening

- 録音失敗時は `voiceError` に入り、短い固定文で状況を返す
- Whisper未設定 / timeout / no speech / その他STT失敗時はAI応答へ進まず、`voiceReady` / `voiceOff` へ復帰する
- Whisper CLI設定UIに、一時音声ファイルと録音形式互換性の注意を追加
- 実機音声認識は未確認。binary/model/path/MediaRecorder MIME type/マイク権限/一時ファイル削除は field QA pending
- 常時マイク監視 / wake word / クラウドSTT / 音声保存なしの原則は維持

---

## v0.3.0 実装内容

- `transcribe_with_whisper` Tauri commandを追加
- WebView録音BlobをbytesとしてRustへ渡す
- Rust側で一時音声ファイルを作成する
- Whisper CLIをshell経由ではなく `std::process::Command` の引数配列で起動する
- `-m <model> -f <audio> -otxt -of <output_base>` を基本引数として使う
- timeout時はprocess killを試みる
- 成功/失敗に関係なく一時ディレクトリ削除を試みる
- transcriptテキストだけをReactへ返す

### v0.3.0 field QA pending

- Windows上のMediaRecorderが生成する `audio/webm` を、使用するwhisper.cpp binaryが読めるか
- binaryによって `-otxt` / `-of` / `-f` 引数が一致するか
- Whisper model pathの指定が正しいか
- マイク権限拒否・録音失敗・timeoutから復帰するか
- temp dirに音声ファイルが残らないか
- long press中にdrag/clickと干渉しないか

---

## v0.2.3 実装計画固定

v0.2.3では実装を増やさず、Whisper Push-to-Talk MVPの範囲と安全境界を固定する。

### v0.3.0で実装する範囲

- Push-to-Talk中に録音されたBlobをRust commandへ渡す
- Rust側で一時音声ファイルを作り、Whisper CLIを `std::process::Command` で起動する
- `whisperExecutablePath` と `whisperModelPath` を設定から使う
- transcriptのみをReactへ返す
- STT成功時は既存の `requestVoiceResponse(transcript)` 経路へ接続する
- STT失敗時は `voiceError` または短い案内へ戻し、アプリ全体は止めない
- 一時音声ファイルは成功/失敗に関係なく削除する

### v0.3.0で実装しない範囲

- wake word
- 常時マイク監視
- クラウドSTT
- 音声履歴保存
- 音声ファイルの永続保存
- TTS
- 音声コマンドによるファイル操作
- Whisper modelの自動ダウンロード
- ffmpeg同梱

### STT失敗時UI

- executable未設定: 「Whisper executable path を設定してください」
- model未設定: 「Whisper model path を設定してください」
- 実行失敗: 「Whisperを起動できませんでした」
- タイムアウト: 「音声の解析が時間内に終わりませんでした」
- transcript空: 何も聞き取れなかった扱いで、短く復帰する

### Field QA pending

- Windows実機でMediaRecorderが生成するMIME type
- Whisper CLI binaryごとの引数差
- モデルサイズごとの応答時間
- マイク許可ダイアログと権限拒否時の復帰
- 一時音声ファイルが失敗時にも削除されること
- long press中のUIとdrag/clickの干渉

---

## Phase 6a 実装詳細

### 追加した設定

```ts
voiceInputEnabled: boolean    // デフォルト false
voiceInputMode: "off" | "pushToTalk"  // デフォルト "off"
```

### Voice UI 状態

```
voiceOff         → 音声入力無効
voiceReady       → enabled だが操作していない
voiceListening   → 長押し中・録音中
voiceTranscribing→ STT 処理中
voiceResponding  → AI 返答中
voiceError       → エラー (3秒後に voiceReady/Off へ自動復帰)
```

---

## Phase 6b-real-1 実装詳細

### 実録音パイプライン

`src/systems/voice/useVoiceRecorder.ts`:

```ts
// Push-to-talk 中だけ録音
const { startRecording, stopRecording } = useVoiceRecorder({
  maxDurationMs: settings.maxRecordingMs,  // デフォルト 15000ms
  onBlob: (blob) => void requestVoiceFromBlob(blob),
  onError: (err) => voiceRecordingError(err),
});
```

**録音フロー:**
```
[長押し 0ms]   → 500ms タイマー開始
[長押し 500ms] → voiceListeningStart() + startRecording()
                  → navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                  → MediaRecorder.start(500ms chunks)
                  → voiceUIState: "voiceListening"
[離した]       → stopRecording()
                  → MediaRecorder.stop() → onstop → Blob
                  → stream.getTracks().stop()  ← マイク解放
                  → onBlob(blob)
                  → requestVoiceFromBlob(blob)
                  → voiceUIState: "voiceTranscribing"
[STT 完了]     → transcript → AI flow
                  → voiceUIState: "voiceResponding" → "voiceReady"
```

**安全保証:**
- `getTracks().stop()` でマイクを必ず解放
- maxDurationMs で自動停止 (長すぎる録音を防止)
- 録音エラー時は 3秒後に自動復帰

### STTAdapter 設計

```ts
// src/systems/voice/STTAdapter.ts
export type STTInput = Blob | ArrayBuffer;

export interface STTAdapter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  transcribe(input: STTInput): Promise<STTAdapterOutput>;
}
```

### STTAdapterManager

設定の `sttEngine` に応じてアダプターを選択:

```
sttEngine: "mock"       → MockSTTAdapter (常に available, mock transcript)
sttEngine: "whisperCli" → WhisperCliSTTAdapter (path 未設定なら unavailable)
                          unavailable → requestVoiceFromBlob で empty → fallback
```

### WhisperCliSTTAdapter (skeleton)

```ts
// src/systems/voice/WhisperCliSTTAdapter.ts
class WhisperCliSTTAdapter implements STTAdapter {
  isAvailable() {
    // executable path + model path が空でなければ "設定済み" とみなす
    return executablePath.trim().length > 0 && modelPath.trim().length > 0;
  }

  transcribe(_input) {
    // Phase 6b-real-2 で Rust sidecar 統合後に実装
    return { ok: false, error: "unavailable" };
  }
}
```

### requestVoiceFromBlob (useCompanionState)

```ts
// useCompanionState.ts
const requestVoiceFromBlob = async (blob: Blob) => {
  setVoiceUIState("voiceTranscribing");
  
  // STT
  const adapter = getSTTAdapter();
  let transcript = "";
  if (await adapter.isAvailable()) {
    const result = await adapter.transcribe(blob);
    if (result.ok) transcript = result.result.text.trim().slice(0, 200);
  }
  
  if (!transcript) { setVoiceUIState("voiceReady"); return; }
  
  // AI flow (requestVoiceResponse と同じルート)
  // trigger: "voice", voiceInput: transcript
  // SpeechPolicy → OllamaProvider/MockProvider/RuleProvider → QualityFilter → triggerSpeak
};
```

### 追加した設定

```ts
sttEngine: "mock" | "whisperCli"    // デフォルト "mock"
whisperExecutablePath: string        // デフォルト ""
whisperModelPath: string             // デフォルト ""
whisperTimeoutMs: number             // デフォルト 30000
maxRecordingMs: number               // デフォルト 15000
```

---

## Phase 6b-real-2 計画 — Rust sidecar 統合

### 課題

- WebView の MediaRecorder が出力する形式は `audio/webm` が主
- whisper.cpp CLI は `wav` 形式を期待することが多い
- WebM → WAV の変換が必要

### 変換方針

**Option A: Rust 側で変換 (推奨)**
```
Blob (WebM) → invoke("write_temp_audio", bytes) → Rust で temp WAV 書き出し
→ std::process::Command whisper.cpp → transcript → delete temp file
```

**Option B: WebView 側で WebM → PCM → WAV (複雑)**
```
AudioContext.decodeAudioData() → PCM → WAV ヘッダ付与 → Uint8Array → Rust へ
```

**Option C: FFmpeg bundling (将来)**
```
Tauri sidecar に ffmpeg を含める → webm → wav → whisper
```

推奨: Phase 6b-real-2 では **Option A** で実装し、Option C を将来検討。

### Rust コマンド skeleton

```rust
// src-tauri/src/lib.rs (v0.3.0 MVP)
#[tauri::command]
async fn transcribe_with_whisper(
    executable_path: String,
    model_path: String,
    audio_bytes: Vec<u8>,
    mime_type: String,
    timeout_ms: u64,
) -> Result<String, String> {
    // 1. temp dir に音声ファイルを書き出す
    // 2. 必要なら WAV 変換
    // 3. std::process::Command で whisper executable を呼ぶ (shell 経由でない)
    // 4. transcript を抽出
    // 5. temp file を必ず削除 (Drop / finally 相当)
    // 6. transcript を返す
}
```

**安全方針:**
- `std::process::Command` (shell 経由でない)
- 引数は配列として渡す (shell injection なし)
- タイムアウトを設ける
- temp file は処理後に必ず削除
- transcript のみ返す (生音声データを返さない)

---

## STT 候補比較

### 1. whisper.cpp (第一候補)

| 項目 | 評価 |
|---|---|
| 日本語精度 | ◎ (large-v3 で高精度) |
| ローカル実行 | ✅ |
| クラウド不要 | ✅ |
| Tauri との統合 | std::process::Command (CLI 経由) |
| モデルサイズ | tiny: ~75MB / small: ~244MB / medium: ~769MB |
| 速度 | tiny: 速い / small: 普通 / medium: 遅い (CPU) |
| ライセンス | MIT |
| Windows バイナリ | 配布可能 |

**推奨モデル:** `tiny` (速度優先) または `small` (精度優先)

### 2. Vosk

| 項目 | 評価 |
|---|---|
| 日本語精度 | △ (whisper.cpp より低め) |
| ローカル実行 | ✅ |
| モデルサイズ | 日本語モデル: ~48MB |
| streaming | ✅ (whisper.cpp より有利) |
| ライセンス | Apache 2.0 |

**評価:** リアルタイム streaming が必要な場合は候補。精度は whisper.cpp 優位。

### 3. Windows Speech Recognition API

| 項目 | 評価 |
|---|---|
| 日本語精度 | △ |
| ローカル実行 | ✅ (Windows 内蔵) |
| 追加インストール | 不要 |
| Tauri 統合 | Rust/windows-rs で WinRT API 経由 |

**評価:** 追加インストールなしで動くが精度が低い。将来の補助候補。

### 結論

**第一候補: whisper.cpp tiny モデル**
- 精度・日本語対応・ライセンス・モデルサイズのバランスが最良
- ただし GPU なしの CPU 推論は slow (tiny で ~2-5秒/発話)
- Phase 6b-real-2 で Rust sidecar 統合予定

---

## プライバシーフロー図

```
[長押し 500ms]
    ↓
voiceListeningStart() → UI: 録音中インジケーター
    ↓
getUserMedia({ audio: true }) ← ユーザーの明示操作のみ
    ↓
MediaRecorder.start()
    ↓
[離した / maxDurationMs 経過]
    ↓
MediaRecorder.stop() → Blob
stream.getTracks().stop() ← マイク即解放
    ↓
UI: voiceTranscribing
    ↓
STTAdapter.transcribe(blob) ← blob はここで使い捨て
    ↓ (成功)
transcript (テキストのみ)
    ↓
buildCompanionContext("voice", snapshot, events, settings, transcript)
    ↓
SpeechPolicy.canSpeak()
    ↓ (allowed)
AIProvider.respond(ctx) → QualityFilter → text
    ↓
triggerSpeak(text) → SpeechBubble
    ↓
UI: voiceReady
```

---

## 手動確認チェックリスト (Phase 6b-real-1 完了後)

- [ ] voiceInputEnabled false の状態で長押ししてもマイク許可要求が出ない
- [ ] Voice Input ON + pushToTalk + Mock で長押し → マイク許可要求 → 録音中ドット
- [ ] 離したら STT 処理 → 無明が返答する
- [ ] whisperCli + path 未設定で壊れない (STT が mock/fallback になる)
- [ ] maxRecordingMs 秒を超えると自動停止する
- [ ] クリック反応が壊れていない
- [ ] drag が壊れていない
- [ ] window position persistence が壊れていない
- [ ] MediaContext が壊れていない
- [ ] Transparency UI が壊れていない
- [ ] Ollama 未起動時 fallback が壊れていない
