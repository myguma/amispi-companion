# Field QA Notes

> v0.1.35 Field QA Fixes で修正を試みたが、実機では一部問題が残存。
> v0.1.36 Field QA Root Cause Fixes でさらに根本原因に対処した。
> v0.1.39 では v0.1.38 実機確認で残った character layout / hit area / foreground debug を hotfix。
> v0.1.40 では v0.1.39 実機確認で残った character clipping / ContextMenu clipping を hotfix。
> v0.1.41 では v0.1.40 実機確認で残った character rendering anchor / scale 不一致を hotfix。
> v0.1.42 では v0.1.41 実機確認で残った speech表示時の沈み込みを hotfix。
> v0.1.43 では v0.1.42 実機確認で残った speech bubble のwindow top寄りすぎを hotfix。
> v0.1.44 では設定画面更新導線、UpdateBadge hit test、ユーザーON/OFF可能なdebug modeを追加。

**更新: 2026-05-13 (v0.1.44)**

---

## v0.1.44 での修正内容 (実機確認待ち)

### 問題M: UpdateBadgeが押せない / speech表示時の見切れ原因が未確定

**v0.1.43 実機確認結果:**
- 吹き出しはキャラ頭上付近に出るようになった
- idle表示、idleからdrag、ContextMenu、click-through、キャラ本体クリック / drag / voice long press は維持
- ただしクリック後発話、自発発話、吹き出し表示中dragでキャラ下半分が見切れる
- companion上のUpdateBadgeが押せなかった

**今回の判断:**
- speech表示時の見切れ原因はまだ断定しない
- window height増加や大きな暫定liftは入れず、実機で viewport / wrapper / speech / update badge の矩形を確認できるdebug modeを先に入れた

**v0.1.44 での修正:**
- 設定画面に「アップデート」タブを追加
  - 現在バージョン表示
  - 更新確認
  - 更新がある場合のインストール再起動
- `UPDATE_BADGE_VISIBLE` と `set_update_badge_visible` を追加し、UpdateBadge表示中だけRust hit testにbadge領域を追加
- `debugModeEnabled` を追加し、設定画面の「デバッグ」タブからON/OFF可能にした
- `DebugOverlay` を本番でも設定ON時だけ表示
  - viewport / client / visualViewport
  - character-stage / character-wrapper / speech-layer / update-badge / hit-target rect
  - wrapper/stage bottom が viewport を超えているか
  - updater state と last AI source
- ContextMenu / Active App / Ollama / hit area / drag / voice long press は大きく変更なし

**実機確認手順:**
1. 設定画面でデバッグモードをON/OFFできるか確認
2. ON時だけ本体windowに枠・座標情報が出るか確認
3. 設定画面から更新確認・インストールできるか確認
4. UpdateBadgeが表示された場合に押せるか確認
5. speech表示時の見切れで `wrapper` / `stage` が `OVER` になるか確認

---

## v0.1.43 での修正内容 (実機確認済み)

### 問題L: キャラは沈んでいないが、吹き出しがwindow上端に出すぎる

**v0.1.42 の状態:**
- drag時にキャラが沈む問題は改善
- 通常idleではキャラは切れていない
- 吹き出し表示時もキャラ位置自体は維持されている
- ただし吹き出しがwindow上部に出すぎて、キャラと大きく離れる

**原因:**
1. v0.1.42 でキャラは `character-stage` の absolute bottom anchor になった
2. しかし speech bubble / TinyWhisper は `top: 10` のwindow top anchorのままだった
3. expanded window内でキャラと吹き出しの基準点が分離し、吹き出しだけ上へ離れていた

**v0.1.43 での修正:**
- `src/constants/companionLayout.ts` に `SPEECH_BUBBLE_GAP = 8` / `SPEECH_BUBBLE_HIT_H = 96` を追加
- `src/App.tsx`:
  - speech layerを `top: 10` から `bottom: bottomPad + characterH + gap` へ変更
  - TinyWhisperも同じキャラ頭上基準へ移動
  - DEV debugに speech layer bbox を追加
- `src-tauri/src/lib.rs`:
  - `bubble_hit` をwindow上端基準から `char_top - gap` 基準へ変更
  - tail部分を含めてクリック可能にするため、bubble bottom側に小さな余白を許可
- v0.1.42 の root `100vw/100vh`、character bottom anchor、resize順序修正、drag reaction遅延は維持
- ContextMenu / Active App / hit area / Ollama は維持

**実機確認手順:**
1. 吹き出しがキャラの頭上付近に出るか確認
2. 吹き出しがwindow上端に離れすぎて出ないか確認
3. 吹き出し表示時にキャラが下に沈まないか確認
4. ドラッグ後の反応吹き出し位置が自然か確認

---

## v0.1.42 での修正内容 (実機確認待ち)

### 問題K: 通常表示は切れないが、吹き出し表示時にキャラが沈んで切れる

**v0.1.41 の状態:**
- 通常idle表示ではキャラ下端が切れない
- 再起動後の位置復元でも切れない
- ただし吹き出し表示時にキャラが下へ沈む
- drag中/drag後も、drag reaction の speech 表示により resize が走って見切れる可能性が高い
- ContextMenu と上部透明領域 click-through は維持されている

**原因:**
1. React root が `hasSpeech=true` になった瞬間に予測 `windowH` を使って flex-end 配置していた
2. Tauri window / WebView viewport の実resizeは `resize_companion` の後に反映されるため、React layout と実viewportが短時間ずれていた
3. Rust `resize_companion` は expanded への拡大時も `set_size → set_position` の順だったため、一瞬 window bottom が下方向へ伸びる可能性があった
4. drag開始時の `triggerDragReaction()` が speech を出し、OSネイティブdrag中に resize を発火していた可能性があった

**v0.1.42 での修正:**
- `src/App.tsx`:
  - rootを `width/height: windowW/windowH` から `100vw/100vh` へ変更
  - flex-end / column layout をやめ、`character-stage` を absolute bottom anchor に変更
  - `character-stage` は `bottom: bottomPad` で固定し、speech表示でもキャラvisual bottomを動かさない
  - drag reaction を drag終了後160msに遅延し、drag中の speech resize 競合を抑制
  - DEV限定で viewport / bbox debug log を追加
- `src-tauri/src/lib.rs`:
  - `resize_companion` の拡大時は `set_position → set_size`
  - 縮小時は `set_size → set_position`
  - debug build限定で resize 前後の outer/inner position/size と bottom anchor計算を記録
- v0.1.41 の Character実描画 sizeScale 同期は維持
- ContextMenu / hit test / Active App / Ollama / Transparency UI は大きく変更なし

**実機確認手順:**
1. 通常表示でキャラ下部が切れないか確認
2. 吹き出し表示時にキャラが下へ沈まないか確認
3. 吹き出しが消えてもキャラ位置が跳ねないか確認
4. drag中/drag後にキャラ下部が見切れないか確認
5. ContextMenu / 上部透明領域click-through / PNG透明余白 / Active App / Ollama が維持されているか確認

---

## v0.1.41 での修正内容 (実機確認待ち)

### 問題J: キャラ下端がまだめり込む / drag時に見切れる / speech表示時に沈む

**v0.1.40 の状態:**
- ContextMenu見切れ、Active App取得、Ollama品質、上部透明領域click-throughは改善済み
- ただしキャラ本体は通常表示・drag・speech表示でまだ下端が切れることがある

**原因:**
1. App 側の `character-stage` / `windowW` / `windowH` は `settings.sizeScale` に合わせて縮尺されていた
2. しかし `Character.tsx` の `character-wrapper` / sprite img / fallback は `DEFAULT_CHARACTER_CONFIG` の 160×160 固定で描画されていた
3. `sizeScale < 1` では stage/window より sprite 実描画が大きくなり、Tauri window 外へ出た下端が `overflow: hidden` で切れる
4. Rust hit test は `160×160 * sizeScale * DPI` 前提だったため、React実描画bboxと hit test bbox も不一致になっていた

**v0.1.41 での修正:**
- `src/constants/companionLayout.ts` に `CHARACTER_SPRITE_W/H = 160` を追加
- `src/App.tsx` で scaled `characterW/characterH` を `Character` に渡す
- `src/components/Character.tsx` で wrapper / img / fallback が渡された実描画サイズを使うよう修正
- `src/styles/index.css` で `character-wrapper` / `character-anim` の `transform-origin` を `center bottom` に固定
- drag保存座標、`resize_companion` bottom anchor、ContextMenu、Active App、Ollama、hit test設計は変更なし

**実機確認手順:**
1. 通常表示でキャラ下部が切れないか確認
2. drag中/drag後にキャラ下部が見切れないか確認
3. 吹き出し表示時もキャラが下へ沈まないか確認
4. 終了→再起動後の位置復元でも切れないか確認
5. ContextMenu / 上部透明領域click-through / PNG透明余白 / Active App / Ollama が維持されているか確認

---

## v0.1.40 での修正内容 (実機確認待ち)

### 問題H: キャラが下にめり込む / drag時に見切れる

**v0.1.39 の状態:**
- Active App取得、上部透明領域click-through、PNG透明余白クリック改善は成功
- ただしキャラ下部がまだ画面下へ沈む
- drag時にさらに見切れる

**原因:**
1. `settings.sizeScale` が React 側の `windowH` / sprite size にだけ反映され、Rust `resize_companion` の window bounds には反映されていなかった
2. 旧バージョンの小さい window height で保存された top-left をそのまま復元すると、v0.1.39 の大きい window では下端が work area 外へ出る
3. drag後の保存座標も top-left のままだったため、画面外に少し出した位置がそのまま保存される可能性があった

**v0.1.40 での修正:**
- compact window を 240px → 280px に拡張
- `src/constants/companionLayout.ts` で TS 側 layout 定数を一元化
- `resize_companion` に `sizeScale` を渡し、Rust側も同じ scale で width/height を設定
- `sizeScale` は `0.75〜1.5` に clamp
- `resize_companion` / restore / save_window_position で monitor work area 内に clamp
- drag終了時、windowが下へ出ていたら保存前に work area 内へ戻す

**実機確認手順:**
1. 通常表示でキャラ下部が切れないか確認
2. drag中/drag後にキャラ下部が見切れないか確認
3. 吹き出し表示時もキャラが沈まないか確認
4. 一度終了→再起動して、保存位置復元後も下端が切れないか確認

### 問題I: 右クリックメニューが下方向で見切れる

**v0.1.39 の状態:**
- `ContextMenu.tsx` が window height `300px` 前提で top を clamp していた
- 実際の compact window は 240px だったため、下部右クリック時に menu bottom が window 外へ出て `終了` が見切れた
- v0.1.39 の楕円 hit test では、メニュー項目が楕円外に出るとクリックが背面へ抜ける可能性もあった

**v0.1.40 での修正:**
- `ContextMenu` に実際の `windowWidth/windowHeight` を渡す
- menu bottom が window 内に収まるよう top を clamp
- 下部右クリック時は上方向へ開く
- `終了` を `アプリ終了` に変更
- ContextMenu表示中だけ Rust hit test を window 全体 interactive にする
- menu close 後は通常の「吹き出し + キャラ楕円」hit test に戻る

**実機確認手順:**
1. キャラ上部で右クリック → メニュー全体が見えるか
2. キャラ中央で右クリック → メニュー全体が見えるか
3. キャラ下部で右クリック → `アプリ終了` が見切れず押せるか
4. メニューを閉じた後、上部透明領域の背面クリックが維持されるか

---

## v0.1.39 での修正内容 (実機確認待ち)

### 問題E: キャラ下部がウィンドウ下端にめり込む/切れる

**v0.1.38 の状態:**
- 設定画面白画面と Ollama 返答品質は改善
- ただし companion compact window が 220px のままで、状態アニメーションや voice dot の余白を含めると下端に余裕が少ない
- ドラッグ時や吹き出し表示時にキャラ下部が沈んで見える

**v0.1.39 での修正:**
- 初期/compact window height を 240px に変更
- `App.tsx` と `resize_companion` の高さを 200×240 / 200×370 に統一
- 160px sprite + bottom padding 16px + 状態アニメーション余白を compact window 内に収める
- drag 終了時の保存座標は補正せず、`resize_companion` の bottom anchor 方式を維持

**実機確認手順:**
1. 通常表示でキャラ下部が切れないか確認
2. キャラをドラッグして、移動中/移動後に下端が切れないか確認
3. クリックして吹き出し表示中もキャラが下へ沈まないか確認

### 問題F: PNG透明余白が背面クリックを邪魔する

**v0.1.38 の状態:**
- 吹き出し非表示時の上部透明領域クリックは改善
- ただし PNG 画像矩形の透明部分はクリックを吸う

**v0.1.39 での修正:**
- PNG の透明余白は最大 7px 程度で、アセットトリミング効果は限定的と判断
- DOM 側で sprite 描画レイヤーと楕円 hit target を分離
- Windows hit test 側も「ウィンドウ全体」ではなく「吹き出し領域 + キャラ楕円」のみを interactive に変更

**限界:**
- 完全なピクセル単位透過ではない
- 必要なら将来 Rust 側で alpha mask / per-pixel hit test を実装する

**実機確認手順:**
1. キャラの透明余白付近をクリックし、以前より背面に通りやすいか確認
2. キャラ本体クリックが反応するか確認
3. drag と voice long press が楕円 hit target 内で動くか確認

### 問題G: Active App Raw Debug が `raw=N/A`

**v0.1.38 の状態:**
- 3秒後キャプチャでも全項目が X
- `hwnd X(raw=N/A)` で、Rust側で値がないのか TS側で受け取れていないのか不明

**v0.1.39 での修正:**
- Rust Serialize struct に `#[serde(rename_all = "camelCase")]` を追加
- TS 側も snake_case / camelCase 両対応で normalize
- `hwndRaw` 未受信と `GetForegroundWindow=0` を区別して表示
- raw JSON preview と console log を追加
- 3秒後キャプチャの説明を「対象ウィンドウをクリックしてアクティブ化」に変更

**実機確認手順:**
1. 設定 → 透明性タブを開く
2. 「3秒後にキャプチャ」を押す
3. 3秒以内に Chrome / VSCode / Bitwig 等をクリックして前面化する
4. raw JSON、`hwndRaw`、`pid`、`processName`、`errorStage` を確認
5. `hwndRaw: NULL(0)` なら GetForegroundWindow 自体が 0。`フィールド未受信` なら serde/型問題が残っている

**OS側API最小確認用 PowerShell:**

```powershell
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Fg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
"@
$hwnd = [Fg]::GetForegroundWindow()
$pid = 0
[Fg]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
"hwnd=$hwnd pid=$pid process=$((Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName)"
```

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
