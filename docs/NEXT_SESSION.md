# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-13 (v0.1.49)**

---

## 現在のステータス

**バージョン:** v0.1.49
**フェーズ:** First-run Onboarding 実機QA通過
**全体進捗:** 約 83%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照
**記憶設計:** docs/MEMORY_AND_DATA_CONTROL.md 参照
**QA 記録:** docs/FIELD_QA_NOTES.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.49)
✅ cargo build  → Finished dev profile (v0.1.49)
✅ GitHub Actions / Windows Installer → v0.1.49 成功済み
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
| Hotfix: Character/ContextMenu | 280px layout・sizeScale/window bounds同期・work area clamp・ContextMenu上方向clamp | ✅ v0.1.40 |
| Hotfix: Character Rendering Anchor | Character実描画サイズをsizeScaleに同期・visual bottom anchor明確化 | ✅ v0.1.41 |
| Hotfix: Speech Resize Bottom Anchor | rootをviewport基準化・character-stage absolute bottom anchor・resize拡大順序修正 | ✅ v0.1.42 |
| Hotfix: Speech Bubble Relative Anchor | speech bubbleをwindow top基準からキャラ頭上基準へ変更 | ✅ v0.1.43 |
| Hotfix: Settings Updater / Debug Mode / Hit Test QA | 設定画面更新導線・UpdateBadge hit test・debug overlay追加 | ✅ v0.1.44 |
| Diagnostic: Sprite Render Debug Instrumentation | Character内部のimg/currentSrc/natural size/alpha bbox/CSS animation診断追加 | ✅ v0.1.45 |
| Hotfix: Sprite Render Surface Fix | sprite実表示をbackground surfaceへ変更し、透明WebView expanded時の描画欠け対策 | ✅ v0.1.46 |
| Hotfix: Always Expanded Transparent Window | speech表示/非表示でwindow heightを変えず、常時expanded height + 明示speech hit testへ変更 | ✅ v0.1.47 |
| Hotfix: Compact Speech Layout | v0.1.47の常時410pxを撤回し、speech時も常時compact 280px内に収める | ✅ v0.1.48 |
| First-run Onboarding | ローカルファースト・AI設定・自律発話・デバッグ方針を初回設定で案内 | ✅ v0.1.49 |

---

## v0.1.49 実装詳細

### A: v0.1.48 実機確認結果

- idle / speech / drag / speech中drag のすべてでキャラ下半分が消えない
- debug overlay上で wh/client/vh は `200x280` 固定
- stage / wrapper / surface / img / alpha は viewport 内
- compact speech layout は採用
- 410px expanded window、dynamic resize `280→410`、always expanded `410px` は不採用
- 今後、companion window は compact `200x280` 固定を設計制約として扱う

### B: First-run Onboarding

- `CompanionSettings` に `onboardingCompleted` / `onboardingVersion` を追加
- 初回起動時に設定ウィンドウを開く
- 設定画面に「はじめに」タブを追加
- Onboarding構成
  - Welcome
  - Privacy / Local-first
  - AI Engine
  - Behavior
  - Window / Controls
  - Finish
- 完了またはスキップで `onboardingCompleted=true` / `onboardingVersion=1`
- 完了後も設定画面から再表示可能
- 実機QAで初回表示、完了後の非再表示、設定画面からの再表示を確認済み
- Ollama / 自律発話 / privacy 説明、既存設定、Update、Active App、voice long press の回帰なし

### C: 注意

- v0.1.48で安定した character/window/hit test layout は変更していない
- DebugMode / UpdatePage / TransparencyPage / Active App / Ollama は維持

---

## v0.1.48 実装詳細

### A: v0.1.47 実機結果

- 常時expanded `200x410` では idle / speech / drag / speech中drag の全状態でキャラ下半分が消えた
- debug上は `stage` / `wrapper` / `surface` / `img` / `alphaRect` が viewport 内で、`OVER` は出ていない
- 410px高の transparent companion window 下部領域にspriteを置く設計が現在の実機環境では危険と判断

### B: compact固定へ戻す

- `src-tauri/tauri.conf.json`: companion初期heightを `280` に戻した
- `src-tauri/src/lib.rs`: `resize_companion` の target height を常に `CHAR_WINDOW_H_LOGICAL` に固定
- `src/App.tsx`: expected `windowH` を `COMPANION_COMPACT_H` に戻した
- speech表示時も `410px` へ広げず、dynamic resizeもしない

### C: compact内speech layout

- speech bubble は character-stage 頭上基準のまま
- `src/styles/index.css`: compact window内に収めるため bubble 最大高さを制限し、本文を最大3行で省略
- 長文応答は完全表示よりキャラ正常描画を優先する

### D: 維持したもの

- `SPEECH_VISIBLE: AtomicBool` による明示hit test状態
- v0.1.47 の DebugOverlay / ContextMenu 重なり修正
- v0.1.46 の background render surface / sprite debug
- 設定画面アップデート / UpdateBadge hit test / DebugMode
- ContextMenu / click-through / drag / voice long press / Active App / Ollama

---

## v0.1.47 実装詳細

### A: v0.1.46 debug結果

- background render surfaceでも speech expanded時のキャラ下半分消失は残った
- debug上は `stage` / `wrapper` / `surface` / `img` / `alphaRect` がすべて viewport 内で、`OVER` は出ていない
- 消える境界が旧compact height `280px` 付近に見えるため、280→410 dynamic resize後のtransparent WebView / GPU compositor内部clipを疑う

### B: always expanded window化

- `src-tauri/src/lib.rs`
  - `resize_companion` は speech表示状態に関係なく常に `CHAR_WINDOW_H_LOGICAL + BUBBLE_WINDOW_H_LOGICAL` を target height にする
  - speech表示/非表示でwindow heightを変えず、sizeScale変更時のみbounds同期する設計へ変更
- `src-tauri/tauri.conf.json`
  - companion初期heightを `410` に変更
- `src/App.tsx`
  - debug expected `windowH` を常時expanded heightに変更
  - root `100vw/100vh`、character-stage bottom anchor、speech bubble頭上基準は維持

### C: hit test状態の明示化

- `SPEECH_VISIBLE: AtomicBool` を追加
- `resize_companion(speechVisible, sizeScale)` で表示状態をRustへ同期
- hit testはwindow heightからspeech表示を推測せず、`SPEECH_VISIBLE` を参照
- 常時410pxでも speech=false時はbubble hitを無効化し、上部透明領域click-throughを維持

### D: DebugOverlayとContextMenu

- `DebugOverlay` に `suspended` propを追加
- ContextMenu表示中はDebugOverlayを一時停止し、右クリックメニューがdebug文字列に隠れないようにした

### E: 触っていないもの

- sprite画像 / canvas描画 / speechSafetyLift / work area clamp大幅変更
- Ollama / Active App / PromptBuilder / QualityFilter / Transparency UI

---

## v0.1.46 実装詳細

### A: v0.1.45 debug結果

- speech表示時も `stage` / `wrapper` / `img` / `alpha` は viewport 内だった
- `speaking.png` 固有ではなく、speech中dragの `touched.png` でも視覚的に下半分が消えた
- compact `200x280` では speech=true でも見切れず、expanded transparent WebView状態の描画/合成問題が本命になった

### B: sprite render surface

- `Character.tsx`
  - 実表示を `<img>` から `div.character-sprite-surface` の `background-image` に変更
  - `<img>` は preload / fallback / debug 用に透明状態で保持
  - state変更時に preload URL index をリセット
- `index.css`
  - `character-wrapper` / `character-anim` / sprite surface に `overflow: visible`、`isolation: isolate`、`backface-visibility` を追加
- `DebugOverlay.tsx`
  - `renderMode=background`
  - `surface` rect
  - img / alpha debug は維持

### C: 触っていないもの

- window height、speech lift、work area clamp
- Ollama / Active App / ContextMenu / PromptBuilder / QualityFilter
- speech bubble頭上基準、UpdateBadge hit test、設定画面アップデート

---

## v0.1.45 実装詳細

### A: v0.1.44 実機debug結果

- speech表示時も `stage` / `wrapper` は viewport 内に収まっていた
- idle: viewport `200x280`、stage/wrapper bottom `256`
- speech: viewport `200x410`、stage/wrapper bottom `386`
- bottom余白は約24pxあり、window / viewport / work area clamp は直接原因ではなさそう

### B: Character内部debug

- `src/components/Character.tsx`
  - sprite `<img>` に `character-sprite-img` class と `data-sprite-url` を追加
- `src/components/DebugOverlay.tsx`
  - `effectiveState`
  - current sprite URL
  - img rect
  - img naturalWidth / naturalHeight / complete
  - CSS animationName / animationDuration
  - CSS transform / transformOrigin
  - objectFit / objectPosition
  - canvasで測った alpha bbox
  - alpha bbox の画面上rect
  - img / alpha の viewport超過 `OVER`

### C: 注意

- v0.1.45 は診断版
- window height増加、speech lift、見た目の大きな補正は入れていない
- 次回QAで `speaking.png` / `nat=160x160` / `alphaRect` / `char-speak` を確認し、修正方針を決める

---

## v0.1.44 実装詳細

### A: 設定画面からの更新導線

- `src/settings/pages/UpdatePage.tsx` を追加
- `SettingsApp.tsx` に「アップデート」タブを追加
- `get_app_version` / `check_for_updates` / `install_update` を直接呼び、companion上のUpdateBadgeが押せない場合でも更新できるようにした

### B: UpdateBadge hit test

- `src-tauri/src/lib.rs` に `UPDATE_BADGE_VISIBLE` と `set_update_badge_visible(visible)` を追加
- `App.tsx` から `updateAvailable !== null || installing` をRustへ通知
- UpdateBadge表示中だけ、character上基準のbadge矩形をinteractiveに追加
- 非表示時はhit areaを作らず、上部透明領域click-throughを維持

### C: Debug mode

- `debugModeEnabled` を設定へ追加。デフォルトOFF
- `DebugPage.tsx` を追加し、ユーザーが実機QAでON/OFF可能にした
- `DebugOverlay.tsx` を拡張
  - viewport / character-stage / character-wrapper / speech-layer / update-badge / hit-target rect
  - `wrapper.bottom` / `stage.bottom` のviewport超過表示
  - updater state
  - last AI source (`ollama` / `fallback` / `mock` / `rule` / `none`)
- overlayは `pointer-events: none`

### D: speech表示時の見切れ

- v0.1.43実機確認で、speech表示時にキャラ下半分がまだ見切れることが判明
- 原因はまだ未確定
- v0.1.44では window height増加や暫定speech liftは入れず、debug overlayで原因を確認できる状態にした
- 次回QAでは `wrapper` / `stage` がviewportを超えているか、speech true時だけviewport heightが想定とずれるかを確認する

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

## v0.1.40 実装詳細

### A: キャラめり込み/見切れの根本対策

- `src/constants/companionLayout.ts` を追加し、TS側の window/layout 定数を一元化
  - compact: `200×280`
  - expanded: `200×410`
  - bottom padding: `24px`
- `src/App.tsx`:
  - `settings.sizeScale` を `normalizeCompanionScale()` で `0.75〜1.5` に clamp
  - `resize_companion` に `sizeScale` を渡す
- `src-tauri/src/lib.rs`:
  - `CHAR_WINDOW_H_LOGICAL = 280.0`
  - `resize_companion(speechVisible, sizeScale)` で width/height を DPI scale と sizeScale の両方に合わせる
  - resize後の top-left を monitor work area 内へ clamp
- 保存済み window position と drag終了時の position 保存も work area 内へ clamp
  - 旧バージョンの小さい window で保存された top-left をそのまま復元して、下端が画面外に沈む問題を防ぐ
- `useWander.ts` は現在の `window.outerWidth/outerHeight` で画面内移動範囲を計算

### B: ContextMenu見切れ修正

- `src/components/ContextMenu.tsx`:
  - 固定 `300px` 想定を削除
  - 実際の companion window width/height を受け取り、menu bottom が window 内に収まるよう clamp
  - 下部右クリック時は上方向に開く
  - `終了` を `アプリ終了` に変更
- `src-tauri/src/lib.rs`:
  - `CONTEXT_MENU_VISIBLE` と `set_context_menu_visible(visible)` を追加
  - ContextMenu 表示中だけ hit test を window 全体 interactive にし、メニュー項目クリックが楕円hit target外で背面へ抜けないようにした
  - メニューを閉じたら通常の「吹き出し + キャラ楕円」hit test に戻る

### C: 維持したもの

- v0.1.39 で解決した Active App取得 / Bitwig `daw` 認識 / raw JSON debug
- SettingsApp の白画面防止
- Ollama `source: ollama`、`http://127.0.0.1:11434` default、PromptBuilder / QualityFilter
- 上部透明領域クリック改善と PNG透明余白クリック改善

---

## v0.1.41 実装詳細

### A: Character rendering anchor 修正

- `src/constants/companionLayout.ts`:
  - `CHARACTER_SPRITE_W/H = 160` を明示
- `src/App.tsx`:
  - `settings.sizeScale` 済みの `characterW/characterH` を `Character` に渡す
  - `character-stage` と実際の sprite / fallback 描画サイズを一致させた
- `src/components/Character.tsx`:
  - wrapper / sprite img / fallback が `width/height` props を使うよう変更
- `src/styles/index.css`:
  - `character-wrapper` / `character-anim` の `transform-origin: center bottom`
  - sprite img を wrapper サイズに対して `width: 100%; height: 100%; display: block`

### B: 原因

- v0.1.40 では App 側の window / stage は `sizeScale` に合わせて縮尺していた
- しかし `Character.tsx` は `DEFAULT_CHARACTER_CONFIG` の 160×160 固定で描画していた
- `sizeScale < 1` では stage/window より sprite が大きくなり、Tauri window 外へ出た下端が `overflow: hidden` で切れる可能性があった
- Rust hit test は `160×160 * sizeScale * DPI` 前提だったため、React実描画と hit test bbox の整合も崩れていた

### C: 維持したもの

- ContextMenu は変更なし。v0.1.40 の clamp / `アプリ終了` / context menu中全域interactive を維持
- Active App / Transparency UI / Ollama / PromptBuilder / QualityFilter は変更なし
- drag保存座標と `resize_companion` bottom anchor は変更なし
- 上部透明領域 click-through と PNG透明余白クリック改善は維持

---

## v0.1.42 実装詳細

### A: speech表示時の沈み込み修正

- 実機確認で「通常表示では切れないが、吹き出し表示時に必ず下へ沈む」ことが判明
- v0.1.41 の Character実描画 sizeScale 同期は正しい補修だったが、speech dynamic resize の競合までは解消していなかった
- `src/App.tsx`:
  - rootを予測 `windowH` 固定ではなく `100vw / 100vh` の実WebView viewport基準へ変更
  - `character-stage` を flex-end 配置から absolute bottom anchor へ変更
  - `bottom: bottomPad` で、吹き出し表示/非表示に関係なくキャラvisual bottomを固定
- `src-tauri/src/lib.rs`:
  - `resize_companion` の拡大時は `set_position → set_size`
  - 縮小時は `set_size → set_position`
  - compact→expanded の一瞬だけ window bottom が下へ伸びる挙動を避ける

### B: drag中speech resize対策

- drag reaction は drag開始時ではなく drag終了後160msに遅延
- OSネイティブdrag中に speech が出て window resize が走る競合を避ける
- drag保存座標は従来通り window top-left のまま

### C: debug

- React側: DEV限定で viewport / computed layout / `character-stage` / `character-wrapper` bbox を console log
- Rust側: debug build限定で resize前後の outer/inner position/size、target size、bottom anchor計算を stderr log
- 通常UIにdebug枠や表示は残していない

### D: 維持したもの

- ContextMenu / hit test / Active App / Transparency UI / Ollama / PromptBuilder / QualityFilter は大きく触らず維持
- v0.1.41 の Character実描画 sizeScale 同期も維持

---

## v0.1.43 実装詳細

### A: speech bubble relative anchor 修正

- v0.1.42 実機確認で、キャラ位置は維持されているが吹き出しがwindow上端に出すぎることが判明
- 原因は、キャラが bottom anchor になった一方、speech bubble / TinyWhisper が `top: 10` のwindow top anchorのままだったこと
- `src/constants/companionLayout.ts`:
  - `SPEECH_BUBBLE_GAP = 8`
  - `SPEECH_BUBBLE_HIT_H = 96`
- `src/App.tsx`:
  - speech layerを `top: 10` から `bottom: bottomPad + characterH + gap` へ変更
  - DEV debugに speech layer bbox を追加
- `src-tauri/src/lib.rs`:
  - bubble hit areaをwindow上端基準から `char_top - gap` 基準へ変更
  - ContextMenu中のみ全域interactive、通常時は吹き出し + キャラ楕円の設計を維持

### B: 維持したもの

- v0.1.42 の root `100vw / 100vh`
- `character-stage` absolute bottom anchor
- `resize_companion` 拡大時 `set_position → set_size`
- drag reaction 遅延
- v0.1.41 の Character実描画 sizeScale 同期
- ContextMenu / Active App / Ollama / Transparency UI

---

## 次のフェーズ候補 (v0.1.50)

### 優先候補 A: Memory Retention Policy ← **推奨**

**目的:** 古いイベントを自動的に整理する仕組み。

**実装すべき内容:**
1. 設定: `memoryRetentionDays` (デフォルト30日)
2. 起動時に古い speech_shown / state_changed を削除
3. MemoryPage に設定UI追加

### 優先候補 B: Emotion Sprite Set

**目的:** CompanionEmotion (shy/concerned/happy) の専用スプライト。

**実装すべき内容:**
1. `public/characters/default/` に shy.png / concerned.png を追加
2. `emotionToSpriteState()` マッピングを更新
3. CryEngine sound との連動

### 優先候補 C: RuleProvider daily summary活用強化

**目的:** DailySummaryをfallback / RuleProvider応答に軽く反映し、ローカル文脈の継続感を上げる。

**注意:**
- PromptBuilder / QualityFilter / Ollama品質は大きく触らない
- source: ollama の挙動を壊さない

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
✅ resize_companion: 吹き出し on/off でウィンドウ 200×280 ↔ 200×410 動的リサイズ
✅ hit test スレッド: 通常時は吹き出し矩形 + キャラ楕円、ContextMenu中のみ全域有効化
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
✅ resize_companion: scale_factor() + sizeScale で DPI/ユーザーscale 対応
✅ tauri.conf.json: 初期ウィンドウ高さ 280px (論理ピクセル)
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
7. まず v0.1.40 実機確認。問題なければ First-run Onboarding へ進む
8. npm run build / cargo build → 通ることを確認
9. docs/PROGRESS_TRACKER.md 更新 (進捗数値)
10. docs/NEXT_SESSION.md 更新 (このファイル)
11. git add / commit / bump / push
```
