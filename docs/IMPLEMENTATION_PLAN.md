# AmitySpirit Companion — Local Observation Companion Implementation Plan

作成日: 2026-05-12
対象リポジトリ: `myguma/amispi-companion`
対象プロダクト: AmitySpirit Companion / 無明
開発方針: Local-first / Permissioned Observation / Quiet Companion / No Autonomous Operation

---

## 0. Executive Summary

AmitySpirit Companion は現在、透明なデスクトップ常駐ウィンドウ上で、キャラクター表示・クリック反応・睡眠状態・発話・観測反応・音・設定・自動更新を備えた「静かに見守る反応ウィジェット」として成立している。

しかし現状の AIProvider は `MemoryEvent[]` のみを受け取る薄い設計であり、現在の PC 状態・再生中メディア・ユーザーの行動パターンを統合して発話する「頭」にはなっていない。

本計画の目的は、AmitySpirit Companion を以下の存在に進化させることである。

> ユーザー本人の明示的許可のもと、PC 上の活動をローカルに観測し、現在の作業・視聴・制作・調査・休憩状態を推定し、短く控えめに反応するデスクトップ常駐コンパニオン。

無明を汎用 AI アシスタント、PC 操作エージェント、タスク管理ツール、監視アプリにはしない。

---

## 1. Current State (v0.1.27)

**GitHub Actions / Windows Installer build: ✅ 成功済み**

### 実装済み (v0.1.27 時点)

- Tauri v2 + React 18 + TypeScript + Vite + Rust (Windows-only)
- 透明・フレームレス・常時最前面ウィンドウ (200×300px)
- 状態マシン: idle / touched / sleep / waking / thinking / speaking
- ObservationSnapshot (Windows API: GetForegroundWindow / GetLastInputInfo / SHGetKnownFolderPath / sysinfo)
- **MediaContext**: バックグラウンドの音楽・動画アプリ検出 (Spotify/VLC 等)
- Reaction System: trigger × cooldown × priority × displayMode × cry
- CryEngine (Web Audio API シンセ)
- SpeechBubble / TinyWhisper / TinyWhisper displayMode
- **設定ウィンドウ**: Transparency v2 (ライブパネル・Ollama 接続確認) / Behavior / AI エンジン
- Privacy Gate / Permission Level 0-4
- localStorage MemoryEvent log (500件)
- **CompanionContext / inferActivity / SpeechPolicy / SpeechQueue / PromptBuilder / QualityFilter**
- **OllamaProvider**: ローカル LLM 接続 (engine=none/mock/ollama 切り替え)
- **ウィンドウ位置保存・復元**: settings.json に書き込み、起動時に復元
- 自動更新 / タスクトレイ / グローバルショートカット
- scripts/bump-version.sh でバージョン一括更新
- pre-push フック: タグ push 前に check.yml の結果を確認

---

## 2. Product Vision

### 目指す姿

> PC 上の活動を、本人の許可のもとローカルで観察し、今なにをしているか — 作っているのか、調べているのか、見ているのか、聴いているのか、迷っているのかを控えめに把握し、短く反応する存在。

### 体験例

```
DAW が開いている         → 「音の部屋にいるね。」
ブラウザ調査が長い        → 「調べもの、渦になってない？」
動画視聴中              → 「見てる間は静かにしてる。」
深夜に idle             → 「夜が伸びてる。」
Downloads 溜まっている    → 「Downloadsが少し積もってる。」
```

### 目指さない姿

- 汎用 AI チャットボット
- 生産性管理・タスク強制アプリ
- 医療・精神状態診断ツール
- 監視アプリ / PC 自動操作エージェント
- クラウド AI エージェント

---

## 3. Core Principles

1. **Local-first**: 観測・推定・記憶・発話生成はすべてローカル
2. **Permissioned Observation**: 明示許可した範囲のみ観測
3. **Transparent Awareness**: 何を見ているかをユーザーが常に確認できる
4. **No Hidden Capture**: 隠れて画面・音声・入力を収集しない
5. **No Autonomous Operation**: ファイル操作・コマンド実行・アプリ操作しない
6. **Quiet by Default**: 「何を言うか」と同じくらい「いつ黙るか」を重視
7. **No Diagnosis**: 医療的・精神的診断を行わない

---

## 4. Target Architecture

```
ObservationSnapshot
    ↓
inferActivity()           → ActivityInsight (kind, confidence, reasons, summary)
    ↓
buildMemorySummary()      → CompanionMemorySummary (clicks, speech, break, summary)
    ↓
buildCompanionContext()   → CompanionContext (trigger + insight + summary + settings)
    ↓
SpeechPolicy.canSpeak()   → CanSpeakResult
    ↓ (if allowed)
PromptBuilder             → prompt string
    ↓
AIProvider (none/mock/ollama)
    ↓
QualityFilter             → sanitized text
    ↓
SpeechQueue               → CompanionUtterance (priority, dedup)
    ↓
SpeechBubble / TinyWhisper / Cry
```

---

## 5. Implementation Phases

### Phase 0 — Planning and Guardrails ✅ 完了
- docs/IMPLEMENTATION_PLAN.md
- docs/SAFETY_AND_PRIVACY_BOUNDARIES.md
- docs/LOCAL_OBSERVATION_ARCHITECTURE.md
- docs/NEXT_SESSION.md

### Phase 1 — Core Context and Speech Control ✅ 完了 (v0.1.26)
- `src/companion/activity/inferActivity.ts` — InferredActivity / ActivityInsight
- `src/companion/memory/buildMemorySummary.ts` — CompanionMemorySummary
- `src/companion/speech/SpeechPolicy.ts` — canSpeak()
- `src/companion/speech/SpeechQueue.ts` — 優先度・重複排除
- `src/systems/ai/buildCompanionContext.ts` — CompanionContext 構築
- `src/companion/ai/types.ts` — AIEngine / AITrigger / CompanionContext / CompanionUtterance 追加
- `src/hooks/useCompanionState.ts` — 新 AI フロー接続

### Phase 2 — PromptBuilder and Local LLM ✅ 完了 (v0.1.26)
- `src/systems/ai/PromptBuilder.ts`
- `src/systems/ai/QualityFilter.ts`
- `src/companion/ai/OllamaProvider.ts`
- `src/companion/ai/AIProviderManager.ts` 書き直し
- `src/settings/pages/AIPage.tsx`
- settings に aiEngine / ollamaBaseUrl / ollamaModel / ollamaTimeoutMs 追加

### Phase 3 — Media Awareness ✅ 完了 (v0.1.27)
- `MediaContext` を ObservationSnapshot に追加 (Rust / TypeScript)
- `detect_media()`: sysinfo でバックグラウンドの音楽・動画アプリを検出
- `inferActivity.ts`: バックグラウンド音楽検出ケース追加
- `PromptBuilder.ts`: 音楽・動画再生情報をプロンプトに追加

### Phase 4 — Transparency UI v2 ✅ 完了 (v0.1.27)
- `TransparencyPage.tsx` 全面書き直し
- `LiveStatusPanel`: 活動状態リアルタイム表示・更新ボタン
- `OllamaStatus`: Ollama 接続確認コンポーネント
- AI エンジン状態セクション
- 「見ていないもの」に画面キャプチャ・マイク・クリップボードを明示

### Phase 5 — Window Position Persistence ✅ 完了 (v0.1.27)
- `PersistedSettings` に `window_x / window_y` 追加
- `save_window_position` Tauri コマンド追加
- 起動時に保存位置を復元 (範囲チェックあり)
- ドラッグ終了後 100ms で位置を保存

### Phase 6a — Voice Input Foundation ✅ 完了 (v0.1.28)

- `src/settings/pages/VoicePage.tsx` — Voice ON/OFF / mode / プライバシー説明
- `src/settings/types.ts` — `voiceInputMode: "off" | "pushToTalk"` 追加
- `src/hooks/useCompanionState.ts` — `requestVoiceResponse(transcript)` 追加
- `src/App.tsx` — push-to-talk エントリポイント (長押し)
- `docs/VOICE_INTERACTION.md`

### Phase 6a.5 — Context Wiring and Input Stabilization ✅ 完了 (v0.1.29)

- AIProvider.respond(ctx: CompanionContext) — インターフェース刷新
- OllamaProvider から EMPTY_SNAPSHOT 依存除去
- contextToProviderInput() ブリッジ削除
- requestVoiceResponse に finally ブロック追加
- isDragging → PTT タイマーキャンセル

### Phase 6b-real-1 — Local STT Recording Foundation ✅ 完了 (v0.1.30)

- `src/systems/voice/useVoiceRecorder.ts` — Push-to-talk 実録音フック
- `src/systems/voice/STTAdapter.ts` — STTInput 型追加 (Blob | ArrayBuffer)
- `src/systems/voice/MockSTTAdapter.ts` — STTInput 対応
- `src/systems/voice/WhisperCliSTTAdapter.ts` — skeleton (path 設定チェック)
- `src/systems/voice/STTAdapterManager.ts` — sttEngine 設定で切替
- `src/hooks/useCompanionState.ts` — requestVoiceFromBlob / voiceListeningStart / voiceRecordingError
- `src/settings/types.ts` — sttEngine / whisper* / maxRecordingMs 追加
- `src/settings/pages/VoicePage.tsx` — STT エンジン選択 UI
- `src/App.tsx` — 実録音パイプラインへ切替

### Phase 6b-real-2 — WhisperCli Rust Sidecar Integration ← **次**

- `src-tauri/src/voice/mod.rs` — `transcribe_with_whisper` Tauri コマンド
- WebM Blob → bytes → Rust → 一時 WAV 書き出し
- `std::process::Command` で whisper CLI 呼び出し (shell injection なし)
- 処理後に一時ファイル必ず削除
- WhisperCliSTTAdapter.transcribe() を実装 (Tauri invoke)
- docs 更新

### Phase 6c — Voice UX Hardening

- 録音中の視覚フィードバック強化 (パルスアニメーション等)
- DND / Quiet / Focus との整合確認
- 連続録音防止
- 無音録音の検出と fallback

### Phase 7a — Screen Understanding Planning Only

- 実際のキャプチャ実装はまだしない
- `screenCaptureMode: "off" | "selectedWindow" | "fullScreen"` 設定
- Transparency UI に Screen / OCR 状態表示
- `docs/SCREEN_UNDERSTANDING.md` 作成

### Phase 7b — Optional Local Screen Capture Prototype

- 明示許可時のみ / 生画像保存禁止 / local VLM のみ
- abstracted summary のみ CompanionContext に渡す

### Phase 8 — Optional TTS / Voice Output

- `ttsEnabled` デフォルト OFF
- TTS adapter interface
- Windows TTS / Piper / VOICEVOX 候補
- 短文のみ読み上げ / テキスト表示は必ず残す

---

## 6. New Settings (Phase 2+)

```ts
aiEngine: "none" | "mock" | "ollama";   // デフォルト "none"
ollamaModel: string;                    // "llama3.2:3b"
ollamaBaseUrl: string;                  // "http://localhost:11434"
ollamaTimeoutMs: number;                // 8000

mediaAwarenessEnabled: boolean;         // false
screenUnderstandingEnabled: boolean;    // false
voiceInputEnabled: boolean;             // false
ttsEnabled: boolean;                    // false
```

---

## 7. Non-goals

本計画では以下を実装しない:

- cloud AI (OpenAI / Anthropic / Gemini 等)
- 画面・音声のクラウド送信
- 自動ファイル整理・コマンド実行
- キーロガー・常時マイク監視
- 医療・精神状態診断
- ユーザー行動スコア化
- テレメトリ・外部ログ送信

---

## 8. Claude Code Operating Rules

### Must
- Phase 順に実装する
- 各 Phase 後に `npm run build` を実行する
- build 失敗時は次 Phase に進まない
- 既存挙動を壊さない
- fallback を維持する
- privacy boundary を守る

### Must Not
- cloud AI を追加しない
- telemetry を追加しない
- 自動ファイル操作を追加しない
- キーボード入力監視を追加しない
- 常時マイク監視を追加しない
- 生スクリーンショットを保存しない
- OCR全文を保存しない
- キャラクター人格を勝手に作り込まない
