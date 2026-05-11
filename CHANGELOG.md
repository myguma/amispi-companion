# Changelog

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
