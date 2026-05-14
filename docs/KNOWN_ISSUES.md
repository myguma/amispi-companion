# Known Issues — AmitySpirit Companion

**最終更新: 2026-05-15 (v1.3.0)**

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
