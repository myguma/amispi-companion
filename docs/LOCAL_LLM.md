# Local LLM Integration

AmitySpirit Companion における ローカル LLM 統合の設計・実装記録。

---

## 概要

無明の発話生成はすべてローカルで完結する。クラウド AI への送信は禁止。

```
AIEngine: "none" | "mock" | "ollama"
デフォルト: "none" (ルールベース発話のみ)
```

---

## 実装済みコンポーネント (v0.1.26+)

### OllamaProvider (`src/companion/ai/OllamaProvider.ts`)

- エンドポイント: `http://localhost:11434/api/chat`
- 方式: POST, `stream: false`
- タイムアウト: `AbortController` (デフォルト 8,000ms)
- 可用性チェック: `GET /api/tags` (2,000ms タイムアウト)
- 未起動時: `{ shouldSpeak: false, reason: "unavailable" }` でサイレント fallback

### PromptBuilder (`src/systems/ai/PromptBuilder.ts`)

CompanionContext → `{ system: string, user: string }` に変換する。

**システムプロンプト原則:**
- 無明の名前・性格・発話ルールを規定
- 一文以内・80文字以内
- アシスタント文・自己紹介・医療語を明示禁止
- 日本語のみ

**ユーザーコンテキスト (プロンプトに含まれる情報):**
- 時刻帯 (朝/昼/夕/深夜)
- ActivityInsight.summary (抽象化済み活動概要)
- idle 時間 (5分以上の場合のみ)
- バックグラウンドメディア状態 (音楽/動画/なし)
- フォルダ状況 (Downloads/Desktop ファイル数しきい値)
- MemorySummary.shortNaturalSummary
- voiceInput (voice trigger の場合のみ: ユーザー発話テキスト)

**プロンプトに含めない情報:**
- 生 URL / ウィンドウタイトル / ファイル名
- ファイル内容 / クリップボード
- 生スクリーンショット / OCR 全文
- 生音声データ

### QualityFilter (`src/systems/ai/QualityFilter.ts`)

LLM 出力を発話前にフィルタリングする。

- 80文字超: 切り詰めて返す (完全拒否より優先)
- 禁止パターン: `/私はAI/`, `/AIアシスタント/`, `/お手伝いでき/`, `/整理しましょう/`,
  `/タスク/`, `/疲れています/`, `/病気/`, `/治療/`, `/依存/`, `/うつ/`,
  `/診断/`, `/精神/`, `/メンタル/`, `/セラピー/`, `/http/`, `/www\./`, `/\.com/`
- フィルタ後テキスト空: `{ ok: false, reason: "empty" }`

### AIProviderManager (`src/companion/ai/AIProviderManager.ts`)

engine に応じてプロバイダーを選択:

```
engine = "none"   → { shouldSpeak: false, reason: "engine_none" }
engine = "mock"   → MockProvider (開発用固定返答)
engine = "ollama" → OllamaProvider (lazy init, 設定変更時 resetOllamaProvider())
```

### MockProvider (`src/companion/ai/MockProvider.ts`)

開発・テスト用。固定の短い日本語返答を返す。

### RuleProvider (`src/companion/ai/RuleProvider.ts`)

ルールベースの fallback。engine="none" 時の静かな動作を担う。

---

## 設定項目 (v0.1.26+)

```ts
aiEngine: "none" | "mock" | "ollama"  // デフォルト: "none"
ollamaBaseUrl: string                 // デフォルト: "http://localhost:11434"
ollamaModel: string                   // デフォルト: "llama3.2:3b"
ollamaTimeoutMs: number               // デフォルト: 8000
```

設定 UI: `src/settings/pages/AIPage.tsx` (SettingsApp の "AI エンジン" タブ)

---

## Ollama 未起動時の動作 (fallback chain)

```
getAIResponse(input)
  → engine = "none"   → skip AI
  → engine = "ollama" → OllamaProvider.isAvailable() = false
    → { shouldSpeak: false, reason: "unavailable" }
  → AI が shouldSpeak: false を返す
  → useCompanionState: fireReaction("click") ?? pickDialogue("touch_reaction")
```

→ Ollama が落ちていても無明は必ず返答する。

---

## Voice Input との連携 (Phase 6a 以降)

voiceInput が CompanionContext に入った場合、PromptBuilder はこれを処理する。

```ts
// CompanionContext.voiceInput が存在する場合:
if (ctx.voiceInput) {
  contextLines.push(`ユーザーの声: ${ctx.voiceInput}`);
}
```

**重要:** voice trigger の返答であっても、無明は汎用 AI チャットボットにならない。
観測コンテキストを踏まえた控えめな反応に留める。

---

## 推奨モデル

| モデル | VRAM | 日本語 | 速度 | 用途 |
|---|---|---|---|---|
| llama3.2:3b | ~2GB | ◎ | 速い | デフォルト推奨 |
| gemma3:4b | ~3GB | ◎ | 普通 | 品質優先 |
| qwen2.5:3b | ~2GB | ◎ | 速い | 代替候補 |

日本語の短文生成では 3b クラスで十分。長文生成は QualityFilter で切り詰める。

---

## 今後の拡張予定

- Phase 6b: STTAdapter → transcript → voiceInput の経路
- Phase 7b: VLM (LLaVA / PaliGemma 系) との連携 (optional)
- Phase 8: TTS adapter (Piper / Windows TTS / VOICEVOX) との連携 (optional)
