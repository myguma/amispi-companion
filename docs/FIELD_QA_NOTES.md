# Field QA Notes

> v0.1.35 Field QA Fixes で修正を試みたが、実機では一部問題が残存。
> v0.1.36 Field QA Root Cause Fixes でさらに根本原因に対処した。

**更新: 2026-05-12 (v0.1.36)**

---

## v0.1.36 での修正内容 (実機確認待ち)

### 問題A': OllamaがWebView2からfetchできない (CORS)

**v0.1.35 の状態:** `isAvailable()` が `fetch('/api/tags')` で失敗 → `source: fallback, fallbackReason: unavailable`

**v0.1.35 での修正が不十分だった理由:**
- キャッシュバグは修正された (毎回 `new OllamaProvider()` を生成)
- しかし `fetch()` 自体が Tauri WebView2 環境で CORS エラーになる可能性があった
- Tauri WebView2 の Origin は `tauri://localhost` → Ollama のデフォルト CORS が拒否する場合がある
- この場合、接続テストでも接続失敗が出る

**v0.1.36 での修正:**
- `OllamaProvider` の `/api/tags` と `/api/chat` を `fetch()` から `invoke("ollama_list_models")` / `invoke("ollama_chat")` に変更
- Rust バックエンド (ureq) が HTTP リクエストを送る → CORS の問題が完全に消える
- AIPage のテストパネルも Rust 経由で実行

### 問題B': Active App が全部 None (HWND 取得段階が不明)

**v0.1.35 の状態:** `前面アプリを取得できませんでした` — どの段階で失敗しているか不明

**v0.1.36 での修正:**
- `get_active_app_debug` Tauri コマンドを追加
- hwnd → pid → OpenProcess → QueryFullProcessImageNameW の各段階で成功/失敗を個別記録
- Win32 `GetLastError()` のエラーコードを記録
- TransparencyPage に詳細デバッグパネルを追加

**実機確認手順 (v0.1.36):**
1. 設定 → 透明性タブを開く
2. 「アクティブアプリ取得 デバッグ」セクションを確認
3. Chrome / VSCode を前面にして「再取得」をクリック
4. errorStage が「成功 (ok)」になれば OK
5. 「open_process_failed」なら errorCode (Win32エラー) を報告してください

### 問題C': 上部透明空白が背面クリックを奪う

**v0.1.35 の状態:** `pointer-events: none` を CSS に設定したが、OS レベルでは効果がなかった

**v0.1.36 での修正:**
- Rust の `start_hit_test_thread` を改良
- `SPEECH_VISIBLE=false` (吹き出し非表示): 有効判定領域をウィンドウ下部 190px のみに制限
- `SPEECH_VISIBLE=true` (吹き出し表示中): 従来通り全高さを有効
- JS → Rust へ吹き出し表示状態を `set_speech_visible` コマンドで通知

**実機確認手順 (v0.1.36):**
1. キャラクター表示中、吹き出しが消えた状態でキャラ上部の透明空白をクリック
2. 背面のウィンドウ/URLが選択されれば OK
3. キャラ本体クリックが正常に動くことを確認
4. ドラッグが正常に動くことを確認

---

## 実機QAで見つかった問題一覧 (v0.1.34 → v0.1.35)

---

## 実機QAで見つかった問題一覧

### 問題A: Ollama API は正常なのにアプリが固定文しか返さない

**症状:**
- PowerShell から `POST /api/chat` を叩くと正常に応答が返る
- アプリで Ollama を選択してクリックしても `…なに？` のような固定文のみ
- どのプロバイダーが使われているか分からない

**根本原因:**

1. **OllamaProvider キャッシュバグ** (主因)
   - `AIProviderManager.ts` で `_ollamaProvider` をモジュール変数にキャッシュしていた
   - 初回呼び出し時にデフォルトモデル `llama3.2:3b` でキャッシュ
   - ユーザーが設定画面でモデルを `qwen2.5:3b-instruct-16k` に変更しても、キャッシュ済みの古いインスタンスが使われ続けた
   - `llama3.2:3b` がユーザーの環境に存在しないため、`/api/chat` が失敗 → `shouldSpeak: false` → RuleProvider fallback → `…なに？`

2. **フォールバックが無音で発生** (副因)
   - fallback 時に理由が UI に表示されなかったため、なぜ固定文になるか不明だった

3. **デフォルトタイムアウトが短い** (副因)
   - デフォルト 8000ms では低スペック PC や大きいモデルでタイムアウトする

**v0.1.35 での修正:**
- `_ollamaProvider` キャッシュを廃止。毎回 `getSettings()` から現在のモデル/URL/timeout を読んで `new OllamaProvider()` を生成
- `LastAIResultDebug` state 追加。source / fallbackReason / latency / preview を毎回記録
- AIPage に「接続テスト」「テスト発話」「最後のAI応答パネル」を追加
- デフォルト timeout を 20000ms に変更
- `isAvailable()` timeout も 2000ms → 4000ms に変更

---

### 問題B: Chrome / VSCode / Bitwig / Spotify など全て「不明」

**症状:**
- Transparency UI のアプリ種別が常に「不明 (unknown)」または「不明」
- 更新ボタンを押すと設定画面自身を見てしまう
- 活動推定が `unknown: 何かしている 30%` になる

**根本原因:**

1. **設定画面が前面 = 自分自身を観測**
   - Transparency UI の「更新」を押す瞬間、`GetForegroundWindow()` が設定ウィンドウを返す
   - 設定ウィンドウのプロセスは `msedgewebview2.exe` (Tauri の WebView2)
   - `classify_app` に未登録 → `"unknown"`

2. **アプリ名 classify_app 未登録**
   - `Spotify.exe` → 未登録 → `"unknown"` (detect_media の MUSIC_APPS にはあったが classify_app になかった)
   - `Bitwig Studio.exe` → 実際のプロセス名は `bitwig studio.exe` だが `bitwig.exe` でしか登録していなかった
   - `Discord.exe` → 未登録 → `"unknown"`

**v0.1.35 での修正:**
- `classify_app` を大幅拡充:
  - `msedgewebview2.exe` / `amispi-companion.exe` → `"self"` カテゴリ (新設)
  - `spotify.exe` / `musicbee.exe` / `foobar2000.exe` / `aimp.exe` → `"media"`
  - `bitwig studio.exe` / `fl64.exe` / `reaper64.exe` → `"daw"`
  - `discord.exe` / `slack.exe` / `teams.exe` / `zoom.exe` → `"communication"` (新設)
  - `explorer.exe` → `"system"`
- TypeScript `AppCategory` 型に `"communication"` / `"self"` を追加
- `inferActivity` で `communication` / `self` カテゴリを処理
- Transparency UI に `processName` を表示
- `unknownReason` を追加表示: 「設定画面が前面」「分類未登録」「プロセス名取得失敗」
- **10秒自動更新**を追加 (TransparencyPage マウント中のみ)

---

### 問題C: キャラの当たり判定が大きく背面クリックを邪魔する

**症状:**
- 吹き出しが表示されていない時も、上部の空白領域がクリックを吸収する
- 透明 PNG の余白部分でもクリックに反応する
- デスクトップウィジェットとして背面のウィンドウを選択しにくい

**根本原因:**
- App.tsx の外側コンテナ (200×300) が `pointer-events` を制限していなかった
- 透明背景でも WebView が DOM 要素として pointer イベントを捕捉する
- 吹き出し非表示時もコンテナ div が残り、上部 ~100px がクリックを奪っていた

**v0.1.35 での修正:**
- App.tsx 外側コンテナに `pointer-events: none` を設定
- インタラクティブな要素にのみ `pointer-events: auto`:
  - `drag-handle` (キャラクター本体)
  - 吹き出しコンテナ (tinyText または speechText がある時のみ表示)
  - UpdateBadge / ContextMenu
- 吹き出し非表示時はコンテナ div 自体をレンダリングしない

---

### 問題D: VoicePage の ON/OFF と mode の関係が不明瞭

**症状:**
- 「音声入力: ON」にしても「モード: OFF」のままだと録音されない
- この状態で「なぜ声が聞こえないのか」が分からない

**v0.1.35 での修正:**
- 音声入力 ON にした時、mode が `"off"` なら自動的に `"pushToTalk"` に設定
- mode=off 状態では警告メッセージを表示

---

## 再テスト手順 (v0.1.35 適用後)

### A: Ollama テスト
1. 設定 → AI タブ → エンジン: Ollama を選択
2. モデル名を `qwen2.5:3b-instruct-16k` に設定
3. 「接続テスト」ボタン → 「✓ 接続OK」が出るか確認
4. モデル一覧に `qwen2.5:3b-instruct-16k` が表示されるか確認
5. 「テスト発話」ボタン → `source: ollama` が出るか確認
6. キャラクターをクリック → 最後のAI応答パネルの source が更新されるか確認
7. Ollama を停止 → `source: fallback / reason: unavailable` が出るか確認

### B: Active app テスト
1. 設定 → 透明性タブを開く
2. Chrome を前面にして「手動更新」 → `browser (chrome.exe)` が表示されるか確認
3. VS Code を前面にして「手動更新」 → `IDE/エディタ (code.exe)` が表示されるか確認
4. Spotify を前面にして「手動更新」 → `メディア (spotify.exe)` が表示されるか確認
5. 設定画面自身が前面の時 → 「自アプリ (設定画面)」の警告が出るか確認
6. 10秒待つ → 自動更新されるか確認

### C: 当たり判定テスト
1. キャラクター上部の空白部分をクリック → 背面ウィンドウが選択されるか確認
2. 吹き出しが表示されていない時、吹き出し領域をクリック → 背面が反応するか確認
3. キャラクター本体クリック → 正常に反応するか確認
4. キャラクタードラッグ → 正常に移動するか確認
5. キャラクター長押し (0.5秒以上、音声入力 ON の場合) → 録音開始するか確認

### D: VoicePage テスト
1. 設定 → 音声タブ → 音声入力をON → モードが自動で pushToTalk になるか確認
2. モードを手動で OFF にした状態でONにした時の警告表示確認

---

## 未解決・将来の注意点

- OSレベルのピクセル透過 (透明 PNG の透明部分でのクリック透過) は CSS では完全解決不可。Tauri の `mouse_passthrough` オプションや WS_EX_TRANSPARENT が必要。今回は必須対応外として CSS/DOM レベルで改善した。
- Transparency UI の「更新」ボタンを押す瞬間は設定ウィンドウ自身が前面になり `"self"` と表示される。これは設計上不可避。10秒自動更新があるため、手動更新ボタン不要な場面が多い。
- Bitwig Studio の実際のプロセス名は `bitwig studio.exe` (スペース含み) だが環境によっては異なる可能性がある。実機確認推奨。
