# Safety and Privacy Boundaries

AmitySpirit Companion / 無明 の安全原則と禁止事項を定める。

---

## 絶対禁止 (実装・設定変更不可)

| 禁止事項 | 理由 |
|---|---|
| クラウドへのデータ送信 | ローカルファースト原則 |
| 画面キャプチャのクラウド送信 | プライバシー |
| 音声録音のクラウド送信 | プライバシー |
| ファイル内容の読み取り | スコープ外 |
| クリップボードの読み取り | 秘密情報リスク |
| キーボード入力の記録 | キーロガー禁止 |
| 常時マイク監視 | 明示許可なし |
| ファイル削除・移動・リネーム | 自動操作禁止 |
| コマンド実行・shell 起動 | 既存禁止事項 |
| メール・SNS・ブラウザ操作 | 自動操作禁止 |
| 医療・精神状態の診断・断定 | 安全リスク |
| ユーザー行動スコア化 | 評価・監視禁止 |
| テレメトリ・外部ログ送信 | プライバシー |

---

## 明示許可制 (デフォルト OFF)

以下は設定画面でユーザーが明示的に ON にした場合のみ動作する:

| 機能 | デフォルト | 必要な許可 |
|---|---|---|
| ウィンドウタイトル取得 | OFF | settings.permissions.windowTitleEnabled |
| フォルダメタデータ | ON | settings.permissions.folderMetadataEnabled |
| ファイル名一覧 | OFF | settings.permissions.filenamesEnabled |
| メディアセッション情報 | OFF | settings.mediaAwarenessEnabled |
| 画面キャプチャ | OFF | settings.screenUnderstandingEnabled |
| OCR | OFF | settings.ocrEnabled |
| 音声入力 | OFF | settings.voiceInputEnabled |
| クラウド AI | OFF | settings.permissions.cloudAllowed (常にデフォルト OFF) |

---

## LLM に渡してよい情報

抽象化済みの情報のみ渡す:

```
✅ 渡してよい例:
- "browser 系の作業中"
- "全画面ではない"
- "Downloads にファイルがやや多い"
- "今日は調査時間が長め"
- "idle 30分超"

❌ 渡してはいけない例:
- 生URL
- ウィンドウタイトル (許可なし)
- ファイル名
- ファイル内容
- クリップボード内容
- 生スクリーンショット
- OCR全文
- 音声データ
```

---

## QualityFilter で拒否する出力パターン

LLM が生成したテキストに以下が含まれる場合は発話しない:

```
- "私はAIアシスタントです"
- "何かお手伝いできますか"
- "タスクを整理しましょう"
- "あなたは疲れています"
- "あなたは病気です"
- "治療が必要です"
- "依存しています"
- "うつ状態です"
- 外部URLへの誘導
- 個人情報への言及
- 長文 (80文字超)
```

---

## 音声入力の安全境界 (Phase 6+)

**許可される動作:**
- Push-to-talk のみ: キャラクター長押し 500ms 以上のみ録音開始
- `voiceInputEnabled: false` がデフォルト
- `getUserMedia()` は push-to-talk 操作時のみ呼ぶ
- 録音終了後に `stream.getTracks().forEach(t => t.stop())` でマイクを必ず解放
- 音声データ (Blob) は STTAdapter.transcribe() 内で使い捨て — 永続保存禁止
- transcript テキストは `CompanionContext.voiceInput` として一時保持のみ
- transcript は long-term memory に保存しない (speech_shown には source を記録可)
- 一時ファイルを使う場合 (Phase 6b-real-2 以降): 処理完了後に必ず削除
- whisper.cpp はユーザー指定のローカル executable のみ — クラウド API 禁止
- STT 処理失敗時はフォールバック (発話しないか reaction fallback)

**禁止事項:**
- 常時マイク監視 (voiceInputEnabled = true でも長押し操作なしに録音しない)
- 生音声データの永続保存
- クラウド STT (Google / Azure / OpenAI Whisper API 等) への送信
- マイク許可なしの録音
- transcript のクラウド送信
- 任意コマンド実行 API の作成 (whisper CLI は引数配列で安全に呼ぶ)
- shell 文字列連結による command injection

**マイク許可のフロー:**
```
voiceInputEnabled = false → getUserMedia() を呼ばない → 許可要求なし
voiceInputEnabled = true + long press 500ms → getUserMedia() 呼ぶ → OS が許可ダイアログ
許可拒否 → RecorderError("permission_denied") → voiceRecordingError() → 3秒後 voiceReady
```

**transcript のフロー:**
```
録音 Blob (一時) → STTAdapter.transcribe(blob) → transcript (テキスト)
    ↑ Blob はここで参照を手放す (GC に委ねる)
transcript → CompanionContext.voiceInput → AI → QualityFilter → SpeechBubble
    ↑ transcript は同 tick 内で使用、長期保持しない
```

**STT エンジンの安全方針 (Phase 6b-real-2 以降):**
```
Rust: std::process::Command (shell 経由でない)
引数: [executable_path, "--model", model_path, "--output-txt", audio_path]
      — 文字列連結でなく配列で渡す
temp_file: app_local_temp に書き、処理後 Drop impl で削除
stdout: transcript テキストのみ取得
stderr: ログのみ (外部送信なし)
timeout: 設定の whisperTimeoutMs (デフォルト 30s)
```

---

## 画面理解の安全境界 (Phase 7+)

**許可される動作:**
- screenUnderstandingEnabled: false がデフォルト
- ユーザーが明示 ON にした場合のみ動作
- キャプチャ画像は処理後に即破棄 (保存禁止)
- local VLM のみ (クラウド Vision API 禁止)
- VLM からは abstracted summary のみ取得

**禁止事項:**
- 生スクリーンショットの永続保存
- クラウドへの画像送信
- OCR 全文の保存 (abstracted summary のみ可)
- 常時キャプチャ (明示トリガーのみ)

---

## データ保存ポリシー

| データ種別 | 保存可否 |
|---|---|
| 活動種別 (abstracted) | ✅ 可 |
| 会話ログ (発話テキスト) | ✅ 可 (既存 speech_shown イベント) |
| app_start / click / state イベント | ✅ 可 (既存) |
| ウィンドウタイトル | ❌ 不可 |
| ファイル名・パス | ❌ 不可 |
| 生スクリーンショット | ❌ 不可 |
| OCR全文 | ❌ 不可 |
| 音声データ (生録音) | ❌ 不可 |
| マイク録音 (常時) | ❌ 不可 |
| transcript テキスト (長期) | ❌ 不可 |
| transcript テキスト (セッション一時) | ✅ 可 (CompanionContext.voiceInput として) |

---

## 診断・評価の禁止

無明は以下の判断を行わない:

- ユーザーの精神・心理状態の診断
- 生産性・集中度のスコアリング
- 行動パターンへの価値判断
- 「やりすぎ」「ダメ」等の否定表現
- 生活改善の強制・命令

観察した事実を静かに述べるに留める:

```
❌ "あなたは現実逃避しています。"
✅ "今日は見る時間が少し長いみたい。"

❌ "集中力が低下しています。"
✅ "調べものが渦になってる。"
```
