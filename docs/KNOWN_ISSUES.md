# Known Issues — AmitySpirit Companion

**最終更新: 2026-05-15 (v1.5.1)**

このファイルは、daily-use beta に向けて残っている実機依存・環境依存の注意点を隠さず管理するためのもの。

## Field QA pending

| 項目 | 状態 | 備考 |
|---|---|---|
| 長時間常駐 | pending | v0.1.48以降のcompact 200x280 layoutは実機で安定確認済みだが、長時間連続起動は追加確認が必要 |
| updater実機更新 | pending | 設定画面アップデート導線とRelease workflowは確認済み。実インストール環境の更新経路は継続QA |
| Ollama未起動 / model missing | pending | UI案内は追加済み。環境別のエラー文言は継続QA |
| Voice / Whisper | pending | v1.0.4でsession isolation、interaction trace、voice/text観測質問routerを追加。会話品質はfield QA pending |
| Windows transparent WebView | watch | 410px expanded windowは不採用。compact 200x280 fixedを設計制約として維持 |
| v0.2.0 daily-use beta | pending | automated checksでのbeta区切り。v0.2.0自体のfield QAは未実施 |
| v1.0.0-rc.1 release candidate | pending | 新機能追加なしのRC。field QAは未実施 |
| v1.0.0 stable | passed | 起動、compact character layout、settings、memory、update、debug、transparency、right click、click-throughはfield QA通過 |
| v1.0.1 hotfix | pending | UpdateBadge右下配置とFFmpeg変換はfield QA pending |
| v1.0.2 hotfix | passed | transcript previewによりWhisperが聞こえていることを確認。残問題はv1.0.3でhotfix |
| v1.0.3 hotfix | pending | voice返答上書き防止、`[BLANK_AUDIO]` rejection、観測質問応答、末尾「ん」抑制は継続QA |
| v1.0.4 hotfix | pending | session isolation、settings consistency、Interaction trace、text input、UpdateBadge足元配置はfield QA pending |
| v1.0.5 hotfix | pending | prompt汚染修正、hearing_test local router、autonomous speech pacing、safetyCapはfield QA pending |
| v1.0.6 | pending | Whisper言語指定(-l ja)、sleep発話、filename-derived signalsはfield QA pending |
| v1.0.7 | pending | Observation Timeline、Observation Center、observationLevelはfield QA pending |
| v1.0.8 | pending | Memory Mode、長期記憶候補、記録層の明示化はfield QA pending |
| v1.1.0 | pending | ObservationSignal層、Watchful Mode、診断ページはfield QA pending |
| v1.1.1 | pending | Watchful preset同期・sleep発話修正・Timeline同期・note一覧/削除・filename UI修正はfield QA pending |
| v1.1.2 | pending | 発話バリエーション・unknown category発話・AppCategory強化・PromptBuilder ObservationSignals・OpenAI provider骨格はfield QA pending |
| v1.1.3 | pending | AI runtime trace・OpenAI test・provider/model badge・長文speech bubbleはfield QA pending |
| v1.1.4 | pending | OpenAI 429分類・fallback表示明確化・speech bubble全文パネルはfield QA pending |
| v1.2.0 | pending | ReactionIntent trace、低品質fallback削減、30分常駐時の重複抑制はfield QA pending |
| v1.3.0 | pending | App Classification拡張、classification reason、custom classification UIはfield QA pending |
| v1.4.0 | pending | Memory v2編集・固定・カテゴリ・prompt投入・保存メモimportはfield QA pending |
| v1.5.0 | pending | Optional Filename Samplesの明示ON/OFF・揮発表示・非保存・非送信境界はfield QA pending |
| v1.5.1 | pending | Daily-use Beta QA readiness prep。1週間常駐QAは未実施で、v1.6.0判定前に実機記録が必要 |

## v1.5.1 Daily-use Beta Readiness Gate

v1.6.0 Daily-use Betaへ進む前に、以下を実機で確認する。
この表は実施計画であり、現時点では通過扱いにしない。

| Gate | 状態 | 通過条件 |
|---|---|---|
| 1週間常駐 | pending | 7日間、起動・sleep復帰・通常作業中にcrashや操作不能がない |
| updater実機更新 | pending | 既存インストールから最新版へ更新でき、`latest.json` とinstaller署名の取得に失敗しない |
| installer再実行 | pending | NSIS installerで上書きインストールでき、設定・memoryが消えない |
| OpenAIなし | pending | API key未設定またはquota不足でもOllama/RuleProvider fallbackで破綻しない |
| Ollama fallback | pending | Ollama未起動・model missing・timeout時に原因とfallback先がDiagnosticsで見える |
| RuleProvider fallback | pending | 外部AIなしでも短く自然な発話になり、provider/sourceを追える |
| Memory v2 | pending | 保存メモの一覧・編集・削除・export/importが期待通りで、未承認transcript等を保存しない |
| Observation visibility | pending | 何を見ている/見ていない/保存している/保存していないかがUIで確認できる |
| Filename samples | pending | 明示ON時だけ揮発表示され、Memory export / Timeline / OpenAI payloadへraw filenameが入らない |
| Diagnostics / Debug | pending | provider/model/intent/fallback/suppression reasonが主要発話経路で追跡できる |
| UI comfort | pending | 変な監視アプリに見えず、speech bubbleや全文パネルが日常利用で邪魔になりすぎない |
| Critical issueなし | pending | crash、不可視の外部送信、データ消失、更新不能、監視境界の誤表示がない |

### 1週間常駐QA 日次記録フォーマット

各日、`docs/FIELD_QA_NOTES.md` に以下の形で追記する。

```md
### v1.6.0 Daily-use QA Day N

- 日付:
- 実行時間:
- 起動経路: installer / updater / dev build
- AI provider構成: OpenAI / Ollama / RuleProvider
- 主要作業:
- crash / freeze:
- updater / installer:
- memory export/import:
- observation / diagnostics:
- filename samples:
- 気になった発話:
- critical issue:
- 次の対応:
```

## v1.5.0 Field QA Watch Points

- Watchful Mode / Balanced へ切り替えても filename samples が自動ONにならないか
- ObservationPageで明示ONにした時だけDesktop/Downloadsのfilename samplesが表示されるか
- 最大件数が1〜10件に制限されるか
- Debug / Diagnostics / Transparencyでfilename samples visible countと非送信境界が見えるか
- Memory export / Observation Timeline / `speech_shown` metadataにraw filename sampleが入らないか
- OpenAI payload previewで `rawFilenamesSent=false` が維持されるか

## v1.4.0 Field QA Watch Points

- 保存メモを追加・編集・削除できるか
- category / 固定 / 発話に使う の設定が保存後も維持されるか
- Debug / Diagnosticsでprompt投入対象メモが確認できるか
- OpenAIの「保存メモを送る」OFF時にOpenAI payload previewのmemoryNotesSentが0件になるか
- Memory export JSONから保存メモだけをimportし、発話ログ・観測ログを取り込まないか
- transcript / text input / raw filename が長期記憶メモに自動保存されていないか

## v1.3.0 Field QA Watch Points

- Windows実機で foreground process の `classificationReason` / `classificationSource` が Debug / Diagnostics に表示されるか
- unknown app が process名付きで見え、分類未登録であることが分かるか
- custom classification が process名 + category だけを保存し、raw window title / filename / file content を保存しないか
- custom classification の保存・削除後に companion window 側の snapshot へ反映されるか
- AI系アプリ分類 (`ai_chat` / `ai_assistant` / `ai_search`) が発話やDebugで不自然に扱われないか

## v1.2.0 Field QA Watch Points

- Debug / Diagnostics に reactionIntent が表示されないケースがないか
- `speech_shown` export で `reactionIntent` が欠落する発話経路がないか
- OpenAI / Ollama failure 後の RuleProvider fallback でも intent / provider / model / fallback reason を追えるか
- `静かだね` / `作業中？` / `ここにいる` / `呼んだ？` / `ん` / `...` が短時間で出ないか
- intent によって発話が不自然に固定化されないか

## OpenAI / ChatGPT Auth Boundary

- ChatGPT Web/Desktop のログインセッション流用は実装しない。
- OpenAI API は ChatGPT subscription とは別管理。ChatGPT Plus/Pro 契約だけでは API 利用枠にはならない。
- このアプリは OpenAI API key 方式のみ対応する。
- API 429 が出た場合は OpenAI API 側の billing / quota / rate limit / model access を確認する。
- ChatGPT auth / unofficial cookie auth / browser session scraping は、安全性・安定性・保守性のため非目標。
- API key全文を表示・ログ保存しない。raw filename / raw window title / transcript履歴 / file content はOpenAIへ送信しない。

## Non-goals

- ChatGPT Web/Desktop login session auth / unofficial cookie auth
- クラウドSTT
- 常時マイク監視 / wake word
- Screen Capture / OCR
- 自動ファイル操作 / コマンド実行
- Web検索 / 外部API連携
- 長期RAG / ベクトルDB

## Design Notes (v1.0.6+)

- STT言語（whisperLanguage）とAI返答言語は別概念。返答言語は日本語固定。
- filename-derived signalsはローカル内部でファイル名を見るが、raw filenameは返さず・保存せず。
- sleep発話はsleep状態中のみ。quiet/DND/autonomousSpeechEnabled=falseで停止。

## Current Safe Baseline

- `v0.1.48`: compact 200x280 speech layoutでキャラ描画問題を実用上解決
- `v0.1.49`: First-run Onboarding 実機QA通過
- `v0.1.50`: Memory Retention Policy 実機QA通過
- `v0.1.51`以降: 文脈反応・発話品質・発話抑制・memory exportは automated checks passed / field QA pending
- `v0.3.1`: Whisper Push-to-Talk failure recoveryは automated checks passed / field QA pending
- `v1.0.0-rc.1`: release candidate docs整理。field QA pendingを隠さない
- `v1.0.0`: stable tag。automated checks必須、field QA not performedを明記
