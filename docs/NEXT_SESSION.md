# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-13 (v0.1.39)**

---

## 現在のステータス

**バージョン:** v0.1.39
**フェーズ:** Hotfix — Character Layout / Transparent Hit Area / Foreground Debug 完了 (実機確認待ち)
**全体進捗:** 約 74%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照
**記憶設計:** docs/MEMORY_AND_DATA_CONTROL.md 参照
**QA 記録:** docs/FIELD_QA_NOTES.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.39)
✅ cargo build  → Finished dev profile (v0.1.39)
✅ GitHub Actions / Windows Installer → v0.1.38 成功済み。v0.1.39 は tag push 後に確認
```

---

## 完了済みフェーズ

| Phase / Milestone | 内容 | 状態 |
|---|---|---|
| Phase 0–5 | 土台・観測・PromptBuilder・MediaContext・ウィンドウ位置 | ✅ 完了 |
| Phase 6a / 6a.5 / 6b-real-1 | Voice Foundation・実録音・STTAdapter基盤 | ✅ 完了 |
| Milestone A 第1段階 | ActivityInsight精度・DailySummary・PromptBuilder改善・TransparencyUI | ✅ v0.1.31 |
| Milestone A 第2段階 | RuleProvider文脈強化・autonomous speech精度向上・発話制御UI | ✅ v0.1.32 |
| Milestone B 第1段階 | Memory Viewer UI・記憶削除機能・memoryStore拡張 | ✅ v0.1.33 |
| Milestone B 第2段階 | Character State Expression・状態別CSSアニメーション・VoiceUIState統合 | ✅ v0.1.34 |
| Field QA Fixes Round 1 | Ollamaキャッシュバグ修正・classify_app拡充・当たり判定改善・デバッグUI | ✅ v0.1.35 |
| Field QA Root Cause Fixes | Ollama CORS根本修正(Rust経由HTTP)・ActiveAppDebug・SPEECH_VISIBLE hit test | ✅ v0.1.36 |
| Companion Intelligence & Window Arch | AI-first自律発話・PromptBuilder/QualityFilter強化・window resize・3秒遅延キャプチャ | ✅ v0.1.37 |
| Hotfix: Settings/Clipping/AI | TabErrorBoundary・DPI対応resize_companion・PromptBuilder時刻偏重修正・直近発話context | ✅ v0.1.38 |
| Hotfix: Character/Hit Area/Foreground Debug | 240px layout・楕円hit target・serde camelCase/raw JSON debug | ✅ v0.1.39 |

---

## v0.1.37 実装詳細

### A: Ollama default URL → `http://127.0.0.1:11434`

- `src/settings/defaults.ts`: `ollamaBaseUrl` を `http://127.0.0.1:11434` に変更
- `src/companion/ai/OllamaProvider.ts`: `DEFAULT_BASE_URL` を同様に変更
- 実機確認で `localhost` → timeout、`127.0.0.1` → 成功が判明したため

### B: PromptBuilder / QualityFilter 強化

- `src/systems/ai/PromptBuilder.ts`:
  - 理想20〜60文字・最大80文字を明示
  - 英語・ローマ字・英単語を一切禁止を明示
  - "continued" / 壊れた句読点 / 途中切れの禁止を追加
  - 良い例・悪い例をシステムプロンプトに追記
  - ユーザーメッセージ末尾に「日本語一文のみで返答」を追加
- `src/systems/ai/QualityFilter.ts`:
  - `too_long` → truncate (ok:true) から reject (ok:false, reason:"too_long") に変更
  - `continued` / 英単語4文字超 (`[A-Za-z]{4,}`) / `。。` / `...` / 途中切れ の禁止パターンを追加
- `OllamaProvider.ts` / `lib.rs`: temperature 0.7 → 0.5

### C: AI-first 自律発話

- `src/hooks/useCompanionState.ts`:
  - startup greeting: greetTimer を async に変更、AI-first → fallback on failure
  - scheduleIdleSpeech: setTimeout callback を async に変更、AI-first → fallback
- `src/companion/reactions/useObservationReactions.ts`:
  - `tryAIOrFire()` ヘルパーを追加 (AI → fire() fallback)
  - mediaWatching / gamingLikely / longIdle / activity 遷移 を AI-first に変更
  - fullscreen / downloads-pile / desktop-pile は固定テキスト維持

### D: Active App デバッグ強化

- `src-tauri/src/observation/mod.rs`:
  - `ActiveAppDebugInfo` に `hwnd_raw: u64` / `last_error_before: u32` を追加
  - `SetLastError(0)` を各 Win32 API 呼び出し前に追加
- `src/settings/pages/TransparencyPage.tsx`:
  - `ActiveAppDebugInfo` 型に `hwndRaw: number` / `lastErrorBefore: number` を追加
  - 「3秒後にキャプチャ」ボタンを追加 (カウントダウン表示付き)
  - HWND raw 値・pre-call LastError 値を表示

### E: ウィンドウリサイズ方式 (当たり判定根本修正)

- `src-tauri/tauri.conf.json`: height 300 → 180
- `src-tauri/src/lib.rs`:
  - `resize_companion(speechVisible: bool)` コマンドを追加
  - 吹き出し非表示: 200×180、表示中: 200×310 に動的リサイズ
  - キャラクター底辺の画面座標を固定 (char_bottom = pos.y + size.height)
  - `set_speech_visible` / `SPEECH_VISIBLE AtomicBool` を削除
  - hit test スレッドを簡素化 (常にウィンドウ全体を判定)
- `src/App.tsx`:
  - `set_speech_visible` → `resize_companion` に変更
  - `windowH` を hasSpeech に応じて 180 or 310 に切り替え
  - ドラッグ終了時に `hasSpeechRef` で補正した charY を save_window_position に渡す

---

## v0.1.38 実装詳細

### A: 設定画面の白画面クラッシュ修正

- `src/settings/SettingsApp.tsx`: `TabErrorBoundary` クラスコンポーネントを追加
- `src/settings/pages/TransparencyPage.tsx`: `ActiveAppDebugPanel` を防御的に書き直し
  - `useRef` ベースの `fetchingRef` / `intervalRef` で二重fetch防止・クリーンアップ
  - `fmtHwnd()` で hwndRaw が null/undefined/0 の場合も安全に表示

### B: キャラクタークリッピング修正 (DPI対応)

- `src-tauri/tauri.conf.json`: height 180 → 220 (論理ピクセル)
- `src-tauri/src/lib.rs`: `CHAR_WINDOW_H_LOGICAL = 220.0` / `BUBBLE_WINDOW_H_LOGICAL = 130.0`
  - `window.scale_factor()` で DPI スケールを取得し、論理→物理ピクセル変換
- `src/App.tsx`: `CHAR_H` 180 → 220、`hasSpeechRef` 補正を削除 (ドラッグ位置保存の簡素化)

### C: AI 返答単調化・時刻偏重の修正

- `src/systems/ai/PromptBuilder.ts`:
  - `triggerHint()` 関数追加 (trigger 別ヒント、時刻言及不要を click 時に明示)
  - 時刻帯を後方へ移動・「参考」ラベルに変更
  - 直近3件の `speech_shown` 発話を「繰り返し厳禁」として context に追加
  - click 良い例を追加: 「ここにいる」「うん、聞こえてる」「少しだけ起きた」等
  - 「時刻帯に毎回言及しない」をシステムプロンプトに明記
- `src/systems/ai/QualityFilter.ts`:
  - `TRUNCATED_PATTERN` を `[はがをへ]$` に緩和 (「にでも」等の自然な終止を許容)

---

## v0.1.39 実装詳細

### A: キャラクター layout / clipping 修正

- `src-tauri/tauri.conf.json`: companion height 220 → 240
- `src-tauri/src/lib.rs`: `CHAR_WINDOW_H_LOGICAL = 240.0`、expanded は 370px
- `src/App.tsx`: window/layout 定数を 200×240 / +130 に統一
- 160px sprite、状態アニメーション、voice dot、bottom padding 16px を compact window 内に収める
- drag 保存座標は v0.1.38 と同じく window 上端を保存。bottom anchor resize に任せる

### B: PNG透明余白クリック判定の現実的改善

- `src/App.tsx`: `character-stage` 内で Character 描画レイヤーと `character-hit-target` を分離
- `src/components/Character.tsx`: sprite wrapper は `pointer-events: none`
- `src/styles/index.css`: キャラ本体に近い楕円 hit target を追加
- `src-tauri/src/lib.rs`: Windows hit test を「ウィンドウ全体」から「吹き出し矩形 + キャラ楕円」に変更
- 完全な透明ピクセル単位 hit test は未実装。必要なら将来 alpha mask を Rust 側で扱う

### C: Active App Raw Foreground Debug 改善

- `src-tauri/src/observation/mod.rs`: Serialize struct に `#[serde(rename_all = "camelCase")]` を追加
- `src/settings/pages/TransparencyPage.tsx`: debug結果を snake_case / camelCase 両対応で normalize
- `hwndRaw` 未受信と `GetForegroundWindow=0` を区別
  - 未受信: `フィールド未受信`
  - 0: `NULL(0)`
- raw JSON preview と console log を追加
- 3秒後キャプチャの説明を「対象ウィンドウをクリックしてアクティブ化」に明確化

### D: 維持したもの

- SettingsApp / TabErrorBoundary / TransparencyPage defensive rendering
- Ollama source: ollama、`http://127.0.0.1:11434` default
- PromptBuilder / QualityFilter の返答品質改善
- RuleProvider fallback / MemoryViewer / Transparency UI / Update通知固定文

---

## 次のフェーズ候補 (v0.1.40)

### 優先候補 A: v0.1.39 実機確認 ← **最優先**

1. キャラが下にめり込まないか
2. ドラッグしても画像が切れないか
3. 吹き出し表示時もキャラが沈まないか
4. 吹き出し非表示時、上部透明領域で背面URLをクリックできるか
5. PNG透明余白クリックが前より背面に通りやすいか
6. キャラ本体クリック / drag / voice long press が動くか
7. Ollama返答が自然なままか
8. 3秒後キャプチャで raw JSON / hwndRaw / pid / processName がどう表示されるか

### 優先候補 B: First-run Onboarding

**目的:** 初回起動時の権限・機能・記憶・安全性の説明。

**実装すべき内容:**
1. localStorage に `hasCompletedOnboarding` フラグ
2. 初回のみ表示されるオンボーディング画面 (メインウィンドウに overlay or 別ウィンドウ)
3. 主な項目: ローカル動作・観測内容・Ollama設定方法・記憶について
4. 「設定を開く」ボタンで設定画面に誘導

**完了条件:**
- 初回起動時に表示される
- 2回目以降は表示されない
- 「設定を開く」が機能する
- build が通る

### 優先候補 C: Active App取得修正継続

**目的:** v0.1.39 の raw JSON 結果をもとに、GetForegroundWindow が本当に 0 なのか、権限/前面化/serde の問題なのかを切り分ける。

### 優先候補 D: Memory Retention Policy

**目的:** 古いイベントを自動的に整理する仕組み。

**実装すべき内容:**
1. 設定: `memoryRetentionDays` (デフォルト30日)
2. 起動時に古い speech_shown / state_changed を削除
3. MemoryPage に設定UI追加

### 優先候補 E: Emotion Sprite Set

**目的:** CompanionEmotion (shy/concerned/happy) の専用スプライト。

**実装すべき内容:**
1. `public/characters/default/` に shy.png / concerned.png を追加
2. `emotionToSpriteState()` マッピングを更新
3. CryEngine sound との連動

---

## 今やらないこと

- Whisper実接続 (Phase 6b-real-2)
- Screen Capture / OCR
- TTS
- 長期RAG・ベクトルDB
- 大規模UI刷新
- クラウドAI追加
- クラウドSTT

---

## 壊してはいけないもの

```
✅ onCharacterClick → requestAIResponse → AI(none/mock/ollama/rule) → triggerSpeak
✅ fireReaction → fallback when AI unavailable
✅ SpeechPolicy (DND/quiet/focus/fullscreen 抑制)
✅ useObservationReactions (activity遷移発火・deepFocus/gaming/watchingVideo抑制)
✅ scheduleIdleSpeech の activity-aware 抑制
✅ overClicked / returnAfterBreak / returnAfterLongBreak reactions
✅ CryEngine (sleep/wake/touch sounds)
✅ ウィンドウ位置の保存・復元 (window上端保存 + bottom anchor resize)
✅ MediaContext (Spotify等のバックグラウンド検出)
✅ Transparency UI (ActivityInsight・reasons・記憶・発話制御パネル・10秒自動更新)
✅ Memory Viewer UI (MemoryPage) - 削除後も表示が壊れない
✅ Character State Expression - thinking/speaking/sleep/waking CSS アニメーション
✅ VoiceUIState dot インジケーター (Character 内部)
✅ OllamaProvider: invoke("ollama_list_models") / invoke("ollama_chat") で Rust 経由 HTTP (CORS 回避)
✅ LastAIResultDebug: AIPage でデバッグ情報が表示される
✅ classify_app: self/communication カテゴリを含む拡充済みマッピング
✅ resize_companion: 吹き出し on/off でウィンドウ 200×240 ↔ 200×370 動的リサイズ
✅ hit test スレッド: 吹き出し矩形 + キャラ楕円のみ有効化
✅ 3秒遅延キャプチャ: TransparencyPage でボタンを押してから3秒後に get_active_app_debug
✅ hwnd_raw / last_error_before: ActiveAppDebugInfo に追加済み
✅ AI-first startup greeting / idle speech / activity transitions
✅ QualityFilter: too_long → reject (truncate しない)
✅ QualityFilter: continued / 英単語4文字超 / 壊れた句読点 / [はがをへ]$ 途中切れ を拒否
✅ PromptBuilder: trigger別ヒント・時刻帯を後方・直近発話context・click良い例追加
✅ PromptBuilder: 理想20〜60文字・最大80文字・英語禁止・例文追加
✅ ollamaBaseUrl default: http://127.0.0.1:11434
✅ get_active_app_debug: フォアグラウンドプロセス取得の段階別デバッグ情報
✅ ActiveAppDebugPanel: TransparencyPage でデバッグパネルを表示 (防御的・useRef対応)
✅ TabErrorBoundary: SettingsApp の各タブを ErrorBoundary で保護
✅ resize_companion: scale_factor() で DPI 対応・logical 240px → physical 変換
✅ tauri.conf.json: 初期ウィンドウ高さ 240px (論理ピクセル)
✅ cargo build が通ること
✅ npm run build が通ること
✅ Voice Input 基盤 (voiceInputEnabled=false では録音しない)
✅ Mock STT が動くこと
✅ buildMemorySummary([]) / buildDailySummary([]) が安全に動くこと
```

---

## Claude Code が次セッションで迷わないための作業順

```
1. docs/NEXT_SESSION.md を読む (このファイル)
2. docs/PROGRESS_TRACKER.md で現在地を確認
3. docs/PRODUCT_COMPLETION_ROADMAP.md で方針確認
4. docs/RESPONSE_QUALITY_GUIDE.md で発話品質基準確認
5. npm run build → 通ることを確認
6. cargo build  → 通ることを確認
7. まず v0.1.39 実機確認。問題なければ First-run Onboarding へ進む
8. npm run build / cargo build → 通ることを確認
9. docs/PROGRESS_TRACKER.md 更新 (進捗数値)
10. docs/NEXT_SESSION.md 更新 (このファイル)
11. git add / commit / bump / push
```
