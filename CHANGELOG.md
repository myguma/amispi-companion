# Changelog

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
