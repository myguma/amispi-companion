# Voice Interaction — 音声入力設計と STT 候補

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
| Phase 6b | STTAdapter interface / MockSTTAdapter / Whisper 候補 | 🔜 次 |
| Phase 6c | UX 強化・フィードバック・DND 整合 | 📋 予定 |

---

## Phase 6a 実装詳細

### 追加した設定

```ts
voiceInputEnabled: boolean    // デフォルト false
voiceInputMode: "off" | "pushToTalk"  // デフォルト "off"
```

### 追加した UI

- `settings/pages/VoicePage.tsx`: Voice ON/OFF / mode 選択 / プライバシー説明
- `settings/SettingsApp.tsx`: "音声" タブ追加
- `App.tsx`: キャラクター長押し (500ms) で push-to-talk 発火

### Voice UI 状態

```
voiceOff         → 音声入力無効
voiceReady       → enabled だが操作していない
voiceListening   → 長押し中 (録音中 — Phase 6b 以降で実際の録音)
voiceTranscribing→ STT 処理中
voiceResponding  → AI 返答中
voiceError       → エラー
```

### Phase 6a の mock 動作

1. キャラクターを 500ms 以上長押し
2. `mock transcript = "ねえ、今何してる？"` を発火
3. `requestVoiceResponse(transcript)` → CompanionContext に voiceInput を設定
4. trigger: "voice" で AI flow (none/mock/ollama) を通す
5. QualityFilter → 返答を表示

---

## Phase 6b — STTAdapter 設計

### インターフェース

```ts
// src/systems/voice/STTAdapter.ts
export type STTResult = {
  text: string;
  confidence?: number;
  durationMs?: number;
};

export interface STTAdapter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  transcribe(audioBlob: Blob): Promise<STTResult>;
}
```

### MockSTTAdapter

```ts
// src/systems/voice/MockSTTAdapter.ts
export class MockSTTAdapter implements STTAdapter {
  readonly name = "mock";
  async isAvailable() { return true; }
  async transcribe(_blob: Blob): Promise<STTResult> {
    await new Promise(r => setTimeout(r, 300)); // 模擬遅延
    return { text: "ねえ、今何してる？", confidence: 1.0, durationMs: 300 };
  }
}
```

---

## STT 候補比較

### 1. whisper.cpp (第一候補)

| 項目 | 評価 |
|---|---|
| 日本語精度 | ◎ (large-v3 で高精度) |
| ローカル実行 | ✅ |
| クラウド不要 | ✅ |
| Tauri との統合 | sidecar (外部バイナリ) または CLI 経由 |
| モデルサイズ | tiny: ~75MB / small: ~244MB / medium: ~769MB |
| 速度 | tiny: 速い / small: 普通 / medium: 遅い (CPU) |
| ライセンス | MIT |
| Windows バイナリ | 配布可能 |

**推奨モデル:** `tiny` (速度優先) または `small` (精度優先)

**統合方式 (Tauri):**
```rust
// src-tauri/src/voice/mod.rs
// Tauri sidecar として whisper-cli を bundler に含める
// または: invoke コマンドで一時 WAV ファイルを書いて CLI 呼び出し
// 一時ファイルは処理後に削除する
```

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

**第一候補: whisper.cpp tiny モデル** (sidecar として bundler に含める)
- 精度・日本語対応・ライセンス・モデルサイズのバランスが最良
- ただし GPU なしの CPU 推論は slow (tiny で ~2-5秒/発話)

---

## 録音の実装方針 (Phase 6b)

### フロントエンド側

```ts
// MediaRecorder API (ブラウザ API, Tauri WebView で利用可能)
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(stream => {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      stream.getTracks().forEach(t => t.stop()); // マイク解放
      const result = await sttAdapter.transcribe(blob);
      requestVoiceResponse(result.text);
    };
    recorder.start();
    // mouseup で recorder.stop()
  });
```

**重要:**
- `stream.getTracks().forEach(t => t.stop())` でマイクを必ず解放する
- blob は transcribe() 内で即使用し、持続的に保持しない
- 一時ファイルに書く場合 (Whisper CLI 経由) は処理後に即削除

### Rust sidecar 側 (whisper.cpp)

```rust
// 一時ファイルを tempdir に書き → whisper-cli を spawn → 結果を返す → ファイル削除
// src-tauri/src/voice/whisper.rs
```

---

## プライバシーフロー図

```
[長押し開始]
    ↓
MediaRecorder.start() ← マイクアクセス開始 (Push-to-talk のみ)
    ↓
[離した]
    ↓
MediaRecorder.stop() → Blob
    ↓
stream.getTracks().stop() ← マイク即解放
    ↓
STTAdapter.transcribe(blob)
    ↓ (blob は使い捨て)
STTResult { text }
    ↓
requestVoiceResponse(text) → CompanionContext.voiceInput
    ↓ (text は一時保持のみ)
AI → QualityFilter → SpeechBubble
```
