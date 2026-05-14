# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-15 (v1.3.0)**

---

## 現在のステータス

**バージョン:** v1.3.0
**フェーズ:** Visible Local Observer Companion — App Classification / custom classification
**全体進捗:** 約 99%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照
**記憶設計:** docs/MEMORY_AND_DATA_CONTROL.md 参照
**QA 記録:** docs/FIELD_QA_NOTES.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v1.3.0)
✅ cargo build  → Finished dev profile (v1.3.0)
✅ cargo test app_classification → passed
✅ git diff --check → clean
✅ GitHub Actions / Windows Installer → v1.2.0 success (run 25876320136)
🔲 v1.3.0 Release workflow → push後に確認必要
```

---

## 完了済みフェーズ (v1.0.5まで)

| Phase / Milestone | 内容 | 状態 |
|---|---|---|
| Phase 0–5 | 土台・観測・PromptBuilder・MediaContext・ウィンドウ位置 | ✅ 完了 |
| Phase 6a / 6a.5 / 6b-real-1 | Voice Foundation・実録音・STTAdapter基盤 | ✅ 完了 |
| Milestone A 第1段階 | ActivityInsight精度・DailySummary・PromptBuilder改善・TransparencyUI | ✅ v0.1.31 |
| Milestone A 第2段階 | RuleProvider文脈強化・autonomous speech精度向上・発話制御UI | ✅ v0.1.32 |
| Milestone B 第1段階 | Memory Viewer UI・記憶削除機能・memoryStore拡張 | ✅ v0.1.33 |
| Milestone B 第2段階 | Character State Expression・状態別CSSアニメーション・VoiceUIState統合 | ✅ v0.1.34 |
| Field QA Fixes Round 1〜Root Cause | CORS根本修正・window resize・hit test | ✅ v0.1.35〜v0.1.36 |
| Companion Intelligence & Window Arch | AI-first自律発話・PromptBuilder/QualityFilter強化・3秒遅延キャプチャ | ✅ v0.1.37 |
| Hotfix rounds | CharacterLayout・ContextMenu・HitTest・SpeechBubble・Onboarding・MemoryRetention | ✅ v0.1.38〜v0.1.54 |
| Release Polish | Node.js 24 opt-in・Update/Ollama案内・Known Issues | ✅ v0.1.55 |
| Daily-use Beta | docs/checklist/known issues整理 | ✅ v0.2.0 |
| Minimal Emotion Sprite Set | emotion prop・safe sprite fallback | ✅ v0.2.1〜v0.2.2 |
| Whisper Push-to-Talk MVP | Rust commandでローカルWhisper CLIへ接続 | ✅ v0.3.0〜v0.3.1 |
| Release Candidate / Stable | docs整理、field QA pending | ✅ v1.0.0-rc.1 / v1.0.0 |
| Hotfix v1.0.1〜v1.0.5 | UpdateBadge・FFmpeg・transcript preview・voice interaction・settings consistency・prompt汚染修正 | ✅ v1.0.1〜v1.0.5 |

---

## v1.0.6〜v1.3.0 完了済み

| バージョン | 内容 | 状態 |
|---|---|---|
| v1.0.6 | Whisper言語指定(-l ja)、sleep発話、filename-derived signals | ✅ field QA pending |
| v1.0.7 | Observation Timeline、Observation Center (observationPage) | ✅ field QA pending |
| v1.0.8 | Memory Mode、長期記憶候補、記録層の明示化 | ✅ field QA pending |
| v1.1.0 | ObservationSignal層、Watchful Mode、診断ページ | ✅ field QA pending |
| v1.1.1 | 実機QA hotfix: Timeline同期・sleep発話独立・preset UI・signals接続・note管理 | ✅ field QA pending |
| v1.1.2 | 発話バリエーション改善・AppCategory強化・OpenAI provider | ✅ field QA pending |
| v1.1.3 | AI runtime trace・OpenAI test・provider/model badge・speech_shown AI metadata | ✅ field QA pending |
| v1.1.4 | OpenAI 429分類・fallback表示明確化・speech bubble全文パネル | ✅ field QA pending |
| v1.2.0 | ReactionIntent system・intent trace・低品質fallback削減 | ✅ automated QA passed / field QA pending |
| v1.3.0 | App Classification拡張・classification reason・custom classification UI | ✅ automated QA passed / field QA pending |

## v1.3.0 実装詳細

### 変更内容

- `AppCategory` に `music` / `chat` / `file_manager` / `installer` / `ai_chat` / `ai_assistant` / `ai_search` を追加
- Rust `classify_app()` を拡張し、ChatGPT / Claude / Perplexity / Copilot / Cursor / Windsurf / Zed / Obsidian / Logseq / Figma / Photoshop / Illustrator / Blender / 7-Zip / WinRAR / Bandizip / Bitwig / Ableton / Reaper / VSCode / terminal / browser / chat / document を分類
- `classificationReason` / `classificationSource` を active app snapshot と active app debug に追加
- `currentSnapshotStore` を追加し、Debug / Diagnostics / Observation Page で current process/category/reason を確認可能
- `customAppClassifications: Record<string, AppCategory>` を追加
- Observation Page に process名単位のユーザー定義分類UIを追加。保存されるのは process名と category のみ
- classification table の Rust unit test を追加

### Field QA で確認すべき項目 (v1.3.0)

- unknown app が Debug / Diagnostics / Transparency で process名と `no_rule_match:<process>` reason 付きで見えるか
- Cursor / Windsurf / Zed / Obsidian / Figma / Blender / Bitwig / Ableton / Reaper などが想定カテゴリになるか
- ChatGPT / Claude / Perplexity / Copilot が `ai_chat` / `ai_assistant` / `ai_search` 系で見えるか
- Observation Page で現在の process をユーザー定義分類に変更でき、次回 snapshot で category が上書きされるか
- custom classification が保存・削除できるか
- raw window title / raw filename / file content が custom classification に保存されていないか

## 次に着手する候補

- v1.3.x hotfix: v1.3.0 field QA で分類漏れ・UI保存不具合・reason欠落が出た場合の最小修正
- 問題がなければ v1.4.0 Memory v2 へ進む

## v1.2.0 実装詳細

### 変更内容

- `ReactionIntent` 型を追加し、発話前に `quiet_presence` / `observation` / `suggestion` / `question` / `memory_reflection` / `creative_prompt` / `technical_prompt` / `cleanup_prompt` / `focus_support` / `playful` / `careful_warning` を選択
- `buildCompanionContext()` が activity / ObservationSignal / recent events / voice or text input から intent を付与
- PromptBuilder が intent を LLM prompt に含め、OpenAI / Ollama の発話意図を明示
- RuleProvider が intent に応じて creative / technical / cleanup / focus / memory / playful の発話プールを選択
- AI runtime trace / DebugPage / DiagnosticsPage / AIPage に reactionIntent を表示
- `speech_shown` metadata に `reactionIntent` を保存し、Memory export で provider/model/status/fallbackReason と一緒に追跡可能
- 観測 reaction fallback でも `rule` / `fallback` / `reactionIntent` / `reaction_fallback` を記録
- `静かだね` / `作業中？` / `ここにいる` / `呼んだ？` / `ん` / `...` 等の低品質fallback文を削除または強cooldownの文へ置換

### Field QA で確認すべき項目 (v1.2.0)

- 自律発話後、Debug / Diagnostics に reactionIntent が表示されるか
- Memory export の `speech_shown` に `reactionIntent` / `aiProvider` / `aiModel` / `aiStatus` が入るか
- OpenAI / Ollama / RuleProvider のいずれでも provider/model/status/intent/fallbackReason を追跡できるか
- 30分常駐しても `静かだね` / `作業中？` / `ここにいる` / `呼んだ？` / `ん` / `...` が短時間連発しないか
- observation reaction fallback の発話でも `reactionIntent` と `reaction_fallback` が残るか
- voice/text の local_router 応答でも `reactionIntent` が `speech_shown` に残るか

## v1.1.4 Auth / Billing Notes

- ChatGPT Web/Desktop のログインセッション流用は実装しない。
- OpenAI API は ChatGPT subscription とは別管理。API利用にはOpenAI API keyとAPI側billing/quotaが必要。
- このアプリは OpenAI API key 方式のみ対応する。
- `429` は API billing / quota / rate limit / model access を確認する。
- ChatGPT auth / unofficial cookie auth / browser session scraping は、安全性・安定性・保守性のため非目標。
- raw filename / raw window title / transcript履歴 / file content はOpenAIへ送信しない。

---

## v1.1.2 実装詳細

### 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/companion/ai/RuleProvider.ts` | 発話プール全面拡充。unknown対応。suggestion/creative/technical追加 |
| `src/companion/ai/types.ts` | `AIEngine`に"openai"追加。`CompanionContext.signals`追加 |
| `src/companion/ai/OpenAIProvider.ts` | NEW: OpenAI API呼び出し。payload previewエクスポート |
| `src/companion/ai/AIProviderManager.ts` | openaiブランチ追加。失敗時Ollama→Rule fallback |
| `src/companion/activity/inferActivity.ts` | `InferredActivity`にdesign/notes/document追加。推論ロジック追加 |
| `src/observation/types.ts` | `AppCategory`にdesign/notes/archive_tool/document追加 |
| `src/systems/ai/buildCompanionContext.ts` | `buildObservationSignals`を呼んでsignalsをContextに追加 |
| `src/systems/ai/PromptBuilder.ts` | topSignalをプロンプトに付加 |
| `src/settings/types.ts` | `AIEngine`に"openai"。openai*設定フィールド追加 |
| `src/settings/defaults.ts` | openai*デフォルト値追加 |
| `src/settings/pages/AIPage.tsx` | OpenAIエンジン選択肢・設定UI・警告文追加 |
| `src/settings/pages/DebugPage.tsx` | OpenAI payload preview追加 |
| `src/settings/pages/DiagnosticsPage.tsx` | OpenAI使用時のプライバシー境界表示更新 |
| `src/settings/pages/TransparencyPage.tsx` | aiEngineにopenai表示追加 |
| `src-tauri/src/observation/mod.rs` | `classify_app`にdesign/notes/document/archive_toolカテゴリ追加 |
| `package.json` / `Cargo.toml` / `tauri.conf.json` | v1.1.2に更新 |

### C群 — v1.1.3以降に持ち越す設計メモ

#### C1: Filename Samples (explicit ON, default OFF)

**設計:**
- `settings.filenameSamplesEnabled: boolean` (default: false) を追加
- Rust `scan_folder()` 内で `file_names_lower` から最大10件をサンプリング
- `FolderSummary` に `filenameSamples: Vec<String>` を追加 (settings ON時のみ)
- TS側 `ObservationSnapshot.folders.*.filenameSamples?: string[]` に対応
- **OpenAIへは送らない** (ObservationSignal変換後のみ使用)
- 表示はDebugPageのみ (DiagnosticsPage / 発話候補には使わない)

**リスク:** Rust側FolderSummary構造変更が必要。TS型も変更が必要。テスト不足のまま追加しない。

#### C2: OS Credential Store (OpenAI API key)

**設計:**
- Windows: `Windows Credential Manager` API 経由で保存
- Rust側に `tauri-plugin-stronghold` または `keyring` crateを使用
- 現状: localStorage平文保存 + 警告文表示 (v1.1.2時点の状態)
- 移行: 旧localStorage keyを読んで新ストアに移し、localStorageから削除

**注意:** Tauriプラグイン追加が必要。Cargo.toml変更 + Rust実装が必要。

---

## v1.1.2 Field QA で確認すべき項目

- unknownカテゴリのアプリ (例: Figma, Obsidian) 使用中に自律発話が出るか
- 同じ発話が繰り返されにくくなったか (historyバッファ4件)
- Watchful Mode中に suggestion/check-in 系の発話が出るか
- DebugPage の ObservationSignals に topSignal が表示されるか
- AIPage > OpenAI 選択時にAPI key警告文が表示されるか
- OpenAI engine 選択 + key未入力 → Ruleにフォールバックするか
- DebugPage の「OpenAI 送信 Payload Preview」にrawFilenames=falseが表示されるか
- DiagnosticsPage のプライバシー境界がOpenAI使用時に橙色警告になるか
- TransparencyPage のAIエンジン表示が "OpenAI" になるか

---

## v1.1.1 実装詳細 (実機QA hotfix)

### 修正した問題

| 問題 | 原因 | 修正 |
|---|---|---|
| Observation Timeline空 | observationTimelineStoreにBroadcastChannelがなかった | BroadcastChannel追加でWindowsを同期 |
| Sleep発話が止まる | scheduleSleepSpeechがautonomousSpeechEnabled依存 | sleepSpeechEnabledのみで独立制御 |
| Watchfulプリセット非同期 | ボタンに現在設定の検出・ハイライトなし | isWatchfulPreset等の判定+ハイライト追加 |
| Watchful設定矛盾 | quietMode/doNotDisturbが解除されなかった | Watchful押下で明示的にリセット |
| ObservationSignal未接続 | 定義のみ・どこにもimportされていなかった | poll→currentSignalStore→BroadcastChannel→Debug/Diagnostics |
| sleep_entered未記録 | App.txsに追加なし | state変化watchでaddObservationEvent |
| companion_reacted未記録 | speechText変化を監視していなかった | speechText変化watchでaddObservationEvent |
| note_saved確認・削除UIなし | MemoryPageに専用UIがなかった | getSavedMemoryNotes()/deleteEventById()追加+一覧UI |
| filename UI誤解 | disabledチェックボックスが実装済みシグナルを隠蔽 | 実装済み/未実装の区別を明記 |

### 新規ファイル

- `src/systems/observation/currentSignalStore.ts`: ObservationSignalの揮発ストア(BroadcastChannel)

### Field QA で確認すべき項目 (v1.1.1)

- Watchful / バランス / 静かに の選択中表示が正しくハイライトされるか
- Watchful → 静かに → Watchful の切り替えで設定が矛盾しないか
- sleep後も sleepSpeechEnabled=true なら低頻度発話するか (autonomousSpeechEnabled=falseでも)
- 設定 > 観察 > 最近検知したこと にイベントが記録されるか
- アプリ切替・メディア開始・sleep遷移・発話がTimelineに記録されるか
- DiagnosticsPageにObservationSignalsが表示されるか
- DebugPageにcurrentSignals・TimelineイベントのPreviewが表示されるか
- note_savedを保存し、長期記憶候補一覧に出て、削除できるか
- 「無明が見ているもの」タブのファイル名表示が正しくなったか
- Watchful Modeで1〜2分間隔で発話するか
- raw filename / transcript / text input が保存されていないか

---

## v1.1.0 実装詳細

### A: ObservationSignal層

`src/systems/observation/observationSignals.ts` (NEW)

- `ObservationSignalKind`: `downloads_pile` / `installer_pile` / `archive_pile` / `audio_work` / `image_pile` / `daw_active` / `music_playing` / `video_playing` / `long_idle` / `user_returned` / `code_work` / `settings_open` / `fullscreen` / `gaming`
- `ObservationSignal`: `{ kind, strength (0–1), summary }`
- `buildObservationSignals(snapshot)`: ObservationSnapshotからシグナルを導出
- `topSignal(signals)`: 最強シグナルを返す
- 生スナップショットをそのままUIや反応エンジンに渡さず、シグナル層を挟む設計

### B: Watchful Mode プリセット

`src/settings/pages/BehaviorPage.tsx`

- 3つのクイックプリセットボタンを追加:
  - **Watchful Mode (観察モード)**: observationLevel=watchful + autonomousSpeechEnabled=true + focusMode=false
  - **バランス**: observationLevel=balanced (default)
  - **静かに**: observationLevel=minimal + quietMode=true

### C: 診断ページ

`src/settings/pages/DiagnosticsPage.tsx` (NEW)

- `CheckRow` コンポーネント: ✓(green) / ✗(red) で状態表示
- チェック項目:
  - Voice/STT: voiceInputEnabled・whisperExecutablePath設定済み・whisperModelPath設定済み
  - Observation: Ollamaベースurl設定・activeApp観測有効
  - Memory: memoryMode設定値表示
  - AutonomousSpeech: autonomousSpeechEnabled・intervalPreset表示
- `src/settings/SettingsApp.tsx` に「診断」タブを追加

### D: Field QA pending

- ObservationSignal層が実観測から正しいシグナルを生成するか
- Watchful Modeプリセットが設定を一括変更するか
- 診断ページが実情を正しく反映するか
- コンパクト200x280 / hit test / click-through の回帰がないか

---

## v1.0.8 実装詳細

### A: Memory Mode

`src/settings/types.ts` に `MemoryMode` 追加:
- `ephemeral`: 記憶なし（セッションのみ）
- `timeline`: タイムライン記録のみ
- `timeline_summary`: タイムライン + 要約（デフォルト）
- `ask_before_long_term`: 長期保存前に確認

### B: 長期記憶候補メモ

`src/systems/memory/memoryStore.ts` に `saveMemoryNote(text: string)` 追加

### C: MemoryPage UI

- `src/settings/pages/MemoryPage.tsx` に Memory Mode セレクタを追加
- 3層記憶構造の説明（運用記憶 / 会話揮発 / ユーザー承認長期）
- 長期記憶ノート入力フォーム

---

## v1.0.7 実装詳細

### A: Observation Timeline Store

`src/systems/observation/observationTimelineStore.ts` (NEW)

- `ObservationEventType`: active_app_changed / idle_started / user_returned / media_started / media_stopped / folder_signal_changed / companion_reacted / setting_changed / sleep_entered / update_available
- `ObservationEvent`: `{ id, timestamp, type, summary, source, signalKind?, strength? }`
- localStorage key: `amispi_observation_timeline`
- 最大200件、保存期間はretentionDays設定に従い起動時pruneObservationTimeline

### B: Observation Center UI

`src/settings/pages/ObservationPage.tsx` (NEW)

- observationLevel セレクタ（minimal / balanced / watchful / custom）
- 現在の観測状態表示（activeApp, idle, media）
- 直近タイムラインイベント一覧

### C: App.tsx 統合

- `prevSnapshotRef` でスナップショット変化を検出
- app categoryが変わったとき → `active_app_changed` イベント追加
- idle 5分超 → `idle_started` イベント
- media start/stop → `media_started` / `media_stopped`
- folder signal変化 → `folder_signal_changed`
- 起動時に `pruneObservationTimeline(retentionDays)` を実行

---

## v1.0.6 実装詳細

### A: Whisper言語指定

- `src-tauri/src/lib.rs`: `transcribe_with_whisper` に `language_code: String` 追加
  - `lang != "auto"` かつ非空のとき `-l <lang>` をwhisper引数に追加
- `src/systems/voice/WhisperCliSTTAdapter.ts`: `languageCode` フィールドを追加
- `src/systems/voice/STTAdapterManager.ts`: `whisperLanguage === "custom"` の場合は `whisperCustomLanguage` を使用
- `src/settings/pages/VoicePage.tsx`: WHISPER_LANGUAGE_OPTIONS 10言語（ja/auto/en/pt/es/ko/zh/fr/de/custom）

### B: English transcript rejection

`src/systems/voice/normalizeTranscript.ts`

- `whisperLanguage === "ja"` のとき、日本語文字なし＋ASCII onlyの場合 `english_when_ja_expected` で reject

### C: Sleep発話

`src/hooks/useCompanionState.ts`

- `"sleep_autonomous"` をSpeechSourceに追加（priority 15）
- `SLEEP_SPEECH_LINES`: `["……", "少し寝てた", "まだ、ここにいる", "小さく起きた", "静かだね", "夢を見てた"]`
- `sleepSpeechDelayRangeMs`: rare→8-15min / veryRare→15-30min / off→null
- `scheduleSleepSpeech` useCallback と useEffect
- sleep state解除で次のスケジュールはクリア

### D: Filename-derived signals (Rust)

`src-tauri/src/observation/mod.rs`

- `FolderSummary` に 7フィールド追加: `filename_signals` / `installer_pile_likely` / `archive_pile_likely` / `audio_export_likely` / `image_export_likely` / `daw_project_likely` / `code_project_likely` / `temp_download_likely`
- `build_filename_signals(names_lower)` ヘルパー
- ファイル名200件上限でcollect → シグナルのみ返す（生ファイル名は返さない）

---

## 設定型まとめ (v1.0.6+)

```ts
// src/settings/types.ts に追加済み
export type WhisperLanguage = "ja" | "auto" | "en" | "pt" | "es" | "ko" | "zh" | "fr" | "de" | "custom";
export type SleepSpeechIntervalPreset = "veryRare" | "rare" | "off";
export type ObservationLevel = "minimal" | "balanced" | "watchful" | "custom";
export type MemoryMode = "ephemeral" | "timeline" | "timeline_summary" | "ask_before_long_term";

// CompanionSettings に追加済みフィールド
whisperLanguage: WhisperLanguage;          // default: "ja"
whisperCustomLanguage: string;             // default: ""
sleepSpeechEnabled: boolean;               // default: true
sleepSpeechIntervalPreset: SleepSpeechIntervalPreset; // default: "veryRare"
filenameSignalsEnabled: boolean;           // default: true
observationLevel: ObservationLevel;        // default: "balanced"
memoryMode: MemoryMode;                    // default: "timeline_summary"
```

---

## Field QA pending (v1.0.6〜v1.1.0)

| 機能 | 確認内容 |
|---|---|
| Whisper -l ja | 言語引数が正しく渡るか / auto時は引数なしか |
| English rejection | ja設定でASCII-onlyが正しくrejectされるか |
| Sleep発話 | sleep状態中のみ低頻度murmurが出るか / wake後は止まるか |
| Filename signals | downloadsフォルダ等で正しいシグナルが得られるか |
| Observation Timeline | アプリ切替・idle・media変化でイベントが積まれるか |
| Observation Center UI | observationLevelセレクタが設定を変更するか |
| Memory Mode セレクタ | 設定が保存・反映されるか |
| ObservationSignal層 | buildObservationSignalsが実観測から正しい結果を返すか |
| Watchful Modeプリセット | 設定一括変更が機能するか |
| 診断ページ | 各チェック項目が実情を反映するか |
| コンパクトレイアウト | 200x280 / hit test / click-through 回帰なし |

---

## 絶対禁止事項（次セッションも維持すること）

- ChatGPT auth/session流用 / unofficial cookie auth / browser session scraping
- Cloud STT / 常時マイク録音 / wake word
- 常時スクリーン録画 / 常時スクリーンショット / OCR / TTS
- shell実行 / 自動ファイル操作 / ファイル移動 / ファイル削除
- メール送信 / 外部API操作 / ブラウザ操作
- 長期ベクトルDB / ファイル本文の自動読み取り
- 画面内容を外部送信する機能
- transcript / text input / raw filename / window title の無制限な長期保存
- ユーザーに見えない隠れた監視

## 壊してはいけないもの

```
✅ compact 200x280 window / speech時window resize禁止 / character layout / hit test geometry
✅ click-through / ContextMenu / speech bubble位置 / drag / voice long press
✅ text message input / UpdateBadge / Onboarding / Memory Retention / Memory Export / Update Page
✅ Debug / Transparency / Ollama接続 / Active App取得 / FFmpeg/Whisper変換 / 一時音声ファイル削除
✅ Interaction Trace / VoicePage transcript preview / Autonomous speech interval preset / Safety cap ON/OFF
✅ v1.0.5 prompt contamination fix / Observation Timeline / Observation Center / Memory Mode
✅ ObservationSignal層 / Watchful Mode / DiagnosticsPage (v1.1.0)
✅ npm run build が通ること / cargo build が通ること
```

---

## 次のフェーズ候補

### A: Field QA (推奨)
v1.0.6〜v1.1.0の実機QA。特にWhisper言語指定・sleep発話・observation timelineの動作確認。

### B: v1.2.0 候補
- ObservationSignal → 発話反応への統合（useObservationReactionsでtopSignalを使う）
- 診断ページの拡充（Ollama接続確認・Whisper疎通確認ボタン）
- MemoryMode別の実際の保存制御実装（現在は型とUIのみ）

### C: 今やらないこと
- Screen Capture / OCR / TTS
- 長期RAG / ベクトルDB / クラウドAI追加
- 大規模UI刷新

---

## Claude Code が次セッションで迷わないための作業順

```
1. docs/NEXT_SESSION.md を読む (このファイル)
2. docs/KNOWN_ISSUES.md で field QA pending 状況を確認
3. docs/SETTINGS_BEHAVIOR_MATRIX.md で設定とランタイムの対応を確認
4. npm run build → 通ることを確認
5. cargo build  → 通ることを確認
6. 実装作業 or field QA
7. npm run build / cargo build → 通ることを確認
8. docs/KNOWN_ISSUES.md 更新 (QA通過項目を passed へ)
9. docs/NEXT_SESSION.md 更新 (このファイル)
10. git add / commit / bump / push / tag
```
