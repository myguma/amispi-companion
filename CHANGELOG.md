# Changelog

## [0.1.49] — 2026-05-13

### Added (First-run Onboarding)

#### A: 初回起動オンボーディング

- **settings/types.ts / defaults.ts**: `onboardingCompleted` / `onboardingVersion` を追加
- **App.tsx**: 初回起動時、`onboardingCompleted=false` の場合に設定ウィンドウを開く
- **SettingsApp.tsx**: 「はじめに」タブを追加し、未完了時はOnboardingを初期表示
- **OnboardingPage.tsx**: 初回設定UIを追加
  - Welcome
  - Privacy / Local-first
  - AI Engine
  - Behavior
  - Window / Controls
  - Finish
- 完了またはスキップで `onboardingCompleted=true` / `onboardingVersion=1` を保存
- 完了後も設定画面の「はじめに」タブから再表示可能

#### B: v0.1.48 Field QA結果を反映

- **v0.1.48 実機確認**: idle / speech / drag / speech中drag のすべてでキャラ下半分が消えないことを確認
- `wh/client/vh = 200x280` 固定、stage / wrapper / surface / img / alpha は viewport 内
- compact speech layout を採用
- 410px expanded window案、dynamic resize `280→410`、always expanded `410px` は不採用として記録
- transparent WebView / layered window では 410px window 下部領域のsprite描画が壊れる実機結果があるため、今後この方向へ戻さない

#### C: 維持したもの

- v0.1.48 の compact 200x280 window / speech compact layout
- character-stage bottom anchor / background render surface
- DebugMode / 設定画面アップデート / UpdateBadge hit test
- ContextMenu / DebugOverlay 重なり修正
- click-through / drag / voice long press / Active App / Ollama

## [0.1.48] — 2026-05-13

### Fixed (Hotfix: Compact Speech Layout)

#### A: v0.1.47 always expanded window化を撤回

- **v0.1.47 実機結果**: 常時 `200x410` では idle / speech / drag / speech中drag の全状態でキャラ下半分が消えた
- **判断**: 410px高の transparent companion window 下部にspriteを置く設計自体が現在の実機環境では危険
- **App.tsx / lib.rs / tauri.conf.json**: companion window height を常時 compact `280px` に戻した
- speech表示時も `410px` へ広げず、dynamic resizeも行わない

#### B: compact window内speech layout

- **App.tsx**: expected `windowH` を常時 `COMPANION_COMPACT_H` に変更
- **lib.rs**: `resize_companion` の target height を常に character window height に固定
- **index.css**: speech bubble を compact window 内に収めるため最大高さを制限し、本文を最大3行で省略
- speech bubble は引き続き character-stage の頭上基準に表示

#### C: 維持したもの

- `SPEECH_VISIBLE: AtomicBool` による明示hit test状態
- window height推測に戻さず、speech=false時の上部透明領域click-throughを維持
- v0.1.47 の DebugOverlay / ContextMenu 重なり修正
- v0.1.46 の background render surface / sprite debug
- 設定画面アップデート、UpdateBadge hit test、DebugMode
- ContextMenu / drag / voice long press / Active App / Ollama

## [0.1.47] — 2026-05-13

### Fixed (Hotfix: Always Expanded Transparent Window)

#### A: speech表示時のdynamic resizeを停止

- **v0.1.46 debug結果**: expanded `200x410` でも `stage` / `wrapper` / `surface` / `img` / `alphaRect` は viewport 内に収まり、`OVER` は出ていなかった
- **判断**: `<img>` / `background-image` / sprite alpha bbox / window height不足 / work area clamp より、transparent WebView の 280→410 dynamic resize 後に旧compact height付近で内部clipされる可能性が高い
- **lib.rs**: `resize_companion` の target height を speech表示状態に関係なく `CHAR_WINDOW_H_LOGICAL + BUBBLE_WINDOW_H_LOGICAL` に固定
- **tauri.conf.json**: companion初期heightを `410` に変更
- **App.tsx**: debug expected `windowH` を常時 expanded height に変更
- speech表示/非表示では window height を変えず、sizeScale変更時のみbounds同期する設計にした

#### B: speech visible を明示状態でhit testへ同期

- **lib.rs**: `SPEECH_VISIBLE: AtomicBool` を追加
- `resize_companion(speechVisible, sizeScale)` で `SPEECH_VISIBLE` を更新
- Windows hit test は window height からspeech表示を推測せず、`SPEECH_VISIBLE` を参照
- 常時expanded windowでも speech=false 時は bubble hit を無効化し、上部透明領域click-throughを維持
- ContextMenu中のみ全域interactive、UpdateBadge表示中のみbadge領域interactiveの設計は維持

#### C: DebugOverlayとContextMenuの重なりを修正

- **DebugOverlay.tsx**: `suspended` propを追加
- **App.tsx**: ContextMenu表示中はDebugOverlayを一時停止
- デバッグモードON時でも右クリックメニューと「アプリ終了」がdebug文字列に隠れないようにした

#### D: 維持したもの

- v0.1.46 の background render surface / sprite debug
- v0.1.44 の設定画面アップデート機能 / UpdateBadge hit test
- v0.1.43 の speech bubble character relative anchor
- root `100vw/100vh`、character-stage bottom anchor、Character実描画sizeScale同期
- ContextMenu / click-through / drag / voice long press / Active App / Ollama

## [0.1.46] — 2026-05-13

### Fixed (Hotfix: Sprite Render Surface)

#### A: expanded transparent WebViewでのsprite描画欠け対策

- **v0.1.45 debug結果**: speech表示時も `stage` / `wrapper` / `img` / `alpha` は viewport 内に収まっていた
- **判断**: window / viewport / work area clamp / stage配置 / wrapper配置 / sprite alpha bbox は直接原因ではなさそう
- **Character.tsx**: spriteの実表示を `<img>` から `background-image` の `div.character-sprite-surface` に変更
  - `<img>` は preload / fallback / debug用に透明状態で保持
  - `backgroundSize: 100% 100%`
  - `backgroundPosition: center bottom`
  - `imageRendering: pixelated`
  - `transform: translateZ(0)`
  - `backfaceVisibility: hidden`
  - `willChange: transform`
- **index.css**: `character-wrapper` / `character-anim` / sprite surface に `overflow: visible`、`isolation: isolate`、`backface-visibility` を追加
- **DebugOverlay.tsx**: `renderMode=background` と sprite surface rect を表示

#### B: 維持したもの

- window height増加、speechSafetyLift、work area clamp変更は行っていない
- v0.1.45 の img / alpha bbox debug は維持
- root `100vw/100vh`、character-stage bottom anchor、speech bubble頭上基準、UpdateBadge hit test、設定画面アップデートは維持

## [0.1.45] — 2026-05-13

### Changed (Diagnostic: Sprite Render Debug Instrumentation)

#### A: Character内部のスプライト描画debugを追加

- **目的**: v0.1.44 の実機debugで、speech表示時も `stage` / `wrapper` は viewport 内に収まっていることが確認された
- **判断**: 現在の見切れは window / viewport / work area clamp ではなく、Character内部の `<img>` 描画、sprite URL、PNG alpha bbox、CSS animation / transform / object-fit / WebView合成を疑う
- **Character.tsx**: sprite `<img>` に `character-sprite-img` class と `data-sprite-url` を追加
- **DebugOverlay.tsx**: debug mode ON時に以下を表示
  - `effectiveState`
  - current sprite URL
  - img rect
  - naturalWidth / naturalHeight / complete
  - CSS animationName / animationDuration
  - CSS transform / transformOrigin
  - objectFit / objectPosition
  - canvasで測定した alpha bbox
  - alpha bbox の画面上rect
  - img / alpha が viewport を超えた場合の `OVER`

#### B: 見た目修正はまだ入れない

- v0.1.45 は診断版であり、speech時キャラ見切れ修正完了版ではない
- window height増加、speechSafetyLift、Character全体の上方向補正は入れていない
- 実機スクショで `speaking.png` / `nat=160x160` / img・alpha bottom / `char-speak` の状態を確認してから修正方針を決める

## [0.1.44] — 2026-05-13

### Fixed (Hotfix: Settings Updater / Debug Mode / Hit Test QA)

#### A: 設定画面から更新確認・インストールできる導線を追加

- **背景**: v0.1.43 実機確認で companion window 上の UpdateBadge が表示されても押せないことがあった
- **SettingsApp.tsx**: 「アップデート」タブを追加
- **UpdatePage.tsx**: `get_app_version` / `check_for_updates` / `install_update` を使い、通常の設定ウィンドウから更新確認とインストール再起動を実行できるようにした
- companion 上の UpdateBadge は補助通知として維持

#### B: UpdateBadge の Windows hit test を追加

- **原因候補**: UpdateBadge は DOM button だが、Rust 側 hit test が badge 領域を interactive にしていなかったため OS レベルでクリックが背面へ抜けた可能性が高い
- **lib.rs**: `UPDATE_BADGE_VISIBLE` / `set_update_badge_visible(visible)` を追加
- **App.tsx**: update badge の表示状態を Rust へ通知
- **lib.rs**: `update_badge_hit` を character 上基準で追加し、表示中だけ `bubble_hit || character_hit || update_badge_hit` にした
- 非表示時は hit area を作らず、上部透明領域 click-through は維持

#### C: 設定ON/OFF可能なデバッグモードを追加

- **settings/types.ts / defaults.ts**: `debugModeEnabled` を追加。デフォルトOFF
- **SettingsApp.tsx / DebugPage.tsx**: 「デバッグ」タブを追加
- **DebugOverlay.tsx**: 本番ビルドでも設定ON時だけ overlay を表示
  - viewport / client / visualViewport
  - character-stage / character-wrapper / speech-layer / update-badge / hit-target rect
  - `wrapper.bottom` / `stage.bottom` が viewport を超えているか
  - hasSpeech / isDragging / scale / expected window size
  - updater state
  - last AI result source (`ollama` / `fallback` / `mock` / `rule` / `none`)
- overlay は `pointer-events: none` で通常操作を妨げない

#### D: speech表示時のキャラ見切れは原因特定を優先

- v0.1.43 実機確認で、吹き出し位置は改善したが、クリック後発話・自発発話・speech中dragでキャラ下半分が見切れることが判明
- 原因はまだ断定しない
  - expanded window時の work area clamp
  - WebView viewport / outer / inner / CSS 100vh のズレ
  - speaking animation bbox
  - root `overflow:hidden`
  - React layout と Rust hit test 定数のズレ
- 今回は window height 増加や `SPEECH_CHARACTER_LIFT` の暫定補正は入れず、debug overlayで実機QA時に原因を見られる状態にした

#### E: 維持したもの

- v0.1.43 の speech bubble character relative anchor
- v0.1.42 の root `100vw / 100vh`、character-stage bottom anchor、resize拡大順序
- v0.1.41 の Character実描画 sizeScale 同期
- ContextMenu / click-through / PNG透明余白hit改善 / drag / voice long press
- Active App / Transparency UI / Ollama source と PromptBuilder / QualityFilter

## [0.1.43] — 2026-05-13

### Fixed (Hotfix: Speech Bubble Relative Anchor)

#### A: 吹き出しがwindow上端に離れすぎる問題を修正

- **実機確認結果**: v0.1.42 で通常idle、drag、speech表示時のキャラbottom anchorは改善した
- **残問題**: キャラ自体は沈んでいないが、吹き出しがwindow上部に出すぎてキャラと大きく離れていた
- **原因**: v0.1.42でキャラは `character-stage` の absolute bottom anchor になったが、speech bubble / TinyWhisper は `top: 10` のwindow top anchorのままだった
  - expanded window内で、キャラと吹き出しが別々の基準点を持っていた
- **companionLayout.ts**: `SPEECH_BUBBLE_GAP = 8` / `SPEECH_BUBBLE_HIT_H = 96` を追加
- **App.tsx**: speech layer を `top: 10` から `bottom: bottomPad + characterH + gap` へ変更
  - 吹き出しとTinyWhisperをキャラ頭上付近に表示
  - root `100vw / 100vh` と character-stage bottom anchor は維持
- **App.tsx**: DEV layout debug に speech layer bbox を追加

#### B: Rust hit test の bubble 判定をキャラ相対へ変更

- **lib.rs**: bubble hit area をwindow上端基準から `char_top - gap` 基準へ変更
- tail部分もクリック可能にするため、bubble bottom側に小さな余白を許可
- ContextMenu表示中のみ全域interactive、通常時は「吹き出し + キャラ楕円」の設計を維持
- 吹き出し非表示時の上部透明領域 click-through は維持

#### C: v0.1.42 の改善を維持

- root `100vw / 100vh`
- `character-stage` absolute bottom anchor
- `resize_companion` 拡大時 `set_position → set_size`
- drag reaction 遅延
- v0.1.41 の Character実描画 sizeScale 同期
- ContextMenu / Active App / Ollama / Transparency UI は変更なし

## [0.1.42] — 2026-05-13

### Fixed (Hotfix: Speech Resize Bottom Anchor)

#### A: 吹き出し表示時のキャラ沈み込みを修正

- **実機確認結果**: v0.1.41 で通常idle表示と再起動後の位置復元は改善したが、吹き出し表示時にキャラが下へ沈んで切れる問題が残った
- **原因**: React root が `hasSpeech=true` になった瞬間に予測 `windowH` を使って flex-end 配置していた
  - Tauri window / WebView viewport の実リサイズは `resize_companion` invoke 後に起きるため、React layout と実viewportの間に短い不一致が発生していた
  - Rust 側も expanded へ拡大する際に `set_size → set_position` の順だったため、一瞬 window bottom が下へ伸びてキャラが沈む可能性があった
- **App.tsx**: root を `100vw / 100vh` の実viewport基準に変更
- **App.tsx**: `character-stage` を flex layout から `position:absolute; bottom: bottomPad; left:50%` の bottom anchor に変更
  - 吹き出し表示/非表示で stage の bottom が変わらない
  - v0.1.41 の `Character` 実描画 sizeScale 同期は維持
- **lib.rs**: `resize_companion` の拡大/縮小順序を分岐
  - 拡大時: `set_position → set_size`
  - 縮小時: `set_size → set_position`
  - compact→expanded 移行時に window bottom が一瞬下へ伸びないようにした

#### B: drag中の speech resize 競合を抑制

- drag reaction を drag開始時ではなく、drag終了後に短く遅延して発火するよう変更
- OSネイティブdrag中に `triggerSpeak()` → `hasSpeech=true` → `resize_companion` が走る競合を避けた
- drag保存座標は従来通り window top-left を保存し、work area clamp / bottom anchor resize に任せる

#### C: DEV debug を追加

- **App.tsx**: DEV限定で viewport / computed layout / character-stage bbox / character-wrapper bbox を console log
- **lib.rs**: debug build限定で `resize_companion` 前後の outer/inner position/size、target size、computed bottom anchor を stderr log
- 通常UIにdebug表示や枠線は出さない

#### D: v0.1.40 / v0.1.41 の成功部分は維持

- ContextMenu の上方向 clamp / `アプリ終了` / context menu中全域interactive は変更なし
- Active App取得 / Bitwig `daw` 認識 / Transparency UI は変更なし
- PromptBuilder / QualityFilter / Ollama default URL / `source: ollama` は変更なし
- 上部透明領域 click-through、PNG透明余白クリック改善、Character実描画 sizeScale 同期は維持

## [0.1.41] — 2026-05-13

### Fixed (Hotfix: Character Rendering Anchor)

#### A: キャラクター描画サイズと visual anchor の不一致を修正

- **原因**: v0.1.40 で App 側の `character-stage` / window bounds は `settings.sizeScale` で縮尺されていたが、`Character.tsx` の wrapper / img / fallback は `DEFAULT_CHARACTER_CONFIG` の `160×160` 固定で描画されていた
  - `sizeScale < 1` では stage/window が縮む一方で sprite は 160px のままになり、root window の `overflow: hidden` で下端が切れる可能性があった
  - Rust hit test は `160×160 * sizeScale * DPI` 前提のため、React 実描画と hit test bbox もずれていた
- **companionLayout.ts**: `CHARACTER_SPRITE_W/H = 160` を明示し、App 側の visual bbox と Rust 側 hit test 前提を合わせた
- **App.tsx**: `Character` に scaled `width/height` を渡し、stage と実描画サイズを一致させた
- **Character.tsx**: wrapper / sprite img / SVG fallback が渡された実描画サイズを使うよう変更
- **index.css**: `character-wrapper` / `character-anim` の `transform-origin` を `center bottom` に固定し、状態アニメーションの拡大が下端側へはみ出しにくいよう調整

#### B: drag / speech resize の前提を維持

- drag の保存座標は v0.1.40 と同じく window top-left のまま維持
  - visual bbox が window 内に収まる構造に戻したため、追加の座標補正は入れない
- `resize_companion(speechVisible, sizeScale)` の bottom anchor 方式は維持
  - compact / expanded 切替で window 下端を固定し、React 側でもキャラ visual bottom が `window bottom - bottomPad` になるよう揃えた
- Rust hit test の楕円判定は、React 側の scaled sprite bbox と同じ `160×160 * sizeScale` 前提に戻ったため変更なし

#### C: v0.1.40 の成功部分は維持

- ContextMenu の上方向 clamp / `アプリ終了` の押しやすさは変更なし
- Active App取得 / Bitwig `daw` 認識 / Transparency UI は変更なし
- PromptBuilder / QualityFilter / Ollama default URL / `source: ollama` は変更なし
- 上部透明領域 click-through と PNG透明余白クリック改善は維持

## [0.1.40] — 2026-05-13

### Fixed (Hotfix: Character Layout and Context Menu)

#### A: キャラクター下端のめり込み/ドラッグ時の見切れを修正

- **layout定数の一元化**: `src/constants/companionLayout.ts` を追加
  - compact: `200×280`
  - expanded: `200×410`
  - character bottom padding: `24px`
  - context menu bounds: `150×112`
- **App.tsx / lib.rs**: `settings.sizeScale` を React 側だけでなく Rust `resize_companion` にも渡すよう変更
  - v0.1.39 では React 側の中身だけが scale され、Tauri window bounds が 240px 固定のままになる可能性があった
  - `sizeScale` は `0.75〜1.5` に clamp して、壊れた保存値でも window が極端にならないようにした
- **lib.rs**: compact height を 240 → 280 論理pxに変更
  - 160px sprite、touch/speaking/thinking animation、voice dot、bottom padding を安全に収める
- **lib.rs**: `resize_companion` で width/height を DPI scale と `sizeScale` の両方に合わせて設定
- **lib.rs**: 保存済み/ドラッグ後の window top-left を monitor work area 内に clamp
  - 旧バージョンの小さい window height で保存された座標を復元しても、下端が画面外へ沈まない
  - drag 終了時に画面外へ出ていた場合は、保存前に window を work area 内へ戻す
- **useWander.ts**: wander の画面内判定に現在の `window.outerWidth/outerHeight` を使うよう修正

#### B: 右クリックメニューの下方向見切れを修正

- **ContextMenu.tsx**: hardcoded `300px` window height を廃止し、実際の companion window height を受け取って clamp
  - キャラ下部で右クリックした場合はメニューを上方向へ開く
  - `アプリ終了` が window 外へ見切れないようにした
- **lib.rs / App.tsx**: context menu 表示中は hit test を window 全体 interactive に切り替え
  - v0.1.39 の楕円 hit test のままだと、メニュー項目が楕円外に出た時にクリックが背面へ抜ける可能性があった
  - メニューを閉じると通常の楕円 hit test / click-through に戻る
- メニュー項目の文言を `終了` → `アプリ終了` に変更

#### C: v0.1.39 の成功部分は維持

- SettingsApp / TabErrorBoundary / TransparencyPage defensive rendering は変更なし
- Active App debug / camelCase serde / Bitwig `daw` 認識は変更なし
- PromptBuilder / QualityFilter / Ollama default URL は変更なし
- PNG透明余白クリック改善の楕円 hit target は維持

## [0.1.39] — 2026-05-13

### Fixed (Hotfix: Character Layout, Transparent Hit Area, Foreground Debug)

#### A: キャラクター下端のめり込み/切れを修正

- **tauri.conf.json**: companion 初期ウィンドウ高さを 220 → 240 論理pxに変更
- **lib.rs**: `CHAR_WINDOW_H_LOGICAL` を 240 に統一し、`resize_companion` の compact/expanded 高さを 240 / 370 に変更
- **App.tsx**: ウィンドウ高さ、キャラクター描画枠、下端 padding を定数化
  - 160px スプライト + 状態アニメーション + voice dot + 下端余白が 240px 内に収まるよう調整
  - 吹き出し表示時も Rust 側 resize と App 側 layout が同じ論理px体系になるよう揃えた
- ドラッグ終了時の保存座標は v0.1.38 の「ウィンドウ上端をそのまま保存」を維持
  - `resize_companion` が下端 anchor でリサイズするため、保存座標の追加補正は入れない

#### B: PNG透明部分クリック判定の現実的改善

- **App.tsx / Character.tsx / index.css**: キャラクター描画レイヤーと hit target レイヤーを分離
  - sprite 本体は `pointer-events: none`
  - クリック/drag/voice long press はキャラ本体に近い楕円状 hit target で受ける
  - 画像矩形全体ではなく、実体に近い範囲だけが DOM のクリック対象になる
- **lib.rs**: Windows の cursor hit test をウィンドウ矩形全体から「吹き出し領域 + キャラ楕円」に変更
  - キャラPNGの透明余白や上部透明領域では `set_ignore_cursor_events(true)` になり、背面クリックが通りやすくなる
  - 完全なピクセル単位 alpha hit test は未実装。必要なら将来 Rust 側 alpha mask で対応

#### C: Active App Raw Foreground Debug 改善

- **observation/mod.rs**: 観測系 Serialize struct に `#[serde(rename_all = "camelCase")]` を追加
  - `hwnd_raw` → `hwndRaw`
  - `process_name` → `processName`
  - `active_app` → `activeApp`
  - `fullscreen_likely` → `fullscreenLikely`
- **TransparencyPage.tsx**: debug 結果を snake_case / camelCase 両対応で normalize
  - `undefined` と `0` を区別し、`hwndRaw` 未受信は「フィールド未受信」、0 は `NULL(0)` と表示
  - raw JSON preview と `console.log("[active-app-debug]", data)` を追加
  - 3秒後キャプチャの説明を「3秒以内に対象ウィンドウをクリックしてアクティブ化」に明確化

#### D: Ollama 返答品質は維持

- PromptBuilder / QualityFilter / Ollama default URL は変更なし
- `source: ollama` の改善、`http://127.0.0.1:11434` default、時刻偏重抑制は維持

### Notes

- v0.1.38 で解決した設定画面白画面対策 (SettingsApp ErrorBoundary / TransparencyPage defensive rendering) は維持
- 実機確認前の進捗は控えめに更新。キャラ切れと hit target が実機で改善したら次フェーズへ進む

## [0.1.38] — 2026-05-13

### Fixed (Hotfix: Settings Crash, Character Clipping, AI Reply Repetition)

#### A: 設定画面の白画面クラッシュ修正

- **SettingsApp.tsx**: `TabErrorBoundary` クラスコンポーネントを追加し、各タブを ErrorBoundary で保護
- **TransparencyPage.tsx**: `ActiveAppDebugPanel` を防御的に書き直し
  - `fetchingRef` / `intervalRef` で useRef ベースの二重fetch防止・クリーンアップ対応
  - `fmtHwnd()` で hwndRaw が null/undefined/0 の場合も安全に表示
  - 全フィールドに null チェックと fallback 値を追加

#### B: キャラクタークリッピング修正 (DPI対応)

- **tauri.conf.json**: 初期ウィンドウ高さ 180 → 220 (論理ピクセル)
- **lib.rs**: `CHAR_WINDOW_H` / `BUBBLE_WINDOW_H` を論理ピクセルの float 定数に変更
  - `window.scale_factor()` で DPI スケールを取得し、物理ピクセルに変換してからリサイズ
  - 125% DPI 環境でのキャラクタークリッピングを根本解決
- **App.tsx**: `CHAR_H` を 180 → 220 に合わせ変更
- **App.tsx**: ドラッグ終了後の位置保存を簡素化 (hasSpeechRef 補正を削除)

#### C: AI 返答の単調化・時刻偏重を修正

- **PromptBuilder.ts**: トリガー別ヒント (`triggerHint()`) を追加
  - click: 時刻への言及不要を明示
  - idle/observation/wake/return/voice ごとに異なるヒント
- **PromptBuilder.ts**: 時刻帯を後方へ移動し、ラベルを「時刻帯 (参考)」に変更
- **PromptBuilder.ts**: 直近3件の発話を「繰り返し厳禁」として context に追加
- **PromptBuilder.ts**: システムプロンプトに click 時の良い例を追加
  - 「ここにいる」「また来たの」「うん、聞こえてる」「少しだけ起きた」等
- **PromptBuilder.ts**: 「夜・朝・昼など時刻帯に毎回言及しない」をルールに追記
- **QualityFilter.ts**: `TRUNCATED_PATTERN` を緩和 (「でも」「に」等の自然な終止を許容)

---

## [0.1.37] — 2026-05-12

### Fixed / Improved (Companion Intelligence & Window Architecture)

#### A: Ollama default URL → `http://127.0.0.1:11434`

- 実機確認により `localhost` → timeout、`127.0.0.1` → 成功が判明
- `src/settings/defaults.ts` / `src/companion/ai/OllamaProvider.ts`: default URL を変更

#### B: PromptBuilder / QualityFilter 強化

- **PromptBuilder.ts**: 明示的な文字数制限 (理想20〜60文字、最大80文字) を追加
- **PromptBuilder.ts**: 英語禁止・"continued" 禁止を明示追加
- **PromptBuilder.ts**: 良い例・悪い例をシステムプロンプトに追記
- **QualityFilter.ts**: `too_long` → truncate でなく ok:false (拒否) に変更
- **QualityFilter.ts**: `continued` / 英単語4文字超 / 壊れた句読点 / 途中切れ の禁止パターンを追加
- **temperature**: OllamaProvider / ollama_chat Rust コマンドの temperature を 0.7 → 0.5 に変更

#### C: AI-first 自律発話

- **useCompanionState.ts**: 起動挨拶・自律独り言を AI-first に変更 (失敗時は固定テキストにフォールバック)
- **useObservationReactions.ts**: activity 遷移・メディア/ゲーム検出・longIdle を AI-first に変更
- システム通知 (update / error) は引き続き固定テキスト

#### D: Active App デバッグ改善 (3秒遅延キャプチャ)

- **observation/mod.rs**: `ActiveAppDebugInfo` に `hwnd_raw: u64` / `last_error_before: u32` を追加
- **observation/mod.rs**: API 呼び出し前に `SetLastError(0)` を追加 (誤検出防止)
- **TransparencyPage.tsx**: 「3秒後にキャプチャ」ボタン追加 (設定画面以外のウィンドウを前面にしてからキャプチャ)
- **TransparencyPage.tsx**: HWND raw 値・pre-call LastError 値を表示

#### E: ウィンドウリサイズ方式による当たり判定根本修正

- **tauri.conf.json**: window height 300 → 180 (キャラクター領域のみ)
- **lib.rs**: `resize_companion(speechVisible)` コマンド追加
  - 吹き出し非表示: 200×180、表示中: 200×310 に動的リサイズ
  - キャラクター底辺の画面座標を固定してリサイズ (位置ずれなし)
  - `set_speech_visible` / `SPEECH_VISIBLE` AtomicBool を削除
- **lib.rs**: hit test スレッド簡素化 — 常にウィンドウ全体を判定 (SPEECH_VISIBLE 分岐を削除)
- **App.tsx**: `set_speech_visible` → `resize_companion` に変更
- **App.tsx**: ドラッグ終了時の位置保存を吹き出し表示状態で補正 (charY を正確に保存)

---

## [0.1.36] — 2026-05-12

### Fixed (Field QA Root Cause Fixes — Round 2)

#### A: Ollama CORS 根本修正 — Rust 経由 HTTP でWebView CORS を回避

- **OllamaProvider.ts を Tauri invoke 経由に書き換え** (`src/companion/ai/OllamaProvider.ts`):
  - `fetch()` → `invoke("ollama_list_models")` / `invoke("ollama_chat")` に変更
  - Tauri WebView2 から `fetch()` で `http://localhost:11434` を叩くと Origin `tauri://localhost` に対して CORS が失敗することがある
  - Rust サイドから HTTP リクエストすることで CORS を完全に回避
  - `checkAvailability()` で model_not_found / timeout / network_error など詳細な失敗理由を返す
  - dev (ブラウザ) 環境では従来の `fetch()` にフォールバック
- **ollama_list_models / ollama_chat Tauri コマンド追加** (`src-tauri/src/lib.rs`):
  - ureq を使用した synchronous HTTP (spawn_blocking でラップ)
  - `/api/tags` → JSON 応答をそのまま返す
  - `/api/chat` → system / user メッセージを POST し応答 JSON を返す
- **ureq 2 依存関係追加** (`src-tauri/Cargo.toml`): `ureq = { version = "2", features = ["json"] }`
- **AIProviderManager: checkAvailability() 使用** (`src/companion/ai/AIProviderManager.ts`):
  - `isAvailable()` (boolean) から `checkAvailability()` (詳細 reason) に変更
  - `fallbackReason` に `model_not_found:X` / `exception:X` など具体的な原因が入る
- **AIPage にテストパネル追加** (`src/settings/pages/AIPage.tsx`):
  - ①モデル一覧取得: `/api/tags` を Rust 経由で叩く
  - ②Raw Chat テスト: 「OLLAMA_OK_123」プロンプトで実際の `/api/chat` を確認
  - ③コンパニオン発話テスト: 実際の AI パイプライン経由でテスト
  - エラー時にエラーメッセージを表示 (これまでは "接続失敗" のみ)

#### B: Active App 取得デバッグパネル追加

- **get_active_app_debug Tauri コマンド追加** (`src-tauri/src/lib.rs`):
  - フォアグラウンドプロセス取得の各段階 (hwnd→pid→OpenProcess→QueryName) を詳細に返す
  - `errorStage` / `errorCode` (Win32 GetLastError) を含む
- **ActiveAppDebugInfo 構造体追加** (`src-tauri/src/observation/mod.rs`):
  - `hwndAvailable` / `pidAvailable` / `openProcessOk` / `queryNameOk` の段階別フラグ
  - `processName` / `category` / `isSelfApp`
- **TransparencyPage にデバッグパネル追加** (`src/settings/pages/TransparencyPage.tsx`):
  - 各段階の成功/失敗を可視化
  - Win32 エラーコードを表示
  - 「設定画面が前面です」の警告

#### C: Hit Area 改善 — SPEECH_VISIBLE フラグによる動的 hit test

- **SPEECH_VISIBLE AtomicBool を lib.rs に追加**:
  - 吹き出し / TinyWhisper 表示中かどうかをスレッドセーフに保持
- **set_speech_visible Tauri コマンド追加** (`src-tauri/src/lib.rs`):
  - JS から吹き出し表示状態を Rust に通知
- **start_hit_test_thread 改善** (`src-tauri/src/lib.rs`):
  - `SPEECH_VISIBLE=false` (吹き出し非表示): ウィンドウ下部 190px のみを有効領域とする
  - `SPEECH_VISIBLE=true` (吹き出し表示中): 従来通り全高さを有効
  - キャラ上部の透明空白領域が背面クリックを奪わなくなる
- **App.tsx: tinyText/speechText 変化時に invoke("set_speech_visible") を呼ぶ** (`src/App.tsx`)

### Changed
- バージョン: 0.1.35 → 0.1.36

## [0.1.35] — 2026-05-12

### Fixed (Field QA Fixes before Onboarding)

#### 最優先A: AI Provider デバッグ可視化 / Ollama 実使用経路
- **OllamaProvider キャッシュバグ修正** (`src/companion/ai/AIProviderManager.ts`):
  - `_ollamaProvider` のキャッシュを廃止。毎回現在の設定 (ollamaModel, ollamaBaseUrl, ollamaTimeoutMs) で生成。
  - 旧バグ: 起動時に `llama3.2:3b` (デフォルト) でキャッシュされ、ユーザーがモデルを変更しても古いモデルが使われ続けていた。
- **LastAIResultDebug 状態追加** (`src/companion/ai/AIProviderManager.ts`):
  - `source: "ollama" | "rule" | "mock" | "fallback" | "none"` を毎回更新。
  - `fallbackReason`, `latencyMs`, `responsePreview`, `errorMessage` を記録。
  - `getLastAIResult()` / `subscribeLastAIResult()` でどこからでも参照可能。
- **LastAIResultDebug 型追加** (`src/companion/ai/types.ts`)
- **AIPage に接続テスト・モデル一覧・テスト発話・デバッグパネル追加** (`src/settings/pages/AIPage.tsx`):
  - 「接続テスト」ボタン: `/api/tags` を叩いて OK/NG を表示
  - モデル一覧: 取得済みモデルを一覧表示 (設定中のモデルをハイライト)
  - 「テスト発話」ボタン: 現在の AI engine 設定でテスト発話を実行
  - 最後のAI応答パネル: source / fallbackReason / latency / preview を表示
- **デフォルトタイムアウトを 8000ms → 20000ms に変更** (`src/settings/defaults.ts`)
- **OllamaProvider isAvailable タイムアウト 2000ms → 4000ms** (`src/companion/ai/OllamaProvider.ts`)

#### 最優先B: Active App 観測 / ActivityInsight 不明問題
- **classify_app 大幅拡充** (`src-tauri/src/observation/mod.rs`):
  - 自アプリ検出: `msedgewebview2.exe`, `amispi-companion.exe` → `"self"` カテゴリ
  - Spotify / MusicBee / foobar2000 / AIMP → `"media"` に追加
  - Bitwig Studio / FL64 / REAPER64 → DAW に追加・修正
  - Discord / Slack / Teams / Zoom → `"communication"` カテゴリ追加
  - explorer.exe → `"system"` 追加
  - メディアプレイヤー追加 (PotPlayer, KMPlayer等)
- **AppCategory 型に `"communication"` / `"self"` 追加** (`src/observation/types.ts`)
- **inferActivity で communication / self カテゴリを処理** (`src/companion/activity/inferActivity.ts`)
- **TransparencyPage デバッグ情報拡充** (`src/settings/pages/TransparencyPage.tsx`):
  - processName を表示
  - unknownReason を表示 (設定画面が前面 / プロセス名取得失敗 / 分類未登録)
  - アプリ種別を日本語ラベルで表示
  - **自動更新 (10秒ごと)** 追加。手動更新ボタンも維持。

#### 最優先C: キャラクター/吹き出しの当たり判定改善
- **App.tsx 外側コンテナを `pointer-events: none` に変更**:
  - 透明余白領域がバックグラウンドクリックを奪わなくなった
  - インタラクティブな要素 (drag-handle, 吹き出し, badges) のみ `pointer-events: auto`
- **吹き出し非表示時はコンテナ自体をレンダリングしない** (`src/App.tsx`):
  - `(tinyText || speechText)` がある時だけ吹き出しコンテナを表示
- **contextMenu イベントを drag-handle に移動** (pointer-events: none 親では受け取れないため)

#### 低優先D: VoicePage UI 改善
- **音声入力 ON 時に mode=off なら自動的に pushToTalk に設定** (`src/settings/pages/VoicePage.tsx`)
- **mode=off 状態の警告メッセージを追加**

### Changed
- `docs/PROGRESS_TRACKER.md`: v0.1.35 で ~68% に更新
- `docs/NEXT_SESSION.md`: 次フェーズ候補を更新
- `docs/FIELD_QA_NOTES.md`: 新規作成

## [0.1.34] — 2026-05-12

### Added (Milestone B 第2段階 — Character State Expression)
- **キャラクター状態アニメーション** (`src/styles/index.css`):
  - `character-anim--sprite[data-state]` セレクター: スプライト使用時のみ適用し SVG との二重アニメーションを防止
  - `thinking`: 上下フロート + 紫グロー pulse (1.8s cycle)
  - `speaking`: 上下ボブ + わずかなスケール変化 (0.8s cycle)
  - `sleep`: 縮小+下方向ドリフト + 低彩度・低輝度 dim (5s cycle)
  - `waking`: スケールアップ + 明度・彩度フラッシュ (1.5s ease-out)
  - `touched`: バウンス (0.35s ease-out)
- **音声インジケーター統合** (`src/components/Character.tsx`):
  - `voiceUIState` prop を新規追加
  - `voiceListening` / `voiceTranscribing` / `voiceResponding` 中にキャラクター内部へ colored dot を表示
  - リスニング: 赤い pulse dot / 変換中: オレンジの blink dot / 応答中: 緑の pulse dot
- **`VoiceUIState` 型を共有型に移動** (`src/types/companion.ts`):
  - `useCompanionState.ts` から `companion.ts` へ移動し後方互換のため再エクスポート
- **`character-anim` 内部ラッパー div**: `character-wrapper` の `scaleX(-1)` flip と CSS アニメーション `transform` の競合を分離

### Changed
- `src/App.tsx`: 旧来の voice dot 表示を削除し Character コンポーネントへ統合
- `docs/PROGRESS_TRACKER.md`: v0.1.34 で ~66% に更新
- `docs/NEXT_SESSION.md`: 次フェーズ候補を更新

## [0.1.33] — 2026-05-12

### Added (Milestone B 第1段階 — Memory Viewer and Local Data Control)
- **記憶タブ** (`src/settings/SettingsApp.tsx`): 設定画面に「記憶」タブを追加
- **Memory Viewer UI** (`src/settings/pages/MemoryPage.tsx`): 新規作成
  - ローカル保存のみである旨の説明 (外部送信なし)
  - Memory Stats Card: 総件数・今日のタップ/発話/起動・最古/最新時刻
  - Today's Summary Panel: DailySummary の自然文・起動時刻・経過時間・統計
  - Event Log Panel: 最新 50件 / タイプ別フィルタ (すべて/発話/タップ/起動/状態変化/メモ)
  - 削除コントロール: 発話ログのみ削除 / すべての記憶を削除 / 確認ダイアログ付き / 削除後自動更新
  - 更新ボタン
- **memoryStore.ts** 拡張:
  - `getAllEvents()`: 全イベント取得 (古い順)
  - `getEventsByType(type)`: タイプ別取得
  - `clearEventsByType(type)`: タイプ別削除
  - `getMemoryStats()`: 統計集計 (`MemoryStats` 型)
- **TransparencyPage.tsx**: フッターに「記憶」タブへの案内を追加
- **docs/MEMORY_AND_DATA_CONTROL.md**: 記憶の保存内容・削除方法・設計方針を記載

### Changed
- `docs/PROGRESS_TRACKER.md`: v0.1.33 で ~63% に更新
- `docs/NEXT_SESSION.md`: 次フェーズ候補を更新

## [0.1.32] — 2026-05-12

### Added (Milestone A 第2段階 — Contextual RuleProvider and Autonomous Speech Precision)
- **RuleProvider 文脈強化** (`src/companion/ai/RuleProvider.ts`):
  - activity kind 別のクリック/voice/observation 返答プール (12 activity × 3 trigger)
  - 重複防止: インスタンス内の rolling history で直近 2 発話を避ける
  - confidence < 0.5 のとき汎用 fallback へ切り替え
  - deepFocus / gaming / watchingVideo 中の idle trigger を自動抑制
  - voiceInput がある場合は voice 専用プールを使用
- **自律発話トリガー精度向上**:
  - `activityDelta.ts`: `InferredActivity` ベースの `inferredKindChanged`, `prevInferredKind`, `nextInferredKind` フィールド追加
  - `useObservationReactions.ts`: InferredActivity 遷移で発火
    - composing 開始 / coding 開始 / 音楽再生開始 / 離席から復帰
    - deepFocus / gaming / watchingVideo 中は全自律発話を抑制
  - `useCompanionState.ts`: scheduleIdleSpeech が deepFocus/gaming/watchingVideo 中に randomIdle を発火しない
- **reactions/types.ts**: `activityTransition` トリガー追加
- **reactionData.ts**: activity transition 反応 8 件追加 (tiny text, 30min cooldown)
- **Transparency UI — 発話制御パネル** (`settings/pages/TransparencyPage.tsx`):
  - 自律発話 ON/OFF 状態表示
  - 現在の抑制理由 (DND / quiet / focus / fullscreen / silent_activity / rateLimit 等)
  - 次の推定挙動 ("今は黙る" / "状態変化があれば小さく反応" 等)
- **Response Quality Guide** (`docs/RESPONSE_QUALITY_GUIDE.md`): 禁止表現・良い例・activity別方針

### Changed
- `src/companion/reactions/activityDelta.ts`: InferredActivity 計算を統合
- `docs/PROGRESS_TRACKER.md`: v0.1.32 で 56% に更新
- `docs/NEXT_SESSION.md`: Milestone A 第3段階への引継ぎ

## [0.1.31] — 2026-05-12

### Added (Milestone A 第1段階 — Contextual Companion MVP 基盤)
- **ActivityInsight 精度向上** (`src/companion/activity/inferActivity.ts`):
  - `reading` 種別追加 (browser + 30秒以上無入力)
  - `inputActiveRecently` 活用 (deepFocus confidence 向上)
  - `system.cpuLoad` を推定根拠 (high_cpu → ビルド中)
  - confidence 精緻化・reasons 粒度向上
- **DailySummary v1** (`src/companion/memory/dailySummary.ts`): 今日の活動パターン追跡
- **buildMemorySummary 改善**: DailySummary 統合で shortNaturalSummary を強化
- **PromptBuilder 改善** (`src/systems/ai/PromptBuilder.ts`):
  - confidence 修飾語 (おそらく/もしかしたら)
  - reasons 自然文変換・CPU シグナル追加
- **Transparency UI 改善** (`settings/pages/TransparencyPage.tsx`):
  - reasons タグ表示・CPU 表示
  - 「今日の記憶」パネル追加
- `docs/PRODUCT_COMPLETION_ROADMAP.md`: 製品完成形・非目標・マイルストーン計画
- `docs/PROGRESS_TRACKER.md`: 領域別進捗・バージョン履歴

## [0.1.30] — 2026-05-12

### Added (Phase 6b-real-1 — Local STT Recording Foundation)
- **実録音パイプライン**: Push-to-talk 中だけマイク録音 (常時監視なし)
  - `src/systems/voice/useVoiceRecorder.ts`: Push-to-talk 録音フック
    - `navigator.mediaDevices.getUserMedia` を長押し操作時のみ呼ぶ
    - 録音終了後に `stream.getTracks().stop()` でマイクを即解放
    - `maxDurationMs` 超過で自動停止 (デフォルト 15秒)
    - `RecorderError`: not_supported / permission_denied / no_microphone / recorder_error
  - `src/hooks/useCompanionState.ts`:
    - `voiceListeningStart()` — 録音開始時に voiceUIState を "voiceListening" へ
    - `requestVoiceFromBlob(blob)` — Blob → STT → AI の一連パイプライン
    - `voiceRecordingError(err)` — エラー時に voiceError → 3秒後 voiceReady/Off
  - `src/App.tsx`: mock transcript を実録音パイプラインに切替
- **STTAdapter 更新**: `STTInput = Blob | ArrayBuffer` 型追加
  - `src/systems/voice/MockSTTAdapter.ts`: STTInput 対応 (実録音 Blob を受取るが内容は無視)
- **WhisperCliSTTAdapter skeleton** (`src/systems/voice/WhisperCliSTTAdapter.ts`):
  - executable path / model path が設定済みかを確認
  - 未設定なら `isAvailable() = false` → MockSTTAdapter にフォールバック
  - Phase 6b-real-2 で Rust sidecar 統合予定
- **STTAdapterManager 更新**: `sttEngine` 設定でアダプターを切替 (mock/whisperCli)
- **STT 設定 UI** (`settings/pages/VoicePage.tsx`):
  - STT エンジン選択 (Mock / Whisper CLI)
  - Whisper executable path / model path / timeout 入力欄
  - 「現在 skeleton — path 設定のみ有効」警告

### Changed
- `settings/types.ts`: `STTEngine`, `sttEngine`, `whisperExecutablePath`, `whisperModelPath`, `whisperTimeoutMs`, `maxRecordingMs` 追加
- `settings/defaults.ts`: 対応するデフォルト値追加

### Design
- **常時マイク監視なし**: `getUserMedia()` は push-to-talk 長押し 500ms 後のみ
- **音声データ非保存**: Blob は STTAdapter.transcribe() で使い捨て
- **クラウド STT 禁止**: whisper.cpp もローカル実行のみ
- **安全なフォールバック**: STT 失敗・未設定時は reaction fallback

## [0.1.29] — 2026-05-12

### Changed (Phase 6a.5 — Context Wiring and Input Stabilization)
- **AIProvider インターフェース刷新**: `respond(input: AIProviderInput)` → `respond(ctx: CompanionContext)`
  - `OllamaProvider`: `EMPTY_SNAPSHOT` 依存を完全除去。実際の `CompanionContext` をそのまま使用
  - `MockProvider` / `RuleProvider`: シグネチャ変更、`CompanionContext` を直接参照
  - `AIProviderManager.getAIResponse`: 引数を `AIProviderInput` → `CompanionContext` に変更
- **変換ブリッジ除去**: `contextToProviderInput()` を削除。`useCompanionState` が `CompanionContext` を直接 provider に渡す
- **RuleProvider**: `CompanionContext` フィールドに合わせてルールロジックを更新
- **VoiceUIState 安定化**: `requestVoiceResponse` に finally ブロックを追加、例外時も `voiceReady` に戻る
- **Push-to-talk / ドラッグ競合修正**: `isDragging` が true になった時点で PTT タイマーをキャンセル

### Fixed
- Ollama がクリック・音声入力時に常に空の observation を使っていたバグを修正
  - `snapshotRef.current` の実際の状態が LLM プロンプトに反映されるようになった

## [0.1.28] — 2026-05-12

### Added
- **Phase 6a — Voice Input Foundation**: 音声入力の設定・状態・導線・mock transcript を実装
  - `voiceInputEnabled / voiceInputMode: "off" | "pushToTalk"` 設定追加
  - 設定ウィンドウに「音声」タブ追加 (`VoicePage.tsx`)
  - キャラクター長押し 500ms で push-to-talk 発火 (Phase 6a は mock transcript)
  - `requestVoiceResponse(transcript)` — transcript → CompanionContext.voiceInput → AI flow
  - Voice UI 状態: voiceOff / voiceReady / voiceListening / voiceTranscribing / voiceResponding
  - 録音中インジケーター (赤/橙/緑の小ドット)
- **Phase 6b 準備**: STTAdapter interface / MockSTTAdapter / STTAdapterManager 追加
  - `src/systems/voice/STTAdapter.ts` — interface と STTAdapterOutput 型
  - `src/systems/voice/MockSTTAdapter.ts` — 開発用ダミー
  - `src/systems/voice/STTAdapterManager.ts` — アダプター選択 (Phase 6b でエンジン切替)
  - `docs/VOICE_INTERACTION.md` — STT 候補比較・設計・プライバシーフロー

### Changed
- `PromptBuilder.ts`: voice trigger 時に `ユーザーの声: ...` をプロンプトに追加 (80文字上限)
- システムプロンプト: 「汎用 AI アシスタントとして振る舞わない」を明示追加
- ドキュメント同期: IMPLEMENTATION_PLAN.md / NEXT_SESSION.md / SAFETY_AND_PRIVACY_BOUNDARIES.md / LOCAL_LLM.md (新規) を v0.1.27 状態に更新

### Design
- **常時マイク監視なし**: Push-to-talk 操作中のみ録音 (Phase 6b 以降で実際の録音)
- **音声データ非保存**: transcript はセッション一時保持のみ、永続保存しない
- **クラウド STT 禁止**: すべてローカル処理 (whisper.cpp 等を Phase 6b で統合予定)

## [0.1.27] — 2026-05-12

### Added
- **Phase 3 — メディア認識** (`MediaContext`): Rust 側で起動中のメディアアプリ (Spotify/VLC 等) を検出し、バックグラウンド音楽再生・動画視聴を推定。再生内容は取得しない
- **Phase 4 — Transparency UI v2**: 設定ウィンドウの「無明が見ているもの」タブに現在の観測状態ライブパネル (活動推定・AI エンジン状態・Ollama 接続確認) を追加
- **Phase 5 — ウィンドウ位置の保存・復元**: ドラッグ後に位置を `settings.json` へ書き込み、次回起動時に自動復元。画面外補正あり

### Changed
- `ObservationSnapshot` に `media?: MediaContext` フィールドを追加
- `inferActivity`: バックグラウンド音楽アプリ検出で `listeningMusic` を推定するケースを追加
- `PromptBuilder`: 音楽・動画再生中の情報をプロンプトに反映
- `TransparencyPage`: 「見ていないもの」に画面キャプチャ・マイク・クリップボードを明示追加

## [0.1.26] — 2026-05-12

### Added
- **Local LLM 統合 (Phase 1+2)**: OllamaProvider を新設。`engine=ollama` 時に `localhost:11434` へ POST し、ローカル LLM で日本語発話を生成。クラウド送信なし
- **CompanionContext / ActivityInsight**: `inferActivity()` が ObservationSnapshot から作業状態を推定 (coding/browsing/gaming/watchingVideo 等 11 種)。全データを抽象化してから LLM へ渡す
- **PromptBuilder**: CompanionContext → プロンプト文字列変換。時刻帯・活動概要・idle 時間のみ。ウィンドウタイトル・URL・ファイル名は含めない
- **QualityFilter**: LLM 出力を 80 文字上限・禁止ワードで検閲。アシスタント文・医療語・URL を排除
- **SpeechPolicy**: DND / quietMode / focusMode / 全画面 / レート制限を純粋関数で判定してから LLM を呼ぶ
- **SpeechQueue**: 優先度つき発話キュー（0=自律, 1=観測, 2=システム, 3=手動）、30秒重複排除
- **AI エンジン設定 UI** (`settings/pages/AIPage.tsx`): engine 選択 (none/mock/ollama)、Ollama URL・モデル名・タイムアウトを設定ウィンドウで変更可能
- **設定ウィンドウ「AI エンジン」タブ**追加

### Changed
- `settings/types.ts`: `aiEngine` / `ollamaBaseUrl` / `ollamaModel` / `ollamaTimeoutMs` / 将来フェーズフラグを `CompanionSettings` に追加
- `AIProviderManager.ts` 書き直し: engine 別にプロバイダーを切り替え、Ollama 未起動時は fallback
- `useCompanionState.ts`: ObservationSnapshot を受け取り、SpeechPolicy → buildCompanionContext → getAIResponse の順に呼ぶ新フローに切り替え

## [0.1.25] — 2026-05-12

### Added
- **観測→反応の接続** (`useObservationReactions.ts`): スナップショットのデルタを計算し、意味ある遷移があったときだけ反応を1回発火するフックを新設
- **未実装トリガーの実装**: `fullscreenDetected` / `mediaDetected` / `gamingDetected` / `longIdle` を活性化 — 各状態への移行時のみ発火しポーリングごとの重複なし
- **`activityDelta.ts`**: ObservationSnapshot 間の差分を計算する純粋モジュール（テスト可能）
- **`tiny` displayMode** (`TinyWhisper.tsx`): 全画面・メディア・ゲーム中用のポインターイベントなし・小フォント・半透明の控えめ表示
- **連打反応** (`overClicked` トリガー): 5秒以内に5回クリックで特別台詞を発火。クールダウン3分
- **帰還反応** (`returnAfterBreak` / `returnAfterLongBreak`): 前回セッションからの経過時間をローカル記憶から判定し、起動挨拶を文脈に応じて切り替え
- **`memorySummary.ts`**: 休憩種別を分類する純粋ヘルパー（short / hours / longDay）
- **`clickPattern.ts`**: クリック連打検出の純粋モジュール
- **`emotionToSpriteState()`** (`Character.tsx`): `shy` / `concerned` 感情を既存スプライトにマッピングするユーティリティ関数
- 新反応台詞: `longIdle` 3件、`fullscreenDetected` 2件、`mediaDetected` 2件、`gamingDetected` 2件、`overClicked` 3件、`returnAfterBreak` 3件、`returnAfterLongBreak` 3件

### Changed
- App.tsx のインライン観測トリガー（Downloads/Desktop ハードコード）を削除 → `useObservationReactions` に移譲
- `useCompanionState` 初期化: 休憩あけ判定を挟み、通常挨拶の前に `returnAfterBreak` / `returnAfterLongBreak` を優先

## [0.1.24] — 2026-05-12

### Added
- **Reaction System 統合**: トリガー別 (click / wake / randomIdle / dragStart / timedGreeting) の反応選択エンジンを本番配線
  - クールダウン・時間当たり上限・fullscreen 抑制・quietMode/DND を自動適用
  - reaction に `cry` が設定されていれば自動で CryEngine を鳴らす
- `triggerDragReaction`: ドラッグ開始時の台詞 + 鳴き声を Reaction System 経由で発火
- `isFullscreen` を `useCompanionState` に渡し、全画面時の抑制を状態マシン内で完結

### Changed
- 台詞のフォールバック順序: `fireReaction(trigger)` → `pickDialogue/pickTimedGreeting`
- App.tsx の sleep 遷移 cry のみ残し、waking / speaking の cry は `reaction.cry` に移譲

## [0.1.23] — 2026-05-12

### Added
- 設定ウィンドウの右上に現在のバージョンを表示

## [0.1.22] — 2026-05-12

### Fixed
- 設定ウィンドウで変更した音量が再起動まで反映されない:
  `localStorage` の `storage` イベントでクロスウィンドウ同期するよう修正

### Changed
- デフォルト音量を 0.4 → 0.15 に下げた

## [0.1.21] — 2026-05-12

### Fixed
- 鳴き声が鳴らない: AudioContext をシングルトン化し、suspended 状態で `resume()` を呼ぶよう修正
- クリック音を useEffect ではなくクリックハンドラ直下で再生 (ユーザーgesture 文脈を確実に使用)
- エラーが silent failure していた: `catch {}` を `console.warn` に変更

## [0.1.20] — 2026-05-12

### Fixed
- 設定ウィンドウが 200px 幅に潰れる: `index.html` の `#root` 固定サイズを設定ページでは解除
- 鳴き声がまったく鳴らない: `cryEngine.play()` が未接続だった。状態遷移時 (touched/speaking/waking/sleep) に再生するよう追加

### Changed
- 自立発話のランダム独り言が「設定OFF」でも動いていた: `autonomousSpeechEnabled` 設定を正しく反映
- 移動方向に応じてスプライトを水平反転 (右移動時は `scaleX(-1)`)

## [0.1.19] — 2026-05-12

### Fixed
- `GetLastInputInfo` / `LASTINPUTINFO` は windows-sys 0.59 で
  `Win32::UI::WindowsAndMessaging` から `Win32::UI::Input::KeyboardAndMouse` に移動。
  Cargo.toml に `Win32_UI_Input_KeyboardAndMouse` フィーチャーを追加しインポートパスを修正。

## [0.1.18] — 2026-05-12

### Fixed
- Rust コンパイルエラー: windows-sys 0.59 の HWND / HANDLE / HMONITOR は `*mut c_void` 型のため、
  null チェックを `== 0` から `.is_null()` に修正
- RECT 構造体が `Default` を実装しないため、`Default::default()` を明示的なゼロ初期化に変更
- 不正な `impl GetTickCount64 {}` ブロックを削除

## [0.1.17] — 2026-05-12

### Added
- **観測基盤**: Windows API (GetForegroundWindow / GetLastInputInfo / GetWindowRect / SHGetKnownFolderPath) でアクティブアプリ・idle 時間・全画面判定・Desktop/Downloads ファイル数を取得
- **権限モデル**: Level 0〜4 の段階的観測権限。デフォルト Level 1 (ウィンドウタイトルなし)
- **PrivacyGate**: データを宛先・目的別にフィルタリング。cloud LLM へは常時ブロック
- **設定ウィンドウ**: 右クリック → 「設定...」または タスクトレイから開く 520×640 の独立ウィンドウ
- **透明性ページ**: 「無明が見ているもの / 見ていないもの」を一覧表示。権限のON/OFF切替も可能
- **動作設定ページ**: quiet / focus / DND / 全画面抑制 / 音量 / 発話頻度 など全設定を UI で変更可能
- **Reaction System**: トリガー別・クールダウン付き・時間当たり上限付きの反応選択エンジン
- **CryEngine**: Web Audio API ベースのシンセ鳴き声 (soft_beep / murmur / sleepy / surprised)。音声ファイル不要
- **RuleProvider**: ルールベース AI プロバイダー。Downloads 増加・Desktop 散乱・長時間 idle などを検出して短い提案を返す
- **AIProviderManager**: rule / mock を切り替え可能な抽象レイヤー。cloud はデフォルト無効
- **設定永続化**: AppConfig ディレクトリに settings.json として保存
- sysinfo クレートで CPU / メモリ使用率を取得

### Changed
- `shell:default` 権限を削除 (shell 実行機能は安全原則により禁止)
- `@tauri-apps/plugin-shell` / `@tauri-apps/plugin-fs` を依存から除去
- タスクトレイメニューに「設定...」を追加
- 自律発話のデフォルトを OFF に変更

### Security
- shell コマンド実行経路を完全に削除
- fs write / remove / rename 権限を capabilities から除去

## [0.1.16] — 2026-05-12

### Fixed
- 自動更新: Tauri v2 の updater フォーマットに合わせてワークフローを修正。
  `.nsis.zip` ではなく `.exe` + `.exe.sig` を使用し latest.json の URL を `.exe` に変更。

## [0.1.15] — 2026-05-12

### Fixed
- 自動更新: `createUpdaterArtifacts: true` を bundle 設定に追加。
  Tauri v2 はデフォルトでは .nsis.zip を生成しないため、自動更新に必要なアーカイブが作られていなかった。

## [0.1.14] — 2026-05-12

### Fixed
- 自動更新: tauri build が生成した .nsis.zip/.sig をビルドディレクトリから直接取得して使用。
  再作成が不要になり圧縮方式の互換性問題が解消される。

## [0.1.13] — 2026-05-12

### Fixed
- 自動更新: zip を再作成するのをやめ、tauri-action がビルド時に生成した .nsis.zip をそのまま使用。
  自前で再作成した zip の圧縮方式が Tauri updater と非互換だったため "Compression method not supported" が発生していた。

## [0.1.12] — 2026-05-12

### Fixed
- ドラッグ中のガガガガ: マウスが押されている間は Wander の move_window を停止するよう修正
- idle 表情が戻らない: OS ネイティブドラッグ後に isDragging が true のまま残る問題を修正。
  ドラッグ終了後の最初の mousemove イベントでリセットするようにした。

## [0.1.11] — 2026-05-12

### Fixed
- 自動更新: zip 圧縮方式を Compress-Archive から 7-Zip (Deflate) に変更。
  Tauri の zip ライブラリが非対応の圧縮方式だったため "Compression method not supported" エラーが発生していた。

## [0.1.10] — 2026-05-12

### Added
- システムトレイ: タスクバーに常駐アイコン。左クリックで表示/非表示、右クリックメニューから終了
- グローバルショートカット: Ctrl+Shift+Space で表示/非表示トグル
- 右クリックメニュー: アプリ上で右クリックするとオートスタート切替・終了メニューを表示
- ドラッグ中の表情変化: つかんでいる間は気づき表情に切り替わる
- 時間帯別挨拶: 朝/午後/夕方/深夜それぞれの起動挨拶を実装
- 台詞を日本語化: 無明らしい穏やかで少し距離感のあるトーンに統一

## [0.1.9] — 2026-05-12

### Fixed
- 自動更新: インストール失敗時にエラーメッセージをアラートで表示するよう変更 (デバッグ用)

## [0.1.8] — 2026-05-12

### Fixed
- クリック反応: mousedown 時点で即 startDragging() を呼んでいたため click イベントが発火しなかった問題を修正。
  5px 以上動いた場合のみドラッグ開始とし、動かずに離した場合は通常のクリックとして処理する。

## [0.1.7] — 2026-05-12

### Fixed
- クリック/ドラッグ不能バグ: mouseenter/leave ベースのクリックスルー切替を廃止。
  Rust スレッドで16msごとにカーソル位置をポーリングし、ウィンドウ上にいるときだけ
  クリックを有効にする方式に変更 (windows-sys の GetCursorPos を使用)

## [0.1.6] — 2026-05-12

### Fixed
- 自動更新: tauri-action が .nsis.zip を次ステップ実行前に削除するため、
  .exe から自前で zip を作成 → npx tauri signer sign で署名 → latest.json 構築

## [0.1.5] — 2026-05-11

### Fixed
- CI: Get-ChildItem -Filter のマルチ拡張子問題を Where-Object + regex に変更

## [0.1.4] — 2026-05-11

### Fixed
- ワークフロー: tauri-action に戻し、後続ステップで latest.json を手動構築・アップロード
  (直接 tauri build では .nsis.zip が生成されないことが判明)

## [0.1.3] — 2026-05-11

### Added
- 無明スプライト: rembg (AI背景除去) で透過処理した4表情を配置
- アプリアイコン: Mumyo.png から全サイズ (32/64/128/256px, ico, icns) を自動生成

## [0.1.2] — 2026-05-11

### Fixed
- 自動更新: latest.json をリリースに正しくアップロードするようワークフローを修正 (↑ ボタンが機能するようになる)
- キャラクタースプライト: 自動背景除去で顔が透けていたため一旦削除、SVGフォールバックを使用

## [0.1.1] — 2026-05-11

### Added
- 無明 (Mumyo) キャラクタースプライト: 4表情 (標準/落着き/気づき/強気) を各状態にマッピング
- Wander システム: idle/sleep 中にデスクトップを自律移動 (Shimeji スタイル random-walk)
- ランダム独り言: 2〜4分ごとに idle 中に一言発する

### Changed
- スリープ時の移動速度を idle の半分に (ゆっくり漂う)

## [0.1.0] — 2026-05-11

### Added
- Tauri v2 + React 18 + TypeScript プロジェクト初期化
- 透明・フレームレス・常時最前面ウィンドウ
- SVGフォールバック Spirit Orb キャラクター (状態別アニメーション)
- コンパニオン状態マシン: idle / touched / sleep / waking / thinking / speaking
- ドラッグ可能ウィンドウ
- 吹き出し (SpeechBubble) コンポーネント
- クリックスルー制御 (Tauri set_ignore_cursor_events)
- ダイアログシステム (プレースホルダーテキスト、差し替え可能)
- ローカルメモリイベントログ (localStorage)
- AIプロバイダー抽象インターフェース + モックプロバイダー
- スプライトアセットシステム (PNG → idle.png → SVG フォールバック)
- デバッグオーバーレイ (開発モードのみ)
- プロジェクトドキュメント一式 (docs/)
