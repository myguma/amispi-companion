# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.27
**フェーズ:** Phase 5 完了

---

## ビルド確認

```
✅ npm run build → ✓ built
✅ cargo build → Finished dev profile
✅ v0.1.27 タグ push 済み
```

---

## 実装完了フェーズ

### Phase 0 ✅ — 計画ドキュメント
### Phase 1 ✅ — CompanionContext / SpeechPolicy / SpeechQueue / inferActivity
### Phase 2 ✅ — PromptBuilder / QualityFilter / OllamaProvider / AI 設定 UI
### Phase 3 ✅ — メディア認識 (MediaContext)
### Phase 4 ✅ — Transparency UI v2
### Phase 5 ✅ — ウィンドウ位置の保存・復元

---

## Phase 3 補足 (MediaContext)

- Rust: `detect_media()` が sysinfo でバックグラウンドプロセスを検索
- 音楽アプリ: Spotify / MusicBee / foobar2000 / Winamp / iTunes / TIDAL / AIMP
- 動画アプリ: VLC / MPC-HC / MPC-BE / mpv / PotPlayer / KMPlayer
- フォアグラウンド判定 (daw/media/browser+fullscreen) → バックグラウンドスキャンの順

## Phase 4 補足 (Transparency UI v2)

- `TransparencyPage.tsx` に `LiveStatusPanel` 追加
- 設定ウィンドウを開いたタイミングでスナップショットを一度取得
- 「更新」ボタンで再取得可能
- Ollama 接続確認は `OllamaStatus` コンポーネントが `fetch /api/tags` で実施

## Phase 5 補足 (位置保存)

- ドラッグ終了後 100ms 後に `getCurrentWindow().outerPosition()` を取得
- `invoke("save_window_position", { x, y })` → Rust が `settings.json` に書き込む
- 起動時: `settings.window_x/window_y` が存在し範囲内なら適用 (-500〜10000)
- フォールバック: デフォルト右下隅

---

## 次に実装すべきフェーズ

### Phase 6 — Voice Input (Push-to-talk)
```
- 常時マイク監視なし (DND/quietMode 中は完全無効)
- ボタン押下中のみ録音 → local STT
- Whisper.cpp または vosk を想定
- 録音データはセッション内のみ保持 (永続保存禁止)
- voiceInputEnabled: false がデフォルト
```

### Phase 7 — Optional Screen Understanding
```
- デフォルト OFF (screenUnderstandingEnabled: false)
- raw screenshot 保存禁止
- local VLM のみ (LLaVA / PaliGemma 等)
- 30秒ごとにキャプチャ → 即 VLM → テキストのみ保持
```

### Phase 8 — Optional TTS
```
- ttsEnabled: false がデフォルト
- 短文 (80文字以内) のみ読み上げ
- piper / VOICEVOX local のみ
```

---

## 既知の問題・注意事項

1. **OllamaProvider の snapshot 参照**
   - `OllamaProvider.respond(_input)` は `_input` を使わず
     `getSettings()` と `EMPTY_SNAPSHOT` で CompanionContext を再構築している
   - Phase 3 以降で実際の snapshot を渡せるようにする予定 (Phase 3+ 修正残り)

2. **sysinfo process 機能**
   - sysinfo 0.33 では `"process"` という feature 名は存在しない
   - `"system"` feature に含まれる (ProcessRefreshKind が使える)

---

## 絶対に壊してはいけない原則

```
✅ npm run build が通ること
✅ cargo build が通ること
✅ クリック反応が動くこと
✅ 既存の reaction system が動くこと
✅ DND/quietMode/suppressWhenFullscreen が効くこと
✅ Ollama 未起動時に fallback すること
✅ クラウドへのデータ送信がないこと
✅ ファイル書き換え・削除しないこと
✅ キーボード入力監視しないこと
✅ 常時マイク監視しないこと
```
