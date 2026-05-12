# Local Observation Architecture

AmitySpirit Companion の観測・推定・発話パイプラインの設計。

---

## データフロー

```
Windows API / OS (Rust backend)
  GetForegroundWindow → activeApp, category
  GetLastInputInfo    → idle duration
  GetWindowRect + GetMonitorInfo → fullscreenLikely
  SHGetKnownFolderPath → desktop/downloads file counts
  sysinfo             → CPU / memory
  (future) MediaSession → media title/artist/status

          ↓  invoke("get_observation_snapshot")  ↓

ObservationSnapshot (src/observation/types.ts)
  timestamp, idle, activeApp, activeWindow,
  fullscreenLikely, folders, system, privacy

          ↓

inferActivity()  (src/companion/activity/inferActivity.ts)
  app category × fullscreen × idle × media signals
  → ActivityInsight { kind, confidence, reasons, summary }

          ↓

buildMemorySummary()  (src/companion/memory/buildMemorySummary.ts)
  MemoryEvent[] → CompanionMemorySummary
  { todayClickCount, recentSpeechCount, sessionCountToday, shortNaturalSummary }

          ↓

buildCompanionContext()  (src/systems/ai/buildCompanionContext.ts)
  CompanionContext {
    trigger, recentEvents, observation,
    activityInsight, memorySummary, settings
  }

          ↓

SpeechPolicy.canSpeak()  (src/companion/speech/SpeechPolicy.ts)
  → CanSpeakResult { allowed, reason? }

  (if NOT allowed: reaction system fallback)

          ↓

PromptBuilder  (src/systems/ai/PromptBuilder.ts)
  CompanionContext → prompt string (抽象化・フィルタ済み)

          ↓

AIProvider  (src/companion/ai/AIProviderManager.ts)
  none  → ""  (reaction/dialogue fallback)
  mock  → MockProvider (短い固定返答)
  ollama → OllamaProvider (http://localhost:11434)

          ↓

QualityFilter  (src/systems/ai/QualityFilter.ts)
  - 文字数チェック (80文字以内)
  - 禁止表現チェック
  - アシスタント文排除

          ↓

SpeechQueue  (src/companion/speech/SpeechQueue.ts)
  優先度: manual > system > observation > idle
  重複排除・rate limit

          ↓

CompanionUtterance { text, shouldSpeak, source }
  → triggerSpeak() → SpeechBubble / TinyWhisper / Cry
```

---

## ActivityInsight の推定ロジック

```ts
inferActivity(snapshot: ObservationSnapshot): ActivityInsight

// 推定規則 (優先度順)
away:         idleMs > 2h
coding:       category === "ide" || category === "terminal"
composing:    category === "daw"
watchingVideo: category === "media" || (category === "browser" && fullscreenLikely)
listeningMusic: category === "media" && !fullscreenLikely  (Phase 3+: mediaKind === "audio")
gaming:       category === "game" || deriveActivity() === "gamingLikely"
deepFocus:    category === "ide" && idleMs < 1min (active typing inferred)
browsing:     category === "browser" && !fullscreenLikely
scattered:    (多数のアプリ切り替え — Phase 3+ で検出)
idle:         idleMs 5-30min
breakLikely:  system === office/unknown && idle moderate
unknown:      その他
```

---

## 権限レベルと取得可能情報

| Level | 取得できる情報 |
|---|---|
| 0 | 時刻、idle概要、クリック |
| 1 | active app名、カテゴリ、fullscreen、idle duration |
| 2 | folder metadata (ファイル数・拡張子・パイル判定) |
| 3 | window title (要 windowTitleEnabled)、media session (Phase 3) |
| 4 | 画面キャプチャ (Phase 7、要 screenUnderstandingEnabled) |
| 5 | 音声入力 (Phase 6、要 voiceInputEnabled) |

---

## SpeechPolicy の判定

```
canSpeak(trigger, settings, snapshot, lastSpeechAt)

NOT allowed if:
- settings.doNotDisturb && trigger is not manual/voice
- settings.quietMode && trigger === "idle"
- settings.focusMode && interruptibility === "avoidDuringFocus"
- settings.suppressWhenFullscreen && snapshot.fullscreenLikely && !isManual
- countInLastHour() >= settings.maxAutonomousReactionsPerHour && !isManual
- lastSpeechAt && Date.now() - lastSpeechAt < MIN_SPEECH_INTERVAL_MS && !isManual
```

---

## PromptBuilder の方針

プロンプトに含めてよい情報:

```
- 現在の活動種別 (abstracted)
- idle 時間バケツ
- フォルダの混雑度 (abstracted)
- 今日の会話回数
- セッション情報
- 時刻帯
```

プロンプトに含めてはいけない情報:

```
- 生URL
- ウィンドウタイトル (許可なし)
- ファイル名
- メディアタイトル・アーティスト名 (許可なし)
- 生スクリーンショット
- OCR全文
```

プロンプトに必ず含める制約:

```
- キャラクター性格指示 (短く、控えめ、観察者)
- 発話禁止パターン
- 文字数制限 (80字以内)
- 日本語のみ
- 一文以内
- アシスタント禁止
```

---

## OllamaProvider の仕様

```
エンドポイント: http://localhost:11434/api/chat
model: settings.ollamaModel (default: "llama3.2:3b")
stream: false
timeout: settings.ollamaTimeoutMs (default: 8000ms)
AbortController でキャンセル可能
未起動 → isAvailable() false → fallback
```

エラー処理:
```
1. isAvailable() チェック (HEAD リクエスト)
2. タイムアウト → fallback
3. JSON パース失敗 → fallback
4. QualityFilter 失敗 → fallback
5. fallback: reaction system → dialogue system
```
