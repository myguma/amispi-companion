# Field QA Notes

> v0.1.35 Field QA Fixes で修正を試みたが、実機では一部問題が残存。
> v0.1.36 Field QA Root Cause Fixes でさらに根本原因に対処した。
> v0.1.39 では v0.1.38 実機確認で残った character layout / hit area / foreground debug を hotfix。
> v0.1.40 では v0.1.39 実機確認で残った character clipping / ContextMenu clipping を hotfix。
> v0.1.41 では v0.1.40 実機確認で残った character rendering anchor / scale 不一致を hotfix。
> v0.1.42 では v0.1.41 実機確認で残った speech表示時の沈み込みを hotfix。
> v0.1.43 では v0.1.42 実機確認で残った speech bubble のwindow top寄りすぎを hotfix。
> v0.1.44 では設定画面更新導線、UpdateBadge hit test、ユーザーON/OFF可能なdebug modeを追加。
> v0.1.45 では v0.1.44 debug結果を受け、Character内部のimg/sprite/alpha bbox診断を追加。
> v0.1.46 では v0.1.45 debug結果を受け、sprite実表示をbackground surfaceへ切り替え。
> v0.1.47 では v0.1.46 debug結果を受け、speech表示/非表示でwindow heightを変えない常時expanded方式へ変更。
> v0.1.48 では v0.1.47 実機改悪を受け、常時expanded方式を撤回し、speech時もcompact 280px内に収める方式へ変更。
> v0.1.49 では v0.1.48 実機確認結果を反映し、First-run Onboardingを追加。
> v0.1.49 実機QAで First-run Onboarding、compact speech layout、主要操作の安定を確認。
> v0.1.50 ではローカル記憶の保存期間設定と起動時/手動cleanupを追加。
> v0.1.51 では DailySummary / RuleProvider 活用を強化し、ローカル記憶を短い文脈反応へ反映。
> v0.1.52 では Reaction Quality QA として固定文・fallback・QualityFilterを整理。
> v0.1.53 では Quiet / Focus / DND hardening として、自律発話抑制経路を整理。
> v0.1.54 では MemoryEvent JSON export と data control polish を追加。
> v0.1.55 では Release polish としてNode.js 24 opt-in、Update/Ollama失敗案内、Known Issuesを追加。
> v0.2.0 では daily-use beta としてv0.1.x安定化をdocs/checklistに整理。
> v0.2.1 では Emotion Sprite Set minimal として、emotion propとsafe fallbackを追加。
> v0.2.2 では Expressiveness QA として、operational emotionが描画stateを過剰に上書きしないよう調整。
> v0.2.3 では Whisper Push-to-Talk MVPの範囲・安全境界・QA項目をdocsで固定。
> v0.3.0 では Whisper Push-to-Talk MVPをRust commandへ接続。実機音声QAは未実施。
> v0.3.1 では Voice QA hardeningとして、Whisper未設定/録音失敗/STT失敗時の復帰案内を整理。
> v1.0.0-rc.1 では新機能追加なしでrelease candidate checklist / release notes draft / Known Issuesを整理。
> v1.0.0 ではstable tagとしてrelease notesを追加。v1.0.0自体のfield QAは未実施。
> v1.0.0後に v2 roadmap draft を追加。実装には未着手。
> v1.0.0 field QAでは基本操作が通過し、v1.0.1でUpdateBadge位置とWhisper WAV変換をhotfix。
> v1.0.1 field QAではFFmpeg/Whisperの実行エラーは解消したが、transcript確認とvoice返答品質が不足。v1.0.2でdebugとprompt/fallbackを修正。
> v1.0.2 field QAではWhisperが聞こえていることを確認。残問題はvoice long press後のclick誤発火とvoice返答品質。v1.0.3でpriority/suppress/noise rejectionを修正。
> v1.0.3 field QAでは、過去transcript由来の返答混入、設定値と動作の不一致、内部理由不可視が残った。v1.0.4でsession isolation / interaction trace / settings consistencyを追加。
> v1.5.1 では v1.6.0 Daily-use Betaへ進む前の1週間常駐QA gateと日次記録フォーマットを固定。実機QA自体は未実施。
> v1.5.2 では古いv0.2.0 daily-use beta checklistをv1.6.0向けrunbookへ刷新。実機QA自体は未実施。
> v1.5.3 では v1.6.0 field QA開始前のread-only preflight scriptを追加。実機QA自体は未実施。
> v1.5.4 では preflightのGitHub照会をretry/JSON確認へ変更。実機QA自体は未実施。
> 2026-05-15 に v1.6.0 Daily-use Beta field QA開始前preflightを実行し、failures 0 / warnings 0 を確認。7日間常駐QA自体は未実施。

**更新: 2026-05-15 (v1.6.0 field QA preflight)**

---

## v1.6.0 Daily-use Beta field QA

### Day 0 / Preflight

- 日付: 2026-05-15
- 実行時間: preflightのみ
- 起動経路: 未実施
- AI provider構成: 未実施
- 主要作業: `npm run qa:preflight` をnetwork access runで実行
- crash / freeze: 未実施
- updater / installer: GitHub Release上のinstaller / `.sig` / `latest.json` asset存在のみ確認。実インストール・更新経路は未実施
- memory export/import: 未実施
- observation / diagnostics: 未実施
- filename samples: 未実施
- 気になった発話: 未実施
- critical issue: preflight上はなし
- 次の対応: Day 1として2時間以上の起動・基本操作・Debug / Diagnostics visibilityを実機確認する

**preflight結果:**
- branch: `main`
- working tree: clean
- main / origin/main: match
- version files: `1.5.4` で一致
- latest tag: `v1.5.4`
- release workflow: `v1.5.4` success
- release assets: `amispi-companion_1.5.4_x64-setup.exe` / `.sig` / `latest.json`
- known issues: v1.5.4 field QA pending と 1-week residency QA pending を維持
- summary: failures 0 / warnings 0

**未通過のまま残す項目:**
- 7日間常駐QA
- installer / updater 実機経路
- OpenAIなし / OpenAIあり / Ollama fallback / RuleProvider fallback
- Memory v2 edit/delete/export/import
- Observation / Diagnostics visibility
- filename samples 明示ON/OFFと非保存/非送信境界
- UI comfort / speech quality / critical issueなし

### Day 1 readiness automated recheck

- 日付: 2026-05-15
- 実行内容: Day 1 実機QA前の作業台確認
- `npm run build`: passed
- `cargo build`: passed
- `cargo test`: passed (3 passed / 0 failed)
- `git diff --check`: clean
- working tree: clean
- main / origin/main: match
- `npm run qa:privacy`: failures 0 / warnings 4
  - warning: global shortcut reference exists for visible app toggle; verify it is not keylogging
  - warning: future screen/OCR setting flags exist; verify default OFF and no capture implementation
  - warning: OpenAI API key is still a settings/localStorage field; verify UI warning and future credential-store migration
  - warning: updater/autostart frontend permissions exist; verify UI-triggered behavior during field QA
- `bash -n scripts/daily-use-beta-field-status.sh`: passed
- `npm run qa:field-status`: correctly blocked release readiness while v1.6.0 version/tag / release docs / Release workflow/artifacts / Automated Checks / Day 1-7 / Product Gates / Privacy Boundary / Known Issues remain pending
- 注意: この確認はDay 1実機QAの代替ではない。Day 1は2時間以上の起動・基本操作・Debug / Diagnostics visibilityの実測記録が必要

### Day 1 / 起動・基本操作・Debug / Diagnostics visibility 記録欄

Day 1 は、この欄を埋めるまで passed 扱いにしない。
最低2時間、installed app または dev build を起動したまま通常操作する。

- 日付:
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- app version:
- OS / environment:
- AI provider構成:
- 起動結果:
- 2時間常駐結果:
- crash / freeze / 操作不能:
- companion表示 / click / drag / right click:
- settings open / close:
- Debugで確認できた項目:
  - current provider / model:
  - reactionIntent:
  - fallback reason:
  - suppression reason:
  - observation snapshot / current app:
  - memory / saved notes summary:
- Diagnosticsで確認できた項目:
  - observation enabled / disabled scope:
  - storage / non-storage boundary:
  - external AI send scope:
  - provider status:
  - fallback status:
- speech bubble / full text panel:
- provider/model badge表示条件:
- UpdateBadge / hit test:
- 気になった発話:
- privacy boundary issue:
- critical issue:
- evidence links / screenshots:
- Day 1判定: pending / passed / failed
- 次の対応:

---

## v1.5.4 での更新内容

### Daily-use Beta preflight robustness

**整理内容:**
- `npm run qa:preflight` のGitHub照会をretry付きにした
- Release workflow / release assets確認をJSONベースへ変更
- GitHub APIの一時的な接続揺れでpreflightが誤warningを出しにくいようにした

**field QA pending:**
- v1.6.0 QA開始前のpreflight再実行
- 7日間常駐QA、installer / updater実機確認、product gates、privacy boundary regression checks

---

## v1.5.3 での更新内容

### Daily-use Beta preflight script

**整理内容:**
- `scripts/daily-use-beta-preflight.sh` を追加
- `npm run qa:preflight` から実行できるようにした
- branch、working tree、version files、latest tag、Release workflow、release assets、known issuesをread-onlyで確認
- field QA通過判定は行わず、入口状態の確認だけに限定

**field QA pending:**
- `npm run qa:preflight` をv1.6.0 QA開始前に実行
- 7日間常駐QA、installer / updater実機確認、product gates、privacy boundary regression checks

---

## v1.5.2 での更新内容

### Daily-use Beta checklist refresh

**整理内容:**
- `docs/DAILY_USE_BETA_CHECKLIST.md` をv1.6.0 Daily-use Beta向けに更新
- preflight、automated checks、7日間常駐QA、product gates、privacy boundary regression checks、release criteriaを1つのrunbookへ整理
- updater / installer / OpenAI / Ollama / RuleProvider / Memory v2 / filename samples / Diagnosticsをv1.6.0入口条件として明記
- 実機QA未実施項目はpendingのまま維持

**field QA pending:**
- `docs/DAILY_USE_BETA_CHECKLIST.md` に沿った7日間常駐QA
- product gatesとprivacy boundary regression checksの実機確認
- v1.6.0 release前のinstaller / updater / latest.json / signature確認

---

## v1.5.1 での更新内容

### Daily-use Beta QA readiness prep

**整理内容:**
- v1.6.0 Daily-use Betaをこの場で完了扱いにしない
- 1週間常駐QA、updater、installer、OpenAIなし、Ollama fallback、RuleProvider fallback、Memory v2、Observation visibility、filename samples、Diagnostics / Debugを実機gateとして固定
- `docs/KNOWN_ISSUES.md` にv1.6.0へ進む前の通過条件と日次記録フォーマットを追加
- field QA未実施項目はpendingのまま維持

**field QA pending:**
- v1.6.0 Daily-use Beta判定用の7日間常駐記録
- installer / updater実機確認
- OpenAIなし・Ollama失敗・RuleProvider fallbackの日常利用確認
- Memory export/importとfilename samples非保存/非送信境界の再確認
- critical issueなしの確認

---

## v1.0.4 での更新内容

### Interaction coherence hotfix

**v1.0.3 field QAで確認できたこと:**
- Whisperは聞こえているが、前回transcript由来の返答が次のvoice入力へ混ざることがあった
- `画面見えてる？` に過去の「青いカエルと七三九」が再登場することがあった
- 自律移動OFFなのに移動するなど、設定と実動作の不一致があった
- なぜその発話になったかを追えなかった

**v1.0.4修正:**
- voice入力ごとに `voiceSessionId` を発行し、古いSTT/AI/fallback結果を破棄
- VoicePage / DebugPageにinteraction traceを追加
- `画面見えてる？` / `今何を見てる？` 系はローカル観測routerで先に処理
- `autonomousMovementEnabled` を `useWander` へ接続し、OFF時はtimer/animationを停止
- 自律発話はinterval preset中心へ移行し、旧max/hourは安全上限扱いへ弱めた
- VoicePageに一時テキスト送信欄を追加
- 自発発話時の短いcryを追加
- UpdateBadgeをキャラ足元中央寄りへ移動し、hit testを同期

**privacy:**
- transcript / text input / trace はMemoryEvent / localStorage / Memory exportへ保存しない
- 音声ファイル・変換WAV・Whisper transcript txtは一時ディレクトリごと削除する方針を維持

**field QA pending:**
- 連続voice入力で前回内容が混ざらないか
- 自律移動OFF / 自律発話OFF / 発話間隔presetが実動作へ反映されるか
- Interaction traceに入力・trigger・source・fallback reason・settings snapshotが出るか
- Text入力で観測質問に答えられるか

---

## v1.0.3 での更新内容

### Voice interaction priority and conversational response hotfix

**v1.0.2 field QAで確認できたこと:**
- VoicePage transcript previewによりWhisperが音声を聞き取っていることを確認
- 「青いカエルと七三九」などの内容が返答へ反映され始めた
- ただしvoice返答直後に通常click反応が入り、`character_clicked` とclick返答でvoice返答が上書きされることがあった
- `[BLANK_AUDIO]` が有効transcript扱いされ、「聞こえた」と返ることがあった

**v1.0.3修正:**
- voice recording開始から応答完了直後まで通常clickを抑制し、抑制clickはMemoryEventに記録しない
- `triggerSpeak` にsource/priority/lockを追加し、voice返答をclick/drag/autonomousより優先
- `[BLANK_AUDIO]` / `[NO_SPEECH]` / `[MUSIC]` / 記号のみ / ノイズを `no_speech` 扱いへ変更
- voice fallbackに観測質問向けの短い応答を追加
- 末尾「ん」や壊れた句読点をvoice post-process / QualityFilterで抑制

**privacy:**
- transcript previewは引き続き揮発状態のみ
- transcriptはMemoryEvent / localStorage / Memory exportに保存しない
- 音声ファイル・変換WAV・Whisper transcript txtは一時ディレクトリごと削除する方針を維持

**field QA pending:**
- voice返答直後にclick反応で上書きされないか
- Memory exportに不要な `character_clicked` が残らないか
- `[BLANK_AUDIO]` が「聞こえた」扱いされないか
- 「今何を見てる？」に観測範囲を短く答えるか

---

## v1.0.2 での更新内容

### Voice transcript debug and prompt repair

**v1.0.1 field QAで確認できたこと:**
- FFmpeg / Whisper CLIの起動エラーは解消
- voice long press後に返答が出る
- ただし「ここにいる」「うん、聞こえてる」系に寄りすぎ、transcriptが使われているか判別不能

**v1.0.2修正:**
- VoicePageに直近の音声認識結果を表示
- transcript preview / status / length / updatedAt を表示
- DebugMode ON時のみ MIME / extension / FFmpeg / Whisper / stderr / temp cleanup / AI source を詳細表示
- voice trigger時のPromptBuilderへ、音声内容に直接返答する追加ルールを挿入
- transcriptありAI失敗時はclick fallbackではなくvoice専用fallbackを使用
- QualityFilterで英字混入、`继续观察`、assistant的表現、voice generic返答を拒否

**privacy:**
- transcript previewはmodule-levelの揮発状態のみ
- transcriptはMemoryEvent / localStorage / Memory exportに保存しない
- 音声ファイル・変換WAV・transcript txtは一時ディレクトリごと削除する方針を維持

**field QA pending:**
- 「青いカエルと七三九」等でtranscript previewが見えるか
- 返答に音声内容が最低限反映されるか
- 中国語・英語混入が再発しないか

---

## v1.0.1 での更新内容

### Field QA hotfix

**v1.0.0 field QAで確認できたこと:**
- 起動、idle / speech / drag / speech中drag、右クリック、click-through、設定画面はOK
- Onboarding / Memory / Update / Debug / Transparency はOK
- Memory export UIはOK
- Ollama未起動でもアプリ全体は落ちない
- Whisper未設定時のvoice long pressは短い案内で復帰する
- whisper-cli関連DLLを同じフォルダへ置くことでDLL missing errorは解消

**残問題:**
- UpdateBadgeがspeech bubbleと被ることがあった
- whisper-cliは起動しているが、WebView録音形式を直接読めず transcript が空になっている可能性が高い

**v1.0.1修正:**
- UpdateBadgeをキャラ頭上から右下へ移動し、Rust hit testも同じ右下矩形へ同期
- `ffmpegExecutablePath` を追加し、WebView録音をFFmpegで16kHz mono PCM WAVへ変換してからWhisper CLIへ渡す
- 一時音声・変換WAV・transcriptは処理後に一時ディレクトリごと削除
- compact `200x280` / click-through / ContextMenu / character layout は維持

**field QA pending:**
- FFmpeg path設定後にvoice long pressで実STTが成功するか
- FFmpeg/Whisper失敗時の短い案内
- UpdateBadge右下配置がspeech bubbleと重ならずクリックできるか

---

## v1.0.0 での更新内容

### Stable

**整理内容:**
- 新機能追加なし
- v1.0.0 stable release notesを追加
- v1.0.0自体のfield QA未実施を明記
- v1.0.1+ hotfix policyを記録

**field QA pending:**
- v1.0.0自体の実機QA
- 長時間常駐
- 実インストール環境のupdate
- Whisper binary/model/path/MIME type/マイク権限/一時ファイル削除
- Memory export file save

**post-v1 docs:**
- `docs/V2_ROADMAP_DRAFT.md` を追加
- v2でもcloud AI / cloud STT / always-on mic / screen capture / auto file operations等は非目標として維持

---

## v1.0.0-rc.1 での更新内容

### Release Candidate

**整理内容:**
- 新機能追加なし
- v0.3.1時点の機能をrelease candidateとして区切り
- v1.0.0-rc.1 checklist / release notes draftを追加
- Known Issuesに実機依存リスクを残した

**field QA pending:**
- v1.0.0-rc.1自体の実機QA
- 長時間常駐
- 実インストール環境のupdate
- Whisper binary/model/path/MIME type/マイク権限/一時ファイル削除
- Ollama未起動 / model missing案内

---

## v0.3.1 での更新内容

### Voice QA Hardening

**実装内容:**
- 録音失敗時に `voiceError` へ入り、短い固定文で状況を返す
- Whisper未設定 / timeout / no speech / その他STT失敗時に、transcriptなしでAI応答へ進まないよう整理
- 失敗後は `voiceReady` / `voiceOff` へ戻り、アプリ全体は止めない
- VoicePageにWhisper CLI実行方式、一時音声ファイル、録音形式互換性の注意を追加

**field QA pending:**
- マイク権限拒否 / 録音失敗時の短い案内表示
- Whisper binary/model未設定時の案内表示
- Whisper CLIがWebView録音形式を読めるか
- timeout / no speech時の復帰
- 一時音声ファイルが残らないか

---

## v0.3.0 での更新内容

### Whisper Push-to-Talk MVP

**実装内容:**
- `transcribe_with_whisper` Tauri commandを追加
- WebView録音BlobをbytesとしてRustへ渡す
- Rust側で一時音声ファイルを作成し、Whisper CLIをshellなしで起動
- timeout時はprocess killを試みる
- 成功/失敗に関係なく一時ディレクトリ削除を試みる
- transcriptだけを既存voice response経路へ戻す

**field QA pending:**
- Windows実機でMediaRecorder MIME typeをWhisper CLIが読めるか
- whisper.cpp binaryの引数差
- マイク許可拒否 / 録音失敗 / timeout時の復帰
- 一時音声ファイルが残らないか
- long press / drag / click干渉

---

## v0.2.3 での更新内容

### Voice Implementation Plan

**整理内容:**
- Push-to-Talkのみを維持
- 常時マイク監視 / wake word / クラウドSTT / 音声保存は非目標として再確認
- v0.3.0 Whisper Push-to-Talk MVPの実装範囲を固定
- STT失敗時UIとfield QA pending項目を整理

**field QA pending:**
- Whisper binary / model path未設定時の復帰
- マイク許可拒否 / 録音失敗 / timeout時の復帰
- 一時音声ファイルが残らないこと
- long press UXとdrag/clickの干渉

---

## v0.2.2 での更新内容

### Expressiveness QA

**調整内容:**
- `happy` / `shy` / `concerned` だけを追加表情sprite候補として扱う
- `aware` / `idle` / `speaking` は描画stateを上書きしない
- drag中は従来通り `touched` stateを優先
- DebugOverlayに `vis=` を追加し、実際のvisual override有無を確認できるようにした

**field QA pending:**
- speech中 / click中 / drag中に表情切替が過剰でないか
- `emo=` と `vis=` の表示が想定通りか
- compact 200x280 character layout / click-through / hit test の回帰

---

## v0.2.1 での更新内容

### Minimal Emotion Sprite Set

**追加内容:**
- `happy` emotionを追加
- `Character` に `emotion` propを追加
- `emotion.png` が存在しない場合も既存spriteへfallback
- AI/RuleProvider output の emotion を最小限Characterへ反映
- DebugOverlayに `emo=` を追加

**field QA pending:**
- emotion専用画像なしでもspriteが消えないか
- speaking / touched / drag中の表示が崩れないか
- compact 200x280 character layout / click-through / hit test の回帰

---

## v0.2.0 での更新内容

### Daily-use Beta

**整理内容:**
- v0.1.xの安定化を daily-use beta として区切り
- docs/DAILY_USE_BETA_CHECKLIST.md を追加
- docs/KNOWN_ISSUES.md と合わせて field QA pending を明確化
- compact 200x280 fixed window と speech時window resize不採用を継続制約として記録

**field QA pending:**
- v0.2.0自体の実機QA
- 30分以上の常駐
- v0.1.51以降の文脈反応 / reaction quality / quiet-focus-DND / memory export
- 実インストール環境でのupdater

---

## v0.1.55 での更新内容

### Release Polish

**追加内容:**
- Release workflowに `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` を追加
- UpdatePageの失敗時案内を改善
- Ollama接続失敗時の案内を改善
- docs/KNOWN_ISSUES.md を追加

**field QA pending:**
- v0.1.55 Release workflowでNode.js 20 deprecation annotationが消えるか
- 設定画面からの更新確認/インストール失敗時表示
- Ollama未起動 / model missing時の案内表示
- compact 200x280 character layout / click-through / Update / Debug / Transparency の回帰

---

## v0.1.54 での更新内容

### Memory Export / Data Control Polish

**追加内容:**
- MemoryPageに「エクスポート」セクションを追加
- JSON export前に件数・期間・タイプ別件数を表示
- export JSONに `schemaVersion` / `appVersion` / `exportedAt` / `retentionDays` / `eventCount` / `eventTypes` / `range` / `events` を含める
- docs/MEMORY_AND_DATA_CONTROL.md に export仕様を追記

**field QA pending:**
- 空イベントでもJSON exportできるか
- MemoryEventありでJSON export内容が正しいか
- 保存期間cleanup / 発話ログのみ削除 / 全削除後のexport対象が期待通りか
- MemoryPage / compact 200x280 character layout / click-through / Update / Debug / Transparency の回帰

---

## v0.1.53 での更新内容

### Quiet / Focus / DND Hardening

**修正内容:**
- quietMode中は手動以外の idle / observation 発話を抑制
- focusMode中は集中を切りそうな idle / observation 発話と `avoidDuringFocus` reaction を抑制
- doNotDisturb中のクリック / voice はOllama呼び出しを避け、短い固定反応へ寄せた
- idle自律発話で SpeechPolicy deny 後に fallback が喋る経路を修正
- Settings / Onboarding の説明を実挙動に合わせた

**field QA pending:**
- quietModeで自律発話と観測反応が止まるか
- focusModeで発話頻度が下がるか
- DND中にクリック / voice long press 以外で喋らないか
- compact 200x280 character layout / click-through / Update / Debug / Transparency の回帰

---

## v0.1.52 での更新内容

### Reaction Quality QA

**修正内容:**
- RuleProvider固定文を短く整理
- 「今日」系の記憶文脈候補を出しすぎないように調整
- dialogue fallbackに直近4件の重複回避を追加
- QualityFilterで命令・助言・測定表示っぽいOllama出力を軽く拒否
- RESPONSE_QUALITY_GUIDE.mdを更新

**self-reviewで直した点:**
- 「急がなくてよさそう」など助言寄りの固定文を削除
- 「今日は何度か無明に触れた」を「何度か呼ばれている」に変更
- 固定文の複数文を減らした

**field QA pending:**
- クリック反応 / 自律発話 / fallback / Ollama応答の自然さ
- QualityFilterが強すぎないか
- 主要UIとcompact 200x280 character layoutの回帰

---

## v0.1.51 での更新内容

### DailySummary / RuleProvider 活用強化

**追加内容:**
- `todaySpeechCount` を MemorySummary に追加
- RuleProvider の手動反応で今日のクリック回数 / 起動回数を短く反映
- 今日すでに発話が多い場合、idle / observation の自律反応を控える
- 直近発話と同じ固定文を避ける候補選択に調整
- observation / idle の固定文から説明・助言っぽさを減らした

**発話方針:**
- 「今日は、よく呼ばれるね」程度の軽い文脈に留める
- 作業時間の細かい指摘、診断、休憩指示はしない
- retentionで古いイベントが消えていても壊れない

**field QA pending:**
- 文脈反応が監視感・管理感を出していないか
- 自律発話が控えめになっているか
- 同じ固定文が続きにくいか
- Ollama / fallback / MemoryPage / Onboarding / Update / Debug / Transparency の回帰

---

## v0.1.50 での更新内容

### Memory Retention Policy

**追加内容:**
- `memoryRetentionDays` 設定を追加
- デフォルトは30日
- 選択肢は 7日 / 30日 / 90日 / 無期限
- 起動時に古い MemoryEvent を1回自動整理
- MemoryPageから削除対象件数を確認し、「今すぐ整理」で手動cleanup可能
- DailySummary は保存済み MemoryEvent から再計算される

**方針:**
- retention対象は MemoryEvent 全タイプ
- localStorage保存のみで、外部送信なし
- 生音声、スクリーンショット、OCR等は保存しない方針を維持
- 500件の件数上限は維持

**維持したもの:**
- v0.1.48 compact `200x280` speech layout
- v0.1.49 First-run Onboarding
- click-through / 右クリック / voice long press / Active App / Ollama / Update
- Whisper実接続 / Screen Capture / TTS はまだ実施しない

---

## v0.1.49 での更新内容

### v0.1.49 実機QA結果 (通過)

**確認結果:**
- 初回起動 / 設定画面から Onboarding を開ける
- Onboarding 完了後に再表示されない
- 設定画面の「はじめに」から Onboarding を再表示できる
- Ollama / 自律発話 / privacy 説明は問題なし
- 既存設定は壊れていない
- idle / speech / drag / speech中drag でキャラ表示は正常
- click-through / 右クリック / voice long press / Active App / Update も問題なし

**判断:**
- v0.1.49 は実機QA通過
- First-run Onboarding は完了扱い
- compact `200x280` speech layout は引き続き安定
- Memory Retention Policy は v0.1.50 で対応。次候補は Emotion Sprite Set / RuleProvider daily summary活用強化
- Whisper実接続 / Screen Capture / TTS はまだ実施しない

### v0.1.48 実機確認結果を採用

**確認結果:**
- idle / speech / drag / speech中drag のすべてでキャラ下半分が消えない
- debug overlay上でも wh/client/vh は `200x280` 固定
- stage / wrapper / surface / img / alpha は viewport 内
- 吹き出しは compact window 内に収まる
- 右クリックメニュー、click-through、drag、voice long press も問題なし

**確定事項:**
- v0.1.48 の compact speech layout を採用
- 410px expanded window案は不採用
- dynamic resize `280→410` は不採用
- always expanded `410px` は不採用
- v0.1.48以降、companion window は compact `200x280` 固定を設計制約として扱う
- transparent WebView / layered window では 410px window 下部領域でsprite描画が壊れる実機結果があるため、今後この方向へ戻さない

**v0.1.49 で追加:**
- First-run Onboarding
- `onboardingCompleted` / `onboardingVersion`
- 設定画面の「はじめに」タブ

---

## v0.1.48 での修正内容 (実機確認済み・採用)

### 問題Q: 常時expanded 410px windowで全状態のsprite下半分が消える

**v0.1.47 実機確認結果:**
- idle / speech / drag / speech中drag の全状態でキャラ下半分が消えた
- debug上は wh/client/vh が `200x410` で、stage / wrapper / surface / img / alpha は viewport 内
- `OVER` は出ていない
- DebugOverlayとContextMenuの重なり修正は有効

**判断:**
- v0.1.47 の always expanded window 化は失敗
- dynamic resizeだけでなく、410px高の transparent companion window 下部にspriteを置く設計自体が危険
- v0.1.46相当の「idleが正常なcompact構成」を優先する

**v0.1.48 での修正:**
- companion window heightを常時 compact `280px` に戻した
- speech表示時もwindowを `410px` へ広げない
- dynamic resize `280→410` もしない
- `SPEECH_VISIBLE` は維持し、hit testはwindow height推測ではなく明示状態を参照
- speech bubbleはcompact window内のキャラ頭上基準で表示し、長文は最大3行で省略
- v0.1.47のDebugOverlay/ContextMenu重なり修正は維持

**実機確認手順:**
1. idle / speech とも wh/client/vh が `200x280` になるか確認
2. idle / speech / drag / speech中dragでキャラ下半分が消えないか確認
3. compact内で吹き出しが省略表示されるか確認
4. 右クリックメニュー、click-through、voice long press、Ollama、Active Appが壊れていないか確認

---

## v0.1.47 での修正内容 (実機確認で失敗)

### 問題P: expanded透明WebViewで旧compact height付近の内部clipが疑わしい

**v0.1.46 実機debug結果:**
- `renderMode=background` でも speech表示時のキャラ下半分消失は残った
- expanded `200x410` で `stage` / `wrapper` / `surface` / `img` / `alphaRect` はすべて viewport 内
- `OVER` は出ていない
- `speaking.png` 固有でも `<img>` 固有でも background surface 固有でもなさそう
- 視覚的に消える境界が旧compact height `280px` 付近に見える

**今回の判断:**
- window height不足、work area clamp、sprite alpha bbox、img rect外はみ出しは本命ではない
- speech表示時に `280 → 410` へdynamic resizeすること自体が、transparent WebView / GPU compositor の内部clipを誘発している可能性が高い

**v0.1.47 での修正:**
- companion windowを常時expanded height (`280 + 130 = 410`) に変更
- speech表示/非表示ではwindow heightを変えない
- `resize_companion` は sizeScale と bounds同期を担当し、speechVisibleはhit test状態として保存
- `SPEECH_VISIBLE` を追加し、hit testはwindow height推測ではなく明示状態を参照
- speech=false時はbubble hitを無効化し、上部透明領域click-throughを維持
- ContextMenu表示中はDebugOverlayを一時停止し、右クリックメニューがdebug文字列に隠れないようにした

**実機確認手順:**
1. idle時にキャラが正常表示されるか確認
2. speech表示時にキャラ下半分が消えないか確認
3. speech中dragでも消えないか確認
4. debug overlayで idle / speech とも wh/client/vh が `200x410` になるか確認
5. speech=false時の上部透明領域click-throughが維持されているか確認
6. 右クリックメニューがdebug overlayに隠れないか確認

---

## v0.1.46 での修正内容 (実機確認待ち)

### 問題O: expanded transparent WebViewでsprite下半分が視覚的に消える

**v0.1.45 実機debug結果:**
- speech表示時も `stage` / `wrapper` / `img` / `alpha` は viewport 内
- `OVER` は出ていない
- 発話中dragでは `effectiveState=touched` / `sprite=touched.png` でも同様に消える
- compact `200x280` では speech=true でも見切れない
- したがって `speaking.png` 固有、`char-speak` 固有、window / viewport / clamp が直接原因ではなさそう

**v0.1.46 での修正:**
- sprite実表示を `<img>` から `background-image` surface に変更
- `<img>` は preload / fallback / natural size / alpha bbox debug 用に保持
- surfaceに `translateZ(0)` / `backfaceVisibility` / `willChange` を付け、透明WebViewのexpanded resize後も独立した描画面として再合成されやすくした
- debug overlayに `renderMode=background` と `surface` rectを追加

**実機確認手順:**
1. speech表示時にキャラ下半分が消えないか確認
2. speech中dragでも消えないか確認
3. `renderMode=background` が出ているか確認
4. `speaking.png` / `touched.png` の両方で問題ないか確認
5. 吹き出し位置・drag・右クリック・click-through・設定アップデートが壊れていないか確認

---

## v0.1.45 での追加診断 (実機確認待ち)

### 問題N: stage / wrapperはviewport内だが、speech表示時に見た目だけ下半分が消える

**v0.1.44 実機debug結果:**
- idle時: viewport `200x280`、stage/wrapper bottom `256`、下余白約24px
- speech時: viewport `200x410`、stage/wrapper bottom `386`、下余白約24px
- speech中drag時も stage/wrapper bottom `386` で viewport内
- したがって、現時点では window / viewport / work area clamp が直接原因ではなさそう

**次の調査対象:**
- Character内部の `<img>`
- current sprite URL
- `effectiveState`
- naturalWidth / naturalHeight
- PNG alpha bbox
- CSS animation / transform / transform-origin
- object-fit / object-position
- 透明WebView上の描画/合成

**v0.1.45 での追加:**
- `Character.tsx`: sprite img に `character-sprite-img` と `data-sprite-url` を追加
- `DebugOverlay.tsx`:
  - `effectiveState`
  - current sprite URL
  - img rect
  - img natural size / complete
  - animationName / animationDuration
  - transform / transformOrigin
  - objectFit / objectPosition
  - canvas alpha bbox と画面上alpha rect
  - img / alpha の `OVER` 表示

**注意:**
- v0.1.45 は診断版で、見た目修正完了版ではない
- window height増加やspeech liftは入れていない

**実機確認手順:**
1. デバッグモードONでspeech表示する
2. spriteが本当に `speaking.png` か確認
3. `nat=160x160` か確認
4. img rect bottomがviewport内か確認
5. alpha rect bottomがviewport内か確認
6. `anim=char-speak` の時だけ見切れるか確認
7. alpha bboxが画像端まで詰まっているか確認
8. 見切れている状態のスクショを残す

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
