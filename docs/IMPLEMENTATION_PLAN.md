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

### Phase 0 — Planning and Guardrails ✅
- docs/IMPLEMENTATION_PLAN.md
- docs/SAFETY_AND_PRIVACY_BOUNDARIES.md
- docs/LOCAL_OBSERVATION_ARCHITECTURE.md
- docs/NEXT_SESSION.md

### Phase 1 — Core Context and Speech Control
新規:
- `src/companion/activity/inferActivity.ts` — ActivityInsight
- `src/companion/memory/buildMemorySummary.ts` — CompanionMemorySummary
- `src/companion/speech/SpeechPolicy.ts` — canSpeak()
- `src/companion/speech/SpeechQueue.ts` — 優先度・重複排除
- `src/systems/ai/buildCompanionContext.ts` — CompanionContext 構築

変更:
- `src/companion/ai/types.ts` — AIEngine / AITrigger / CompanionContext / CompanionUtterance 追加
- `src/hooks/useCompanionState.ts` — snapshot 受け取り・新 AI フロー接続
- `src/App.tsx` — snapshot を useCompanionState に渡す

完了条件:
- npm run build が通る
- クリック反応が壊れていない
- thinking で固まらない
- AI engine none で fallback が動く

### Phase 2 — PromptBuilder and Local LLM
新規:
- `src/systems/ai/PromptBuilder.ts`
- `src/systems/ai/QualityFilter.ts`
- `src/companion/ai/OllamaProvider.ts`
- `src/settings/pages/AIPage.tsx`

変更:
- `src/companion/ai/AIProviderManager.ts` — ollama 追加
- `src/settings/types.ts` — aiEngine / ollama* 追加
- `src/settings/defaults.ts`
- `src/settings/SettingsApp.tsx` — AI タブ追加

完了条件:
- Ollama 未起動 → fallback
- Ollama 起動 → 短い日本語発話
- 発話 80 文字以内
- アシスタント文が抑制される
- cloud AI なし・外部送信なし

### Phase 3 — Media Awareness
- MediaContext / MediaSessionObserver (Rust)
- ObservationSnapshot に統合
- Transparency UI 更新

### Phase 4 — Transparency UI v2
- 現在観測状態パネル
- AI engine / Ollama 状態表示
- screen/mic/cloud の OFF 明示

### Phase 5 — Window Position Persistence
- ウィンドウ位置保存・復元
- 画面外補正

### Phase 6 — Voice Input (Push-to-talk)
- 常時マイク監視なし
- 操作中のみ録音
- local STT → CompanionContext

### Phase 7 — Optional Screen Understanding
- デフォルト OFF
- raw screenshot 保存禁止
- local VLM のみ

### Phase 8 — Optional TTS
- TTS OFF で既存挙動維持
- 短文のみ読み上げ

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
